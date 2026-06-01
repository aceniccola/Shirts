import Stripe from "stripe";
import { getShirtPriceCents, getSiteUrl } from "./env";
import { parseDesignText } from "./design";
import type { CheckoutRequest } from "./validators";
import { serializeDesignText } from "./validators";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(key);
}

export async function createCheckoutSession(
  input: CheckoutRequest,
  variantId: number,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const shirtCents = getShirtPriceCents();
  const siteUrl = getSiteUrl();

  return stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${siteUrl}/?success=1`,
    cancel_url: `${siteUrl}/?canceled=1`,
    customer_email: input.address.email,
    metadata: {
      venmo: input.venmo,
      designText: serializeDesignText(parseDesignText(input.designText)),
      size: input.size,
      variantId: String(variantId),
      shippingMethod: String(input.shippingMethod),
      addressJson: JSON.stringify(input.address),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: shirtCents,
          product_data: {
            name: "Need Money For Claude Code Tee",
            description: `Size ${input.size} — personalized Venmo QR`,
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.shippingCents,
          product_data: {
            name: "Shipping",
          },
        },
      },
    ],
  });
}

export function constructStripeEvent(
  payload: string,
  signature: string,
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
