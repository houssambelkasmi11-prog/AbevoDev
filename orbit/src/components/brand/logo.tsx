import { cn } from "@/lib/utils";

/**
 * The ORBIT emblem: two engineered elliptical paths crossing at ±32° around a
 * single core. Built on a 32-unit grid so it stays crisp at favicon size.
 */
export function OrbitSymbol({ className, strokeWidth = 1.6, title }: { className?: string; strokeWidth?: number; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
        <ellipse cx="16" cy="16" rx="13" ry="5.4" transform="rotate(32 16 16)" />
        <ellipse cx="16" cy="16" rx="13" ry="5.4" transform="rotate(-32 16 16)" />
      </g>
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <OrbitSymbol className="h-6 w-6" />
      <span className="font-display text-[15px] font-bold tracking-[0.32em]">ORBIT</span>
    </span>
  );
}

/** The Learning Pulse — ORBIT's processing indicator. */
export function OrbitPulse({ className, label = "Working" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn("orbit-pulse inline-flex items-center", className)}>
      <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="1.6">
          <ellipse className="ring-a" cx="16" cy="16" rx="13" ry="5.4" transform="rotate(32 16 16)" opacity="0.9" />
          <ellipse className="ring-b" cx="16" cy="16" rx="13" ry="5.4" transform="rotate(-32 16 16)" opacity="0.45" />
        </g>
        <circle className="core" cx="16" cy="16" r="2.6" fill="currentColor" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Monochrome persona/subject glyphs: six orbital configurations, one per index.
 */
export function OrbitGlyph({ variant, className }: { variant: number; className?: string }) {
  const v = ((variant % 6) + 6) % 6;
  return (
    <svg viewBox="0 0 48 48" className={cn("shrink-0", className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        {v === 0 && (
          <>
            <circle cx="24" cy="24" r="18" />
            <circle cx="24" cy="24" r="11" opacity="0.5" />
            <circle cx="24" cy="6" r="2" fill="currentColor" />
          </>
        )}
        {v === 1 && (
          <>
            <ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(-20 24 24)" />
            <ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(40 24 24)" opacity="0.5" />
            <ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(100 24 24)" opacity="0.3" />
          </>
        )}
        {v === 2 && (
          <>
            <rect x="9" y="9" width="30" height="30" transform="rotate(45 24 24)" />
            <rect x="15" y="15" width="18" height="18" opacity="0.5" />
            <line x1="4" y1="24" x2="44" y2="24" opacity="0.35" />
          </>
        )}
        {v === 3 && (
          <>
            <circle cx="24" cy="24" r="18" strokeDasharray="2 3" />
            <path d="M24 6 L24 42 M6 24 L42 24" opacity="0.4" />
            <circle cx="24" cy="24" r="7" />
          </>
        )}
        {v === 4 && (
          <>
            <circle cx="24" cy="24" r="18" />
            <circle cx="24" cy="24" r="13" />
            <circle cx="24" cy="24" r="8" />
            <circle cx="24" cy="24" r="3" />
          </>
        )}
        {v === 5 && (
          <>
            <path d="M6 30 L16 30 L20 14 L26 38 L31 22 L34 30 L42 30" />
            <circle cx="24" cy="24" r="20" opacity="0.25" />
          </>
        )}
      </g>
      <circle cx="24" cy="24" r="2" fill="currentColor" />
    </svg>
  );
}
