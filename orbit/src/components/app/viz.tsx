import { cn } from "@/lib/utils";

/** Minimal monochrome sparkline. */
export function Sparkline({ values, className, height = 36, max }: { values: number[]; className?: string; height?: number; max?: number }) {
  const w = 120;
  const h = height;
  if (values.length === 0) return <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden />;
  const m = max ?? Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, h - 3 - (v / m) * (h - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("overflow-visible", className)} preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="currentColor" opacity="0.06" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill="currentColor" />
    </svg>
  );
}

/** Thin progress ring with an orbiting marker. */
export function Ring({ value, size = 64, stroke = 2, className, children }: { value: number; size?: number; stroke?: number; className?: string; children?: React.ReactNode }) {
  const r = (size - stroke * 2 - 4) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  const angle = v * 2 * Math.PI - Math.PI / 2;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 600ms var(--ease-orbit)" }}
        />
        <circle cx={size / 2 + Math.cos(angle) * r} cy={size / 2 + Math.sin(angle) * r} r={stroke + 1.2} fill="currentColor" />
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}

/** Vertical bars for small daily series. */
export function Bars({ values, labels, className, max }: { values: number[]; labels?: string[]; className?: string; max?: number }) {
  const m = max ?? Math.max(1, ...values);
  return (
    <div className={cn("flex items-end gap-1.5", className)}>
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-16 w-full items-end">
            <div className="w-full rounded-sm bg-ink transition-[height] duration-700" style={{ height: `${Math.max(2, (v / m) * 100)}%`, opacity: v ? 0.85 : 0.12 }} title={`${v}`} />
          </div>
          {labels ? <span className="font-mono text-[9px] text-ink-3">{labels[i]}</span> : null}
        </div>
      ))}
    </div>
  );
}
