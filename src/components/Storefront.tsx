"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_DESIGN_TEXT } from "@/lib/design-defaults";
import { ShirtMockup } from "./ShirtMockup";

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
  designText: string;
  size: string;
  shirtPriceCents: number;
  shippingOptions: ShippingOption[];
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
  const [designText, setDesignText] = useState(DEFAULT_DESIGN_TEXT);
  const [size, setSize] = useState<(typeof SIZES)[number]>("M");
  const [address, setAddress] = useState<AddressForm>(emptyAddress);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<number | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner] = useState<string | null>(initialBanner);
  const [modelSrc, setModelSrc] = useState("/images/model.jpg");

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const selectedOption = quote?.shippingOptions.find(
    (o) => o.method === selectedShipping,
  );

  const totalCents = useMemo(() => {
    if (!selectedOption) return null;
    return shirtPriceCents + selectedOption.costCents;
  }, [shirtPriceCents, selectedOption]);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      const trimmedVenmo = venmo.trim();
      const trimmedText = designText.trim();

      if (!trimmedVenmo || !trimmedText) {
        if (cancelled) return;
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
        setPreviewBlobUrl(null);
        setPreviewError(null);
        setPreviewLoading(false);
        return;
      }

      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venmo: trimmedVenmo,
            designText: trimmedText,
          }),
        });

        if (cancelled) return;

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? "Preview failed",
          );
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = url;
        setPreviewBlobUrl(url);
      } catch (err) {
        if (cancelled) return;
        setPreviewError(
          err instanceof Error ? err.message : "Could not load preview",
        );
        setPreviewBlobUrl(null);
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [venmo, designText]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const fetchQuote = useCallback(async () => {
    if (!address.phone.trim()) {
      setError("Phone number is required for shipping.");
      return;
    }

    setLoadingQuote(true);
    setError(null);
    setQuote(null);
    setSelectedShipping(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venmo, designText, size, address }),
        signal: controller.signal,
      });

      let data: { error?: string; details?: unknown };
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.ok
            ? "Invalid response from server"
            : `Shipping request failed (${res.status})`,
        );
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to get shipping quote");
      }
      const quoteData = data as QuoteResponse;
      setQuote(quoteData);
      if (quoteData.shippingOptions?.length) {
        setSelectedShipping(quoteData.shippingOptions[0].method);
      } else {
        setError("No shipping options returned for this address.");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError("Shipping request timed out. Try again in a moment.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      clearTimeout(timeout);
      setLoadingQuote(false);
    }
  }, [venmo, designText, size, address]);

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
          designText,
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
          </div>
          <p className="text-sm leading-relaxed text-stone-600">
            Custom text plus a Venmo QR code, printed on a white tee on demand.
          </p>
        </section>

        <section
          className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
              e.preventDefault();
            }
          }}
        >
          <div>
            <h2 className="text-lg font-semibold">Customize</h2>
            <p className="mt-1 text-sm text-stone-600">
              Edit the shirt text and enter your Venmo for the QR code.
            </p>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Shirt text</span>
            <textarea
              className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-stone-500"
              rows={4}
              value={designText}
              onChange={(e) => setDesignText(e.target.value)}
              placeholder={DEFAULT_DESIGN_TEXT}
            />
            <span className="text-xs text-stone-500">
              One line per row (up to 4 lines). QR links to your Venmo.
            </span>
          </label>

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

          <div className="space-y-2">
            <p className="text-sm font-medium">Preview</p>
            <div className="flex justify-center rounded-xl border border-stone-200 bg-stone-100/80 py-6">
              <ShirtMockup
                designSrc={previewBlobUrl}
                loading={previewLoading}
                error={previewError}
              />
            </div>
          </div>

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
                    required={field !== "address2"}
                    type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  />
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={fetchQuote}
            disabled={loadingQuote || !venmo.trim() || !designText.trim()}
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
