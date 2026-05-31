"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

type AddressForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  region: string;
  zip: string;
  country: "US";
};

type ShippingOption = {
  method: number;
  label: string;
  costCents: number;
  minDays: number | null;
  maxDays: number | null;
};

type QuoteResponse = {
  venmo: string;
  size: string;
  shirtPriceCents: number;
  shippingOptions: ShippingOption[];
  previewUrl: string;
};

const SIZES = ["S", "M", "L", "XL", "2XL"] as const;

const emptyAddress: AddressForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  region: "",
  zip: "",
  country: "US",
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function Storefront({
  shirtPriceCents,
  initialBanner = null,
}: {
  shirtPriceCents: number;
  initialBanner?: string | null;
}) {
  const [venmo, setVenmo] = useState("");
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [address, setAddress] = useState<AddressForm>(emptyAddress);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<number | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner] = useState<string | null>(initialBanner);
  const [modelSrc, setModelSrc] = useState("/images/model.jpg");

  const selectedOption = quote?.shippingOptions.find(
    (o) => o.method === selectedShipping,
  );

  const totalCents = useMemo(() => {
    if (!selectedOption) return null;
    return shirtPriceCents + selectedOption.costCents;
  }, [shirtPriceCents, selectedOption]);

  const previewSrc = quote?.previewUrl ?? null;

  const fetchQuote = useCallback(async () => {
    setLoadingQuote(true);
    setError(null);
    setQuote(null);
    setSelectedShipping(null);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venmo, size, address }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to get shipping quote");
      }
      setQuote(data as QuoteResponse);
      if (data.shippingOptions?.length) {
        setSelectedShipping(data.shippingOptions[0].method);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingQuote(false);
    }
  }, [venmo, size, address]);

  const startCheckout = async () => {
    if (!quote || !selectedOption) {
      setError("Get shipping options before checkout.");
      return;
    }

    setLoadingCheckout(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venmo,
          size,
          address,
          shippingMethod: selectedOption.method,
          shippingCents: selectedOption.costCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoadingCheckout(false);
    }
  };

  const updateAddress = (field: keyof AddressForm, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
              Single item drop
            </p>
            <h1 className="text-xl font-semibold">Need Money Tee</h1>
          </div>
          <p className="text-sm text-stone-600">
            Shirt {formatMoney(shirtPriceCents)} + shipping
          </p>
        </div>
      </header>

      {banner && (
        <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-center text-sm text-emerald-900">
          {banner}
        </div>
      )}

      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-100">
            <Image
              src={modelSrc}
              alt="Model wearing the shirt"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              onError={() => setModelSrc("/images/model-placeholder.svg")}
            />
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-white/90 px-3 py-1 text-xs text-stone-600">
              Replace with your photo: public/images/model.jpg
            </div>
          </div>
          <p className="text-sm leading-relaxed text-stone-600">
            White tee with &quot;need money for claude code&quot; and a QR code
            that links to your Venmo. Each order is printed on demand.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Customize</h2>
            <p className="mt-1 text-sm text-stone-600">
              Enter your Venmo username for the QR code on the shirt.
            </p>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Venmo username</span>
            <div className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 focus-within:border-stone-500">
              <span className="text-stone-400">@</span>
              <input
                className="w-full outline-none"
                placeholder="yourname"
                value={venmo}
                onChange={(e) => setVenmo(e.target.value)}
              />
            </div>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Size</span>
            <select
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
              value={size}
              onChange={(e) => setSize(e.target.value as (typeof SIZES)[number])}
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {previewSrc && venmo.trim() && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Print preview</p>
              <div className="flex justify-center rounded-lg border border-stone-200 bg-stone-50 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewSrc}
                  alt="Shirt design preview"
                  className="max-h-64 w-auto"
                />
              </div>
            </div>
          )}

          <div className="space-y-3 border-t border-stone-100 pt-4">
            <h3 className="text-sm font-semibold">Shipping (US)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["firstName", "First name"],
                  ["lastName", "Last name"],
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["address1", "Address"],
                  ["address2", "Apt (optional)"],
                  ["city", "City"],
                  ["region", "State"],
                  ["zip", "ZIP"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="block space-y-1 text-sm">
                  <span className="font-medium">{label}</span>
                  <input
                    className="w-full rounded-lg border border-stone-300 px-3 py-2"
                    value={address[field]}
                    onChange={(e) => updateAddress(field, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={fetchQuote}
            disabled={loadingQuote || !venmo.trim()}
            className="w-full rounded-lg border border-stone-300 bg-stone-100 px-4 py-3 text-sm font-medium transition hover:bg-stone-200 disabled:opacity-50"
          >
            {loadingQuote ? "Getting shipping…" : "Get shipping options"}
          </button>

          {quote && (
            <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
              <p className="font-medium">Shipping options</p>
              {quote.shippingOptions.map((option) => (
                <label
                  key={option.method}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-stone-200 bg-white px-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedShipping === option.method}
                      onChange={() => setSelectedShipping(option.method)}
                    />
                    <span>
                      {option.label}
                      {option.minDays != null && option.maxDays != null && (
                        <span className="text-stone-500">
                          {" "}
                          ({option.minDays}–{option.maxDays} days)
                        </span>
                      )}
                    </span>
                  </span>
                  <span>{formatMoney(option.costCents)}</span>
                </label>
              ))}
              {totalCents != null && (
                <p className="border-t border-stone-200 pt-3 text-base font-semibold">
                  Total: {formatMoney(totalCents)}
                  <span className="ml-2 text-sm font-normal text-stone-500">
                    ({formatMoney(shirtPriceCents)} shirt +{" "}
                    {formatMoney(selectedOption!.costCents)} shipping)
                  </span>
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={startCheckout}
            disabled={loadingCheckout || !quote || !selectedOption}
            className="w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
          >
            {loadingCheckout ? "Redirecting to Stripe…" : "Checkout securely"}
          </button>
          <p className="text-center text-xs text-stone-500">
            Payments processed by Stripe. We only send your order to Printify
            after payment succeeds.
          </p>
        </section>
      </main>
    </div>
  );
}
