import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillOrderFromSession } from "@/lib/fulfillment";
import { constructStripeEvent } from "@/lib/stripe";
import type { AddressInput } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(payload, signature);
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: "not paid" });
    }

    const metadata = session.metadata ?? {};
    const venmo = metadata.venmo;
    const designText = metadata.designText;
    const variantId = Number.parseInt(metadata.variantId ?? "", 10);
    const shippingMethod = Number.parseInt(metadata.shippingMethod ?? "", 10);
    const addressJson = metadata.addressJson;

    if (!venmo || !designText || !addressJson || !variantId || !shippingMethod) {
      console.error("Webhook missing metadata", session.id, metadata);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    let address: AddressInput;
    try {
      address = JSON.parse(addressJson) as AddressInput;
    } catch {
      return NextResponse.json({ error: "Invalid address metadata" }, { status: 400 });
    }

    try {
      const result = await fulfillOrderFromSession({
        sessionId: session.id,
        venmo,
        designText,
        variantId,
        shippingMethod,
        address,
      });

      console.log(
        `Fulfilled order ${result.orderId} for session ${session.id} (existing=${result.alreadyExisted})`,
      );
    } catch (error) {
      console.error("Fulfillment failed:", error);
      return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
