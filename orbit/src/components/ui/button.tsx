"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { OrbitPulse } from "@/components/brand/logo";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:opacity-90 shadow-soft",
  secondary: "bg-soft text-ink hover:bg-line",
  outline: "border border-line-strong bg-transparent text-ink hover:bg-soft",
  ghost: "bg-transparent text-ink-2 hover:bg-soft hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-xl",
  icon: "h-9 w-9 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,opacity,transform,color] duration-200 active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <OrbitPulse className="h-4 w-4" /> : null}
      {children}
    </button>
  );
});
