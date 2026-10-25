import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function safeEqualHex(expected: string, actual: string) {
  if (!/^[a-f0-9]+$/i.test(actual) || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

function verifySignature(rawBody: string, headers: Headers, secret: string) {
  const v2 = headers.get("x-bachs-signature-v2");
  const legacySignature = headers.get("x-bachs-signature");
  const legacyTimestamp = headers.get("x-bachs-timestamp");
  let timestamp: number | null = null;
  let signatures: string[] = [];
  if (v2) {
    const parts = v2.split(",").map((part) => part.trim());
    const timestampPart = parts.find((part) => part.startsWith("t="));
    timestamp = timestampPart ? Number(timestampPart.slice(2)) : null;
    signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  } else if (legacySignature && legacyTimestamp) {
    timestamp = Number(legacyTimestamp);
    signatures = [legacySignature];
  }
  if (!timestamp || !Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || signatures.length === 0) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  return signatures.some((signature) => safeEqualHex(expected, signature));
}

type BachsEvent = {
  id?: string;
  type?: string;
  created_at?: string;
  data?: { checkout_id?: string; charge_id?: string; amount?: string | number; currency?: string; status?: string };
};

export async function POST(request: Request) {
  const secret = process.env.BACHS_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !supabaseUrl || !serviceKey) {
    console.error("Bachs webhook configuration is missing.");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers, secret)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });

  let event: BachsEvent;
  try { event = JSON.parse(rawBody) as BachsEvent; }
  catch { return NextResponse.json({ error: "Invalid event payload." }, { status: 400 }); }
  if (!event.id || !event.type || !event.data) return NextResponse.json({ error: "Invalid event envelope." }, { status: 400 });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: priorEvent, error: priorError } = await supabase.from("webhook_events")
    .select("id, processed_at").eq("provider", "bachs").eq("provider_event_id", event.id).maybeSingle();
  if (priorError) {
    console.error("Could not check webhook idempotency:", priorError.message);
    return NextResponse.json({ error: "Temporary webhook processing error." }, { status: 500 });
  }
  if (priorEvent?.processed_at) return NextResponse.json({ received: true, duplicate: true });

  if (!priorEvent) {
    const { error: insertError } = await supabase.from("webhook_events").insert({
      provider: "bachs", provider_event_id: event.id, event_type: event.type, payload: event,
    });
    if (insertError && insertError.code !== "23505") {
      console.error("Could not store webhook event:", insertError.message);
      return NextResponse.json({ error: "Temporary webhook processing error." }, { status: 500 });
    }
  }

  // Only collection.succeeded confirms a paid collection. checkout.completed alone is not enough.
  if (event.type === "collection.succeeded") {
    const checkoutId = event.data.checkout_id;
    const amount = Number(event.data.amount);
    const currency = event.data.currency?.toUpperCase();
    if (!checkoutId || !Number.isFinite(amount) || !currency) {
      return NextResponse.json({ error: "Payment event is missing required fields." }, { status: 400 });
    }
    const { data: order, error: orderError } = await supabase.from("orders")
      .select("id, total_cents, currency, status").eq("bachs_checkout_id", checkoutId).maybeSingle();
    if (orderError) {
      console.error("Could not find order for payment:", orderError.message);
      return NextResponse.json({ error: "Temporary webhook processing error." }, { status: 500 });
    }
    if (!order) {
      console.error("Verified Bachs payment did not match a local order:", checkoutId);
      return NextResponse.json({ error: "Order not found for checkout." }, { status: 500 });
    }
    const paidCents = Math.round(amount * 100);
    if (currency !== order.currency || paidCents !== order.total_cents) {
      console.error("Bachs payment amount/currency mismatch for order:", order.id);
      // Record the signed event but do not mark an amount-mismatched order paid.
      await supabase.from("webhook_events").update({ processed_at: new Date().toISOString() })
        .eq("provider", "bachs").eq("provider_event_id", event.id);
      return NextResponse.json({ received: true, reviewRequired: true });
    }
    if (order.status === "pending_payment") {
      const { error: updateError } = await supabase.from("orders").update({
        status: "fulfillment_pending",
        bachs_charge_id: event.data.charge_id ?? null,
        paid_at: event.created_at ? new Date(event.created_at).toISOString() : new Date().toISOString(),
      }).eq("id", order.id).eq("status", "pending_payment");
      if (updateError) {
        console.error("Could not mark order paid:", updateError.message);
        return NextResponse.json({ error: "Temporary webhook processing error." }, { status: 500 });
      }
    }
  }

  const { error: processedError } = await supabase.from("webhook_events").update({ processed_at: new Date().toISOString() })
    .eq("provider", "bachs").eq("provider_event_id", event.id);
  if (processedError) {
    console.error("Could not mark webhook processed:", processedError.message);
    return NextResponse.json({ error: "Temporary webhook processing error." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
