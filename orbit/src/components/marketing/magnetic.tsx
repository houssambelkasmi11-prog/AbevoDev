"use client";

import { useRef } from "react";
import { gsap } from "@/lib/client/gsap";

/** Subtle magnetic pull for primary calls to action (fine pointers only). */
export function Magnetic({ children, strength = 0.28, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    gsap.to(ref.current, { x, y, duration: 0.5, ease: "power3.out" });
  };
  const onLeave = () => {
    if (ref.current) gsap.to(ref.current, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
  };

  return (
    <span ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={className ?? "inline-block"}>
      {children}
    </span>
  );
}
