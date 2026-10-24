import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrintifyProduct } from "@/lib/printify";

export const runtime = "nodejs";

const requestSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1).max(100),
    variantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(10),
  })).min(1).max(30),
});

function getBachsConfig() {
  const apiKey = process.env.BACHS_API_KEY;
  const baseUrl = (process.env.BACHS_API_BASE_URL || "https://sandbox-api.bachs.io").replace(/\/+$/, "");
  const storeUrl = process.env.STORE_URL?.replace(/\/+$/, "");
  if (!apiKey) throw new Error("Missing BACHS_API_KEY in .env.local.");
  if (!storeUrl || !/^https:\/\//i.test(storeUrl)) {
    throw new Error("Set STORE_URL to your public HTTPS storefront URL for Bachs redirects.");
  }
  const isSandboxUrl = baseUrl.includes("sandbox-api.bachs.io");
  const isSandboxKey = apiKey.startsWith("sk_sandbox_");
  if (isSandboxUrl !== isSandboxKey) {
    throw new Error("Bachs key and API URL do not match. Use a sandbox key with the sandbox URL.");
  }
  return { apiKey, baseUrl, storeUrl };
}

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid cart details." }, { status: 400 });
    }

    const { apiKey, baseUrl, storeUrl } = getBachsConfig();

    // Re-fetch product and price server-side. Never trust prices submitted by the browser.
    const uniqueIds = [...new Set(parsed.data.items.map(item => item.productId))];
    const products = await Promise.all(uniqueIds.map(async id => {
      const product = await getPrintifyProduct(id);
      if (!product) throw new Error("A selected product could not be found.");
      return product;
    }));
    const productMap = new Map(products.map(product => [product.id, product]));

    let totalCents = 0;
    for (const item of parsed.data.items) {
      const product = productMap.get(item.productId);
      const variant = product?.variants.find(candidate => candidate.id === item.variantId);
      if (!product || !variant || !variant.enabled || !variant.available || variant.retailPriceCents <= 0) {
        return NextResponse.json({ error: "One of the selected variants is no longer available." }, { status: 400 });
      }
      totalCents += variant.retailPriceCents * item.quantity;
    }

    // This first pass creates a Bachs sandbox checkout for the merchandise subtotal.
    // Shipping and a persisted Supabase order are intentionally not included yet.
    const checkoutResponse = await fetch(`${baseUrl}/v1/checkout-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pricing: { currency: "USD", amount: (totalCents / 100).toFixed(2) },
        success_url: `${storeUrl}/checkout/success`,
        cancel_url: `${storeUrl}/#shop`,
      }),
      cache: "no-store",
    });

    if (!checkoutResponse.ok) {
      // Don't relay raw provider response details to the browser.
      console.error("Bachs checkout session creation failed:", checkoutResponse.status);
      return NextResponse.json({ error: "Bachs could not create the checkout session. Check the sandbox API key and dashboard." }, { status: 502 });
    }

    const checkout = await checkoutResponse.json() as { checkout_url?: string; checkoutUrl?: string };
    const checkoutUrl = checkout.checkout_url ?? checkout.checkoutUrl;
    if (!checkoutUrl || !checkoutUrl.startsWith("https://")) {
      return NextResponse.json({ error: "Bachs returned an invalid checkout URL." }, { status: 502 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("Checkout setup error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not start checkout.",
    }, { status: 500 });
  }
}
