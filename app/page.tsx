import Storefront from "@/components/storefront";
import { getPrintifyProducts } from "@/lib/printify";

export const revalidate = 300;

export default async function HomePage() {
  try {
    const products = await getPrintifyProducts();
    return <Storefront initialProducts={products} />;
  } catch (error) {
    // Avoid leaking API errors or credentials into the rendered page.
    console.error("Store catalogue unavailable", error instanceof Error ? error.message : "unknown error");
    return <Storefront initialProducts={[]} loadError />;
  }
}
