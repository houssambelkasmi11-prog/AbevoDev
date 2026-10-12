import { cn } from "@/lib/utils";

/** Hand-drawn orbital map used by every empty state. */
export function EmptyOrbitMap({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" className={cn("text-ink", className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="0.8">
        <ellipse cx="120" cy="80" rx="100" ry="40" opacity="0.18" strokeDasharray="2 4" />
        <ellipse cx="120" cy="80" rx="70" ry="28" opacity="0.28" />
        <ellipse cx="120" cy="80" rx="38" ry="15" opacity="0.4" />
        <line x1="10" y1="80" x2="230" y2="80" opacity="0.08" />
        <line x1="120" y1="20" x2="120" y2="140" opacity="0.08" />
      </g>
      <circle cx="120" cy="80" r="3.5" fill="currentColor" />
      <circle cx="190" cy="80" r="2" fill="currentColor" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="0 120 80" to="360 120 80" dur="28s" repeatCount="indefinite" />
      </circle>
      <text x="124" y="72" fontFamily="var(--font-mono)" fontSize="6" fill="currentColor" opacity="0.45" letterSpacing="1">
        00 / ORIGIN
      </text>
    </svg>
  );
}

export function EmptyState({
  title = "Every universe begins with a single idea.",
  body,
  action,
  className,
  compact,
}: {
  title?: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-8" : "py-16", className)}>
      <EmptyOrbitMap className={compact ? "h-20 w-32" : "h-32 w-48"} />
      <h3 className={cn("mt-5 font-display font-bold tracking-tight text-ink", compact ? "text-base" : "text-xl")}>{title}</h3>
      {body ? <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-2">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
