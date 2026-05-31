function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function getShirtPriceCents(): number {
  const raw = process.env.SHIRT_PRICE_CENTS ?? "3500";
  const cents = Number.parseInt(raw, 10);
  if (Number.isNaN(cents) || cents < 0) {
    throw new Error("SHIRT_PRICE_CENTS must be a non-negative integer");
  }
  return cents;
}

export function getVariantIds(): Record<string, number> {
  const raw = process.env.PRINTIFY_VARIANT_IDS;
  if (!raw) {
    throw new Error("Missing PRINTIFY_VARIANT_IDS");
  }
  const parsed = JSON.parse(raw) as Record<string, number>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("PRINTIFY_VARIANT_IDS must be a JSON object");
  }
  return parsed;
}

export function getPrintifyConfig() {
  return {
    token: required("PRINTIFY_API_TOKEN"),
    shopId: required("PRINTIFY_SHOP_ID"),
    blueprintId: Number.parseInt(required("PRINTIFY_BLUEPRINT_ID"), 10),
    printProviderId: Number.parseInt(required("PRINTIFY_PRINT_PROVIDER_ID"), 10),
    variantIds: getVariantIds(),
  };
}

export function getSiteUrl(): string {
  return optional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
}

export function isConfigured(): boolean {
  try {
    getPrintifyConfig();
    required("STRIPE_SECRET_KEY");
    return true;
  } catch {
    return false;
  }
}
