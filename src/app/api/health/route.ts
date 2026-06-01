import { NextResponse } from "next/server";
import { getPrintifyConfig, getVariantIds } from "@/lib/env";
import { listShops } from "@/lib/printify";

export async function GET() {
  let variantSizes: string[] = [];
  let variantError: string | null = null;

  try {
    variantSizes = Object.keys(getVariantIds());
  } catch (error) {
    variantError =
      error instanceof Error ? error.message : "Invalid PRINTIFY_VARIANT_IDS";
  }

  let printifyShop: { id: number; title: string } | null = null;
  let printifyError: string | null = null;

  try {
    const { token, shopId } = getPrintifyConfig();
    const shops = await listShops(token);
    const configuredId = Number.parseInt(shopId, 10);
    const match = shops.find((s) => s.id === configuredId);
    if (match) {
      printifyShop = { id: match.id, title: match.title };
    } else {
      printifyError = `PRINTIFY_SHOP_ID ${shopId} not found on this API token. Available shop ids: ${shops.map((s) => s.id).join(", ") || "(none)"}`;
    }
  } catch (error) {
    printifyError =
      error instanceof Error ? error.message : "Printify connection failed";
  }

  const ok = !variantError && !printifyError;

  return NextResponse.json({
    ok,
    variantSizes,
    variantError,
    printifyShop,
    printifyError,
  });
}
