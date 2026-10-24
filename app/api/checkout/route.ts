
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrintifyProduct } from "@/lib/printify";

export const runtime = "nodejs";

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        variantId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1)
    .max(30),
});

function getBachsConfig() {
  const apiKey = process.env.BACHS_API_KEY;
  const baseUrl = process.env.BACHS_API_BASE_URL?.replace(/\/+$/, "");
  const storeUrl = process.env.STORE_URL?.replace(/\/+$/, "");

  if (!apiKey || !baseUrl || !storeUrl) {
    throw new Error("Payment configuration is missing.");
  }

  let parsedBaseUrl: URL;
  let parsedStoreUrl: URL;

  try {
    parsedBaseUrl = new URL(baseUrl);
    parsedStoreUrl = new URL(storeUrl);
  } catch {
    throw new Error("Payment configuration contains an invalid URL.");
  }

  if (
    parsedBaseUrl.protocol !== "https:" ||
    !["api.bachs.io", "sandbox-api.bachs.io"].includes(
      parsedBaseUrl.hostname
    )
  ) {
    throw new Error("Invalid Bachs API URL configuration.");
  }

  if (parsedStoreUrl.protocol !== "https:") {
    throw new Error("STORE_URL must be a public HTTPS URL.");
  }

  const isSandboxUrl =
    parsedBaseUrl.hostname === "sandbox-api.bachs.io";
  const isSandboxKey = apiKey.startsWith("sk_sandbox_");

  if (isSandboxUrl !== isSandboxKey) {
    throw new Error(
      "Bachs API key and API URL do not match."
    );
  }

  return { apiKey, baseUrl, storeUrl };
}

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid cart details." },
        { status: 400 }
      );
    }

    const { apiKey, baseUrl, storeUrl } = getBachsConfig();

    // Fetch current product data on the server.
    // Never trust prices submitted by the browser.
    const uniqueIds = [
      ...new Set(parsed.data.items.map((item) => item.productId)),
    ];

    const products = await Promise.all(
      uniqueIds.map(async (id) => {
        const product = await getPrintifyProduct(id);

        if (!product) {
          throw new Error("A selected product could not be found.");
        }

        return product;
      })
    );

    const productMap = new Map(
      products.map((product) => [product.id, product])
    );

    let totalCents = 0;

    for (const item of parsed.data.items) {
      const product = productMap.get(item.productId);

      const variant = product?.variants.find(
        (candidate) => candidate.id === item.variantId
      );

      if (
        !product ||
        !variant ||
        !variant.enabled ||
        !variant.available ||
        !Number.isSafeInteger(variant.retailPriceCents) ||
        variant.retailPriceCents <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "One of the selected variants is no longer available.",
          },
          { status: 400 }
        );
      }

      totalCents += variant.retailPriceCents * item.quantity;

      if (!Number.isSafeInteger(totalCents)) {
        return NextResponse.json(
          { error: "Cart total is invalid." },
          { status: 400 }
        );
      }
    }

    // Sandbox checkout: merchandise subtotal only.
    // Shipping, Supabase order persistence, webhook verification,
    // and Printify fulfillment must be added before live sales.
    const checkoutResponse = await fetch(
      `${baseUrl}/v1/checkout-sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pricing: {
            currency: "USD",
            amount: (totalCents / 100).toFixed(2),
          },
          success_url: `${storeUrl}/checkout/success`,
          cancel_url: `${storeUrl}/#shop`,
        }),
        cache: "no-store",
      }
    );

    if (!checkoutResponse.ok) {
      console.error(
        "Bachs checkout session creation failed:",
        checkoutResponse.status
      );

      return NextResponse.json(
        {
          error:
            "Could not create checkout session. Check the Bachs sandbox configuration.",
        },
        { status: 502 }
      );
    }

    const checkout = (await checkoutResponse.json()) as {
      checkout_url?: string;
      checkoutUrl?: string;
    };

    const checkoutUrl =
      checkout.checkout_url ?? checkout.checkoutUrl;

    if (
      !checkoutUrl ||
      !checkoutUrl.startsWith("https://")
    ) {
      return NextResponse.json(
        { error: "Bachs returned an invalid checkout URL." },
        { status: 502 }
      );
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error(
      "Checkout setup error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
