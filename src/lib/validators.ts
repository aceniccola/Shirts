import { z } from "zod";

export const addressSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  address1: z.string().min(1).max(100),
  address2: z.string().max(100).optional(),
  city: z.string().min(1).max(50),
  region: z.string().min(2).max(50),
  zip: z.string().min(3).max(12),
  country: z.literal("US"),
});

export const quoteRequestSchema = z.object({
  venmo: z.string().min(1).max(32),
  size: z.enum(["S", "M", "L", "XL", "2XL"]),
  address: addressSchema,
});

export const checkoutRequestSchema = quoteRequestSchema.extend({
  shippingMethod: z.number().int().min(1).max(4),
  shippingCents: z.number().int().min(0),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export function toPrintifyAddress(address: AddressInput) {
  return {
    first_name: address.firstName,
    last_name: address.lastName,
    email: address.email,
    phone: address.phone,
    country: address.country,
    region: address.region,
    address1: address.address1,
    address2: address.address2 ?? "",
    city: address.city,
    zip: address.zip,
  };
}
