import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-3 transition-colors focus:border-ink focus:outline-none disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(base, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(base, "min-h-[96px] py-2.5 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <span className={cn("relative block", className)}>
      <select ref={ref} className={cn(base, "h-10 appearance-none pr-9")} {...props}>
        {children}
      </select>
      <svg viewBox="0 0 10 6" aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-1.5 w-2.5 -translate-y-1/2 text-ink-2">
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </span>
  );
});

export function Label({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("label mb-1.5 block text-ink-2", className)}>
      {children}
    </label>
  );
}

export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">{hint}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "solid" | "ok" | "danger" | "ai" | "student"; className?: string }) {
  const tones = {
    neutral: "border-line text-ink-2",
    solid: "border-transparent bg-accent text-accent-ink",
    ok: "border-transparent bg-[color-mix(in_oklab,var(--ok)_15%,transparent)] text-ok",
    danger: "border-transparent bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger",
    ai: "border-dashed border-line-strong text-ink-2",
    student: "border-ink text-ink",
  } as const;
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-full border px-2 font-mono text-[9.5px] uppercase tracking-[0.14em]", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-soft px-1 font-mono text-[10px] text-ink-2">
      {children}
    </kbd>
  );
}
