import { NextResponse } from "next/server";
import { addressSchema, cartItemsSchema, getShippingRates, priceCart } from "@/lib/checkout-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid checkout details." }, { status: 400 });
    const data = body as Record<string, unknown>;
    const items = cartItemsSchema.safeParse(data.items);
    const address = addressSchema.safeParse(data.address);
    if (!items.success || !address.success) return NextResponse.json({ error: "Please complete all required shipping fields and check the cart." }, { status: 400 });
    const [{ subtotalCents }, options] = await Promise.all([priceCart(items.data), getShippingRates(items.data, address.data)]);
    return NextResponse.json({ options, subtotalCents });
  } catch (error) {
    console.error("Shipping quote error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not calculate shipping." }, { status: 502 });
  }
}
