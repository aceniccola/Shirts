import { NextRequest, NextResponse } from "next/server";
import { getShirtPriceCents, getVariantIds } from "@/lib/env";
import { getShippingQuote } from "@/lib/printify";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeVenmo } from "@/lib/venmo";
import { quoteRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if (!rateLimit(`quote:${ip}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = quoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { venmo, size, address } = parsed.data;
    const normalizedVenmo = normalizeVenmo(venmo);
    const variantIds = getVariantIds();
    const variantId = variantIds[size];

    if (!variantId) {
      return NextResponse.json(
        { error: `No Printify variant configured for size ${size}` },
        { status: 500 },
      );
    }

    const shippingOptions = await getShippingQuote(variantId, address);
    const shirtPriceCents = getShirtPriceCents();

    return NextResponse.json({
      venmo: normalizedVenmo,
      size,
      shirtPriceCents,
      shippingOptions,
      previewUrl: `/api/preview?venmo=${encodeURIComponent(normalizedVenmo)}`,
    });
  } catch (error) {
    console.error("Quote error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get shipping quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
