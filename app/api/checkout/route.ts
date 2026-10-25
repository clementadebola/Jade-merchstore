
import { NextResponse } from "next/server";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  addressSchema,
  cartItemsSchema,
  getShippingRates,
  priceCart,
  type CheckoutAddress,
} from "@/lib/checkout-server";

export const runtime = "nodejs";

function getConfig() {
  const apiKey = process.env.BACHS_API_KEY;
  const baseUrl = process.env.BACHS_API_BASE_URL
  ?.trim()
  .replace(/\/+$/, "");

if (!baseUrl) {
  throw new Error("Missing BACHS_API_BASE_URL environment variable.");
}
  const storeUrl = process.env.STORE_URL?.replace(/\/+$/, "");
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !storeUrl || !supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing checkout environment variables."
    );
  }

  const base = new URL(baseUrl);
  const store = new URL(storeUrl);

  if (
    base.protocol !== "https:" ||
    ![
      "api.bachs.io",
      "sandbox-api.bachs.io",
    ].includes(base.hostname)
  ) {
    throw new Error("Invalid Bachs API URL.");
  }

  if (store.protocol !== "https:") {
    throw new Error(
      "STORE_URL must be a public HTTPS URL."
    );
  }

  const isSandbox =
    base.hostname === "sandbox-api.bachs.io";
  const isSandboxKey = apiKey.startsWith("sk_sandbox_");

  if (isSandbox !== isSandboxKey) {
    throw new Error(
      "Your Bachs API key and API URL do not match."
    );
  }

  return {
    apiKey,
    baseUrl,
    storeUrl,
    supabaseUrl,
    serviceKey,
  };
}

export async function POST(request: Request) {
  let orderId: string | null = null;
  let supabase: SupabaseClient | undefined;

  try {
    // Parse request body.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid checkout details." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const itemsResult = cartItemsSchema.safeParse(
      data.items
    );

    const addressResult = addressSchema.safeParse(
      data.address
    );

    const shippingMethod =
      typeof data.shippingMethod === "string"
        ? data.shippingMethod
        : "";

    if (
      !itemsResult.success ||
      !addressResult.success ||
      !shippingMethod
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter your shipping address, add products, and select a delivery option.",
        },
        { status: 400 }
      );
    }

    const items = itemsResult.data;
    const address: CheckoutAddress =
      addressResult.data;

    const config = getConfig();

    // Create a server-only Supabase client.
    supabase = createClient(
      config.supabaseUrl,
      config.serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Recalculate merchandise prices using Printify.
    const { lines, subtotalCents } =
      await priceCart(items);

    // Recalculate delivery using the same cart and address.
    const shippingRates = await getShippingRates(
      items,
      address
    );

    const selectedRate = shippingRates.find(
      (rate) => rate.id === shippingMethod
    );

    if (!selectedRate) {
      return NextResponse.json(
        {
          error:
            "Your delivery option is no longer available. Please calculate shipping again.",
        },
        { status: 409 }
      );
    }

    const shippingCents = selectedRate.amountCents;

    // Tax is not automatically calculated by this route.
    // Integrate a tax service before setting this to a non-zero amount.
    const taxCents = 0;

    // The exact amount we intend to charge through Bachs.
    const totalCents =
      subtotalCents + shippingCents + taxCents;

    if (
      !Number.isSafeInteger(subtotalCents) ||
      !Number.isSafeInteger(shippingCents) ||
      !Number.isSafeInteger(totalCents) ||
      subtotalCents < 0 ||
      shippingCents < 0 ||
      totalCents <= 0
    ) {
      return NextResponse.json(
        { error: "The checkout total is invalid." },
        { status: 400 }
      );
    }

    const customerName = address.fullName.trim();

    const shippingAddress = {
      ...address,
      selectedShippingMethod: selectedRate.id,
      selectedShippingLabel: selectedRate.label,
    };

    // Save the pending order.
    // Column names must match your existing Supabase schema.
    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .insert({
          status: "pending_payment",
          customer_email: address.email,
          customer_name: customerName,
          shipping_address: shippingAddress,
          subtotal_cents: subtotalCents,
          shipping_cents: shippingCents,
          tax_cents: taxCents,
          total_cents: totalCents,
        })
        .select("id, order_number")
        .single();

    if (orderError || !order) {
      console.error(
        "Supabase order insert failed:",
        orderError?.message
      );

      return NextResponse.json(
        { error: "Could not save your order." },
        { status: 502 }
      );
    }

    const savedOrderId = String(order.id);
    orderId = savedOrderId;

    // Save individual order items.
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(
        lines.map((line) => ({
          order_id: savedOrderId,
          printify_product_id: line.productId,
          printify_variant_id: line.variantId,
          product_title: line.title,
          variant_title: line.variantTitle,
          quantity: line.quantity,
          unit_price_cents: line.unitPriceCents,
          printify_cost_cents: line.printifyCostCents,
        }))
      );

    if (itemsError) {
      console.error(
        "Supabase order items insert failed:",
        itemsError.message
      );

      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", savedOrderId);

      return NextResponse.json(
        { error: "Could not save the order items." },
        { status: 502 }
      );
    }

    const amount = (totalCents / 100).toFixed(2);

    console.log("Creating Bachs checkout:", {
      orderId: savedOrderId,
      subtotalCents,
      shippingCents,
      taxCents,
      totalCents,
      amountSentToBachs: amount,
      currency: "USD",
    });

    // Create Bachs checkout using the combined total.
    const checkoutResponse = await fetch(
      `${config.baseUrl}/v1/checkout-sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pricing: {
            currency: "USD",
            amount,
          },
          success_url:
            `${config.storeUrl}/checkout/success`,
          cancel_url: `${config.storeUrl}/#shop`,
        }),
        cache: "no-store",
      }
    );

    if (!checkoutResponse.ok) {
      const providerError = await checkoutResponse
        .text()
        .catch(() => "");

      console.error(
        "Bachs checkout creation failed:",
        checkoutResponse.status,
        providerError.slice(0, 500)
      );

      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", savedOrderId);

      return NextResponse.json(
        {
          error:
            "Bachs could not create the checkout session.",
        },
        { status: 502 }
      );
    }

    const checkout = (await checkoutResponse.json()) as {
      checkout_id?: string;
      checkout_url?: string;
      checkoutUrl?: string;
    };

    const checkoutUrl =
      checkout.checkout_url ??
      checkout.checkoutUrl;

    if (
      !checkoutUrl ||
      !checkoutUrl.startsWith("https://")
    ) {
      console.error(
        "Invalid Bachs checkout response:",
        checkout
      );

      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", savedOrderId);

      return NextResponse.json(
        {
          error:
            "Bachs returned an invalid checkout URL.",
        },
        { status: 502 }
      );
    }

    // Save the Bachs session ID if the provider returns it.
    if (checkout.checkout_id) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          bachs_checkout_id: checkout.checkout_id,
        })
        .eq("id", savedOrderId);

      if (updateError) {
        console.error(
          "Could not save Bachs checkout ID:",
          updateError.message
        );
      }
    }

    return NextResponse.json({
      checkoutUrl,
      orderNumber: order.order_number,
      totals: {
        subtotalCents,
        shippingCents,
        taxCents,
        totalCents,
        currency: "USD",
      },
    });
  } catch (error) {
    console.error(
      "Checkout setup error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    if (orderId && supabase) {
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not start checkout.",
      },
      { status: 500 }
    );
  }
}
