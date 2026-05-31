import { generateShirtDesign } from "./design";
import { normalizeVenmo } from "./venmo";
import {
  createAndFulfillOrder,
  findOrderByExternalId,
  uploadDesignImage,
} from "./printify";
import type { AddressInput } from "./validators";

export async function fulfillOrderFromSession(params: {
  sessionId: string;
  venmo: string;
  variantId: number;
  shippingMethod: number;
  address: AddressInput;
}): Promise<{ orderId: string; alreadyExisted: boolean }> {
  const existing = await findOrderByExternalId(params.sessionId);
  if (existing) {
    return { orderId: existing, alreadyExisted: true };
  }

  const venmo = normalizeVenmo(params.venmo);
  const designBuffer = await generateShirtDesign(venmo);
  const upload = await uploadDesignImage(
    designBuffer,
    `design-${params.sessionId}.png`,
  );

  const imageUrl = upload.preview_url ?? upload.url;
  if (!imageUrl) {
    throw new Error("Printify upload did not return an image URL");
  }

  const { orderId } = await createAndFulfillOrder({
    externalId: params.sessionId,
    variantId: params.variantId,
    imageUrl,
    shippingMethod: params.shippingMethod,
    address: params.address,
  });

  return { orderId, alreadyExisted: false };
}
