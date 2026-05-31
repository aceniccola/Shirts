import { Storefront } from "@/components/Storefront";
import { getShirtPriceCents } from "@/lib/env";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  let initialBanner: string | null = null;
  if (params.success === "1") {
    initialBanner = "Payment received — your shirt is being printed.";
  } else if (params.canceled === "1") {
    initialBanner = "Checkout canceled. Your cart is still here.";
  }

  let shirtPriceCents = 3500;
  try {
    shirtPriceCents = getShirtPriceCents();
  } catch {
    // Allow UI before env is configured
  }

  return (
    <Storefront
      shirtPriceCents={shirtPriceCents}
      initialBanner={initialBanner}
    />
  );
}
