import { NextRequest, NextResponse } from "next/server";
import { getVariantIdForSize } from "@/lib/env";
import { getShippingQuote } from "@/lib/printify";
import { rateLimit } from "@/lib/rate-limit";
import { createCheckoutSession } from "@/lib/stripe";
import { normalizeVenmo } from "@/lib/venmo";
import { checkoutRequestSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if (!rateLimit(`checkout:${ip}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = checkoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const input = parsed.data;
    normalizeVenmo(input.venmo);

    const variantId = getVariantIdForSize(input.size);

    const shippingOptions = await getShippingQuote(variantId, input.address);
    const selected = shippingOptions.find(
      (o) => o.method === input.shippingMethod,
    );

    if (!selected) {
      return NextResponse.json(
        { error: "Invalid shipping method for this address" },
        { status: 400 },
      );
    }

    if (selected.costCents !== input.shippingCents) {
      return NextResponse.json(
        {
          error: "Shipping price changed. Please refresh shipping options.",
          expectedCents: selected.costCents,
        },
        { status: 409 },
      );
    }

    const session = await createCheckoutSession(input, variantId);

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
