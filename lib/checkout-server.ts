import "server-only";
import { z } from "zod";
import { getPrintifyProduct } from "@/lib/printify";

export const cartItemsSchema = z.array(z.object({
  productId: z.string().min(1).max(100),
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10),
})).min(1).max(30);

export const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  country: z.string().regex(/^[A-Z]{2}$/),
  address1: z.string().trim().min(3).max(150),
  address2: z.string().trim().max(150).optional().default(""),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().min(1).max(100),
  zip: z.string().trim().min(2).max(20),
});

export type CheckoutAddress = z.infer<typeof addressSchema>;
export type CartRequestItem = z.infer<typeof cartItemsSchema>[number];
export type PricedLine = {
  productId: string;
  variantId: number;
  quantity: number;
  title: string;
  variantTitle: string;
  unitPriceCents: number;
  printifyCostCents: number;
};
export type ShippingRate = { id: string; label: string; amountCents: number };

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || "Customer",
    lastName: parts.slice(1).join(" ") || "Customer",
  };
}

export function toPrintifyAddress(address: CheckoutAddress) {
  const { firstName, lastName } = splitName(address.fullName);
  return {
    first_name: firstName,
    last_name: lastName,
    email: address.email,
    phone: address.phone,
    country: address.country,
    region: address.region,
    address1: address.address1,
    address2: address.address2 || "",
    city: address.city,
    zip: address.zip,
  };
}

export async function priceCart(items: CartRequestItem[]): Promise<{ lines: PricedLine[]; subtotalCents: number }> {
  const ids = [...new Set(items.map((item) => item.productId))];
  const products = await Promise.all(ids.map(async (id) => {
    const product = await getPrintifyProduct(id);
    if (!product) throw new Error("A selected product could not be found.");
    return product;
  }));
  const productMap = new Map(products.map((product) => [product.id, product]));
  let subtotalCents = 0;
  const lines: PricedLine[] = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
    if (!product || !variant || !variant.enabled || !variant.available || !Number.isSafeInteger(variant.retailPriceCents) || variant.retailPriceCents <= 0) {
      throw new Error("One of the selected variants is no longer available.");
    }
    const lineTotal = variant.retailPriceCents * item.quantity;
    subtotalCents += lineTotal;
    if (!Number.isSafeInteger(subtotalCents)) throw new Error("Cart total is invalid.");
    lines.push({
      productId: product.id,
      variantId: variant.id,
      quantity: item.quantity,
      title: product.title,
      variantTitle: Object.values(variant.optionValues).join(" / ") || variant.title,
      unitPriceCents: variant.retailPriceCents,
      printifyCostCents: Number.isSafeInteger(variant.printifyCostCents) && (variant.printifyCostCents ?? -1) >= 0 ? variant.printifyCostCents! : 0,
    });
  }
  return { lines, subtotalCents };
}

export async function getShippingRates(items: CartRequestItem[], address: CheckoutAddress): Promise<ShippingRate[]> {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = process.env.PRINTIFY_SHOP_ID;
  if (!token || !shopId) throw new Error("Printify is not configured.");
  const response = await fetch(`https://api.printify.com/v1/shops/${encodeURIComponent(shopId)}/orders/shipping.json`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "FeminineGameStore/0.4" },
    body: JSON.stringify({
      line_items: items.map((item) => ({ product_id: item.productId, variant_id: item.variantId, quantity: item.quantity })),
      address_to: toPrintifyAddress(address),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Printify shipping quote failed:", response.status, detail.slice(0, 500));
    throw new Error(response.status === 400 ? "Printify could not calculate delivery for this address or cart. Check the address and product availability." : "Shipping rates are temporarily unavailable. Please try again.");
  }
  const raw = await response.json() as Record<string, unknown>;
  const labels: Record<string, string> = {
    standard: "Standard delivery", economy: "Economy delivery", express: "Express delivery",
    priority: "Priority delivery", printify_express: "Printify Express delivery",
  };
  const rates = Object.entries(raw).flatMap(([key, value]) => {
    if (!labels[key] || typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return [];
    return [{ id: key, label: labels[key], amountCents: value }];
  });
  if (rates.length === 0) throw new Error("Printify returned no delivery methods for this address.");
  return rates.sort((a, b) => a.amountCents - b.amountCents);
}
