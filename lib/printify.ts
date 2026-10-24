import "server-only";
import { z } from "zod";
import type {
  PrintifyOption,
  PrintifyProduct,
  PrintifyVariant,
  StoreProduct,
  StoreVariant,
} from "./types";

const API = "https://api.printify.com/v1";

function config() {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = process.env.PRINTIFY_SHOP_ID;
  if (!token || !shopId) {
    throw new Error("Printify is not configured. Set PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID.");
  }
  return { token, shopId };
}

const listSchema = z.object({
  current_page: z.number().optional(),
  last_page: z.number().optional(),
  data: z.array(z.unknown()),
});

async function printifyFetch(path: string) {
  const { token } = config();
  const response = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "FeminineGameStore/0.3",
    },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Printify API request failed (${response.status})`);
  return response.json();
}

function optionValueMap(options: PrintifyOption[], variant: PrintifyVariant) {
  const result: Record<string, string> = {};
  const selectedIds = Array.isArray(variant.options) ? variant.options : [];
  options.forEach((option, index) => {
    const selected = option.values?.find((value) => value.id === selectedIds[index]);
    if (selected) result[option.name] = selected.title;
  });
  return result;
}

function normalizeProduct(raw: PrintifyProduct): StoreProduct {
  const options = raw.options ?? [];
  const images = (raw.images ?? [])
    .filter((img) => Boolean(img.src))
    .sort((a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)));

  const variants: StoreVariant[] = (raw.variants ?? []).map((variant) => ({
    id: variant.id,
    title: variant.title,
    retailPriceCents: variant.price,
    printifyCostCents: typeof variant.cost === "number" ? variant.cost : null,
    enabled: variant.is_enabled,
    available: variant.is_available ?? true,
    isDefault: Boolean(variant.is_default),
    optionValues: optionValueMap(options, variant),
  }));

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? "",
    image: images.find((image) => image.is_default)?.src ?? images[0]?.src ?? null,
    images,
    variants,
    options,
    tags: raw.tags ?? [],
  };
}

export async function getPrintifyProducts(): Promise<StoreProduct[]> {
  const { shopId } = config();
  const products: PrintifyProduct[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const json = await printifyFetch(
      `/shops/${encodeURIComponent(shopId)}/products.json?limit=50&page=${page}`,
    );
    const parsed = listSchema.parse(json);
    products.push(...(parsed.data as PrintifyProduct[]));
    lastPage = parsed.last_page ?? page;
    page += 1;
  } while (page <= lastPage && page <= 100);

  return products.filter((product) => product.visible !== false).map(normalizeProduct);
}

export async function getPrintifyProduct(productId: string): Promise<StoreProduct | null> {
  const { shopId } = config();
  const json = await printifyFetch(
    `/shops/${encodeURIComponent(shopId)}/products/${encodeURIComponent(productId)}.json`,
  );
  return normalizeProduct(json as PrintifyProduct);
}
