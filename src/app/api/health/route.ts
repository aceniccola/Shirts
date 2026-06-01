import { NextResponse } from "next/server";
import { getVariantIds } from "@/lib/env";

export async function GET() {
  let variantSizes: string[] = [];
  let variantError: string | null = null;

  try {
    variantSizes = Object.keys(getVariantIds());
  } catch (error) {
    variantError =
      error instanceof Error ? error.message : "Invalid PRINTIFY_VARIANT_IDS";
  }

  return NextResponse.json({
    ok: !variantError,
    variantSizes,
    variantError,
  });
}
