import { NextResponse } from "next/server";
import { getPrintifyProducts } from "@/lib/printify";

export async function GET() {
  try {
    return NextResponse.json({ products: await getPrintifyProducts() }, {
      headers: { "Cache-Control": "private, max-age=60" }
    });
  } catch {
    return NextResponse.json({ error: "Product catalogue temporarily unavailable." }, { status: 503 });
  }
}
