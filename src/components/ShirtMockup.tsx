import Image from "next/image";

type ShirtMockupProps = {
  designSrc: string | null;
  loading?: boolean;
  error?: string | null;
};

/** Chest print zone on public/images/shirt-mockup-blank.png (1024×843) */
const PRINT_AREA = {
  leftPercent: 28.5,
  topPercent: 21.5,
  widthPercent: 45,
  heightPercent: 57,
} as const;

const BLANK_SRC = "/images/shirt-mockup-blank.png";

export function ShirtMockup({ designSrc, loading, error }: ShirtMockupProps) {
  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <div
        className="relative w-full shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        style={{ aspectRatio: "1024 / 843" }}
      >
        <Image
          src={BLANK_SRC}
          alt=""
          fill
          className="object-contain"
          sizes="(max-width: 640px) 90vw, 380px"
          priority
        />

        <div
          className="pointer-events-none absolute overflow-hidden"
          style={{
            left: `${PRINT_AREA.leftPercent}%`,
            top: `${PRINT_AREA.topPercent}%`,
            width: `${PRINT_AREA.widthPercent}%`,
            height: `${PRINT_AREA.heightPercent}%`,
          }}
          aria-label="Shirt design preview"
        >
          {loading && (
            <div className="flex h-full w-full items-center justify-center bg-white/70 text-xs text-stone-500">
              Updating…
            </div>
          )}
          {!loading && error && (
            <div className="flex h-full w-full items-center justify-center p-2">
              <p className="rounded bg-red-50 px-2 py-1 text-center text-xs text-red-700">
                {error}
              </p>
            </div>
          )}
          {!loading && !error && designSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={designSrc}
              alt="Your shirt design"
              className="h-full w-full object-contain object-top"
            />
          )}
          {!loading && !error && !designSrc && (
            <div className="flex h-full w-full items-center justify-center p-3">
              <p className="text-center text-xs text-stone-400">
                Enter Venmo + text to preview
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
