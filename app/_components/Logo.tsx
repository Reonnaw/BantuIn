export function BantuInMark({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
      <g fill="currentColor">
        <rect x="4.6" y="6.3" width="1.7" height="1.7" />
        <rect x="6.2" y="6.3" width="1.7" height="1.7" />
        <rect x="7.8" y="6.3" width="1.7" height="1.7" />
        <rect x="9.4" y="6.3" width="1.7" height="1.7" />
        <rect x="4.6" y="7.9" width="1.7" height="1.7" />
        <rect x="11.0" y="7.9" width="1.7" height="1.7" />
        <rect x="4.6" y="9.5" width="1.7" height="1.7" />
        <rect x="11.0" y="9.5" width="1.7" height="1.7" />
        <rect x="4.6" y="11.1" width="1.7" height="1.7" />
        <rect x="6.2" y="11.1" width="1.7" height="1.7" />
        <rect x="7.8" y="11.1" width="1.7" height="1.7" />
        <rect x="9.4" y="11.1" width="1.7" height="1.7" />
        <rect x="4.6" y="12.7" width="1.7" height="1.7" />
        <rect x="11.0" y="12.7" width="1.7" height="1.7" />
        <rect x="4.6" y="14.3" width="1.7" height="1.7" />
        <rect x="11.0" y="14.3" width="1.7" height="1.7" />
        <rect x="4.6" y="15.9" width="1.7" height="1.7" />
        <rect x="6.2" y="15.9" width="1.7" height="1.7" />
        <rect x="7.8" y="15.9" width="1.7" height="1.7" />
        <rect x="9.4" y="15.9" width="1.7" height="1.7" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M 15.29 9.21 A 3.8 3.8 0 0 1 15.29 14.59" />
        <path d="M 16.84 7.66 A 6 6 0 0 1 16.84 16.14" />
      </g>
    </svg>
  );
}

export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-lg border-2 border-neutral-900 bg-blue-500 shadow-[3px_3px_0_0_#171717] dark:border-neutral-100 dark:shadow-[3px_3px_0_0_#f5f5f5]"
    >
      <BantuInMark className="text-white" style={{ width: size * 0.8, height: size * 0.8 }} />
    </div>
  );
}

export function LogoLockup({
  size = 44,
  tagline,
}: {
  size?: number;
  tagline?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      <div>
        <p className="font-pixel text-xl leading-none tracking-tight text-neutral-900 dark:text-neutral-50">
          Bantu<span className="text-blue-600 dark:text-blue-400">In</span>
        </p>
        {tagline && (
          <p className="mt-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
