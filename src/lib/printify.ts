import { getPrintifyConfig } from "./env";
import type { AddressInput } from "./validators";
import { toPrintifyAddress } from "./validators";

const API_BASE = "https://api.printify.com/v1";
const USER_AGENT = "VenmoShirtStore/1.0";

type PrintifyRequestInit = RequestInit & { token: string };

async function printifyFetch<T>(
  path: string,
  init: PrintifyRequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.token}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Printify API ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export type ShippingOption = {
  method: number;
  label: string;
  costCents: number;
  minDays: number | null;
  maxDays: number | null;
};

/** Printify returns flat cent amounts: { "standard": 1000, "priority": 5000, ... } */
type ShippingQuoteResponse = {
  standard?: number;
  priority?: number;
  express?: number;
  printify_express?: number;
  economy?: number;
};

const SHIPPING_LABELS: Record<string, { method: number; label: string }> = {
  standard: { method: 1, label: "Standard" },
  priority: { method: 2, label: "Priority" },
  express: { method: 3, label: "Express" },
  printify_express: { method: 3, label: "Printify Express" },
  economy: { method: 4, label: "Economy" },
};

function toOption(key: string, costCents?: number): ShippingOption | null {
  if (typeof costCents !== "number") return null;
  const meta = SHIPPING_LABELS[key];
  if (!meta) return null;
  return {
    method: meta.method,
    label: meta.label,
    costCents: Math.round(costCents),
    minDays: null,
    maxDays: null,
  };
}

export async function getShippingQuote(
  variantId: number,
  address: AddressInput,
): Promise<ShippingOption[]> {
  const { token, shopId, blueprintId, printProviderId } = getPrintifyConfig();
  const printifyAddress = toPrintifyAddress(address);

  const data = await printifyFetch<ShippingQuoteResponse>(
    `/shops/${shopId}/orders/shipping.json`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        line_items: [
          {
            blueprint_id: blueprintId,
            print_provider_id: printProviderId,
            variant_id: variantId,
            quantity: 1,
          },
        ],
        address_to: {
          country: printifyAddress.country,
          region: printifyAddress.region,
          zip: printifyAddress.zip,
        },
      }),
    },
  );

  const options = [
    toOption("standard", data.standard),
    toOption("priority", data.priority),
    toOption("express", data.express),
    toOption("printify_express", data.printify_express),
    toOption("economy", data.economy),
  ].filter((o): o is ShippingOption => o !== null);

  const byMethod = new Map<number, ShippingOption>();
  for (const option of options) {
    const existing = byMethod.get(option.method);
    if (!existing || option.costCents < existing.costCents) {
      byMethod.set(option.method, option);
    }
  }

  return [...byMethod.values()].sort((a, b) => a.costCents - b.costCents);
}

type UploadResponse = {
  id: string;
  preview_url?: string;
  url?: string;
};

export async function uploadDesignImage(
  pngBuffer: Buffer,
  fileName: string,
): Promise<UploadResponse> {
  const { token } = getPrintifyConfig();
  const base64 = pngBuffer.toString("base64");

  return printifyFetch<UploadResponse>("/uploads/images.json", {
    method: "POST",
    token,
    body: JSON.stringify({
      file_name: fileName,
      contents: base64,
    }),
  });
}

export async function createAndFulfillOrder(params: {
  externalId: string;
  variantId: number;
  imageUrl: string;
  shippingMethod: number;
  address: AddressInput;
}): Promise<{ orderId: string }> {
  const { token, shopId, blueprintId, printProviderId } = getPrintifyConfig();
  const addressTo = toPrintifyAddress(params.address);

  const order = await printifyFetch<{ id: string }>(
    `/shops/${shopId}/orders.json`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        external_id: params.externalId,
        line_items: [
          {
            blueprint_id: blueprintId,
            print_provider_id: printProviderId,
            variant_id: params.variantId,
            quantity: 1,
            print_areas: {
              front: [
                {
                  src: params.imageUrl,
                  scale: 1,
                  x: 0.5,
                  y: 0.5,
                  angle: 0,
                },
              ],
            },
          },
        ],
        shipping_method: params.shippingMethod,
        address_to: addressTo,
        send_shipping_notification: true,
      }),
    },
  );

  await printifyFetch(`/shops/${shopId}/orders/${order.id}/send_to_production.json`, {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });

  return { orderId: order.id };
}

export async function findOrderByExternalId(
  externalId: string,
): Promise<string | null> {
  const { token, shopId } = getPrintifyConfig();

  try {
    const orders = await printifyFetch<{ data?: Array<{ id: string; external_id?: string }> }>(
      `/shops/${shopId}/orders.json?limit=50`,
      { method: "GET", token },
    );
    const match = orders.data?.find((o) => o.external_id === externalId);
    return match?.id ?? null;
  } catch {
    return null;
  }
}

export async function listShops(token: string) {
  return printifyFetch<Array<{ id: number; title: string }>>("/shops.json", {
    method: "GET",
    token,
  });
}

export async function listBlueprints(token: string, page = 1) {
  return printifyFetch<{
    data: Array<{ id: number; title: string; brand: string; model: string }>;
  }>(`/catalog/blueprints.json?limit=20&page=${page}`, {
    method: "GET",
    token,
  });
}

export async function listPrintProviders(
  token: string,
  blueprintId: number,
) {
  return printifyFetch<Array<{ id: number; title: string }>>(
    `/catalog/blueprints/${blueprintId}/print_providers.json`,
    { method: "GET", token },
  );
}

export async function listVariants(
  token: string,
  blueprintId: number,
  printProviderId: number,
) {
  return printifyFetch<{
    variants: Array<{
      id: number;
      title: string;
      options: { size?: string; color?: string };
    }>;
  }>(
    `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
    { method: "GET", token },
  );
}
