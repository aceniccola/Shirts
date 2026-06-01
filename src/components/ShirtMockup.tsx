type ShirtMockupProps = {
  designSrc: string | null;
  loading?: boolean;
  error?: string | null;
};

export function ShirtMockup({ designSrc, loading, error }: ShirtMockupProps) {
  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <svg
        viewBox="0 0 320 400"
        className="h-auto w-full drop-shadow-md"
        aria-hidden
      >
        <defs>
          <clipPath id="shirtBody">
            <path d="M40 95 L95 70 L115 78 L160 72 L205 78 L225 70 L280 95 L280 380 L40 380 Z" />
          </clipPath>
        </defs>
        {/* Shadow */}
        <ellipse cx="160" cy="392" rx="100" ry="8" fill="#00000012" />
        {/* Sleeves */}
        <path
          d="M40 95 L8 115 L18 155 L55 130 Z"
          fill="#f5f5f4"
          stroke="#d6d3d1"
          strokeWidth="1.5"
        />
        <path
          d="M280 95 L312 115 L302 155 L265 130 Z"
          fill="#f5f5f4"
          stroke="#d6d3d1"
          strokeWidth="1.5"
        />
        {/* Body */}
        <path
          d="M40 95 L95 70 L115 78 L160 72 L205 78 L225 70 L280 95 L280 380 L40 380 Z"
          fill="#ffffff"
          stroke="#d6d3d1"
          strokeWidth="1.5"
        />
        {/* Neck */}
        <path
          d="M115 78 Q160 88 205 78 L205 72 Q160 62 115 72 Z"
          fill="#fafaf9"
          stroke="#d6d3d1"
          strokeWidth="1.5"
        />
        {/* Chest print area background */}
        <rect
          x="88"
          y="118"
          width="144"
          height="200"
          fill="#fafaf9"
          clipPath="url(#shirtBody)"
        />
      </svg>

      {/* Design overlay on chest */}
      <div
        className="pointer-events-none absolute left-1/2 top-[29%] flex h-[50%] w-[45%] -translate-x-1/2 items-center justify-center"
        aria-label="Shirt design preview"
      >
        {loading && (
          <div className="flex h-full w-full items-center justify-center rounded bg-white/80 text-xs text-stone-500">
            Updating…
          </div>
        )}
        {!loading && error && (
          <div className="rounded bg-red-50 px-2 py-1 text-center text-xs text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && designSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={designSrc}
            alt="Your shirt design"
            className="max-h-full max-w-full object-contain"
          />
        )}
        {!loading && !error && !designSrc && (
          <p className="text-center text-xs text-stone-400">
            Enter Venmo + text to preview
          </p>
        )}
      </div>
    </div>
  );
}
