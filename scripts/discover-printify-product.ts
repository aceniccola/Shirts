/**
 * Run: npm run printify:discover
 * Reads PRINTIFY_API_TOKEN from .env.local (or your shell env).
 * Lists shops, blueprints, providers, and variants to copy into .env.local
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const API_BASE = "https://api.printify.com/v1";
const USER_AGENT = "VenmoShirtStore/1.0";

async function api<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Printify sometimes returns a raw array, sometimes { data: [...] }. */
function unwrapList<T>(payload: T[] | { data?: T[] }): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

type Blueprint = {
  id: number;
  title: string;
  brand: string;
  model: string;
};

async function main() {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    console.error(
      "Add PRINTIFY_API_TOKEN to .env.local in the project root, then run again.",
    );
    process.exit(1);
  }

  console.log("\n=== Shops (use id as PRINTIFY_SHOP_ID) ===\n");
  const shops = await api<Array<{ id: number; title: string }>>(
    "/shops.json",
    token,
  );
  for (const shop of shops) {
    console.log(`  ${shop.id}  ${shop.title}`);
  }

  console.log("\n=== Blueprints (search for a white tee) ===\n");
  const blueprintsRaw = await api<Blueprint[] | { data: Blueprint[] }>(
    "/catalog/blueprints.json?limit=30",
    token,
  );
  const blueprintList = unwrapList(blueprintsRaw);

  if (blueprintList.length === 0) {
    console.error("No blueprints returned from Printify.");
    process.exit(1);
  }

  for (const bp of blueprintList) {
    const label = `${bp.brand} ${bp.model}`.trim() || bp.title;
    console.log(`  ${bp.id}  ${label}`);
  }

  const sampleBlueprintId = blueprintList.find((b) =>
    `${b.brand} ${b.model} ${b.title}`.toLowerCase().includes("tee"),
  )?.id;

  if (!sampleBlueprintId) {
    console.log("\nPick a blueprint id from above and re-run with:");
    console.log("  BLUEPRINT_ID=123 npm run printify:discover");
    return;
  }

  console.log(`\n=== Providers for blueprint ${sampleBlueprintId} ===\n`);
  const providers = await api<Array<{ id: number; title: string }>>(
    `/catalog/blueprints/${sampleBlueprintId}/print_providers.json`,
    token,
  );
  for (const p of providers.slice(0, 8)) {
    console.log(`  ${p.id}  ${p.title}`);
  }

  const providerId = providers[0]?.id;
  if (!providerId) return;

  console.log(
    `\n=== Variants (blueprint ${sampleBlueprintId}, provider ${providerId}) ===\n`,
  );
  const variants = await api<{
    variants: Array<{
      id: number;
      title: string;
      options: { size?: string; color?: string };
    }>;
  }>(
    `/catalog/blueprints/${sampleBlueprintId}/print_providers/${providerId}/variants.json`,
    token,
  );

  const whiteVariants = variants.variants.filter(
    (v) =>
      !v.options.color ||
      v.options.color.toLowerCase().includes("white"),
  );

  const map: Record<string, number> = {};
  for (const v of whiteVariants.length ? whiteVariants : variants.variants) {
    const size = v.options.size;
    if (size) {
      map[size] = v.id;
      console.log(`  ${size.padEnd(6)} → variant id ${v.id}  (${v.title})`);
    }
  }

  const shopId = shops[0]?.id;
  console.log("\n=== Suggested .env.local snippet ===\n");
  if (shopId) console.log(`PRINTIFY_SHOP_ID=${shopId}`);
  console.log(`PRINTIFY_BLUEPRINT_ID=${sampleBlueprintId}`);
  console.log(`PRINTIFY_PRINT_PROVIDER_ID=${providerId}`);
  console.log(`PRINTIFY_VARIANT_IDS=${JSON.stringify(map)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
