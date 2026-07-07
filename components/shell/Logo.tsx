/**
 * Logo oficial de Work.Code: isotipo SVG (brackets de código sobre
 * degradado de marca) + wordmark. Reemplazable por el asset definitivo
 * de diseño sin tocar a los consumidores.
 */
export function Logo({ size = 30, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <div className="brand" style={{ gap: wordmark ? 10 : 0 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-label="Work.Code"
      >
        <defs>
          <linearGradient id="wc-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4ec9b0" />
            <stop offset="100%" stopColor="#0e639c" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#wc-gradient)" />
        <path
          d="M17 17 L10 24 L17 31"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M31 17 L38 24 L31 31"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="31.5" r="2.6" fill="#ffffff" />
      </svg>
      {wordmark && (
        <span className="brand-name">
          Work<span className="brand-dot">.</span>Code
        </span>
      )}
    </div>
  );
}
