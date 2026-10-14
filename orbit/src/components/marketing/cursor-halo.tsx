"use client";

import { useEffect, useRef } from "react";
import { useMediaQuery, usePrefersReducedMotion } from "@/lib/client/hooks";

/**
 * The Connection Cursor — a quiet halo that trails the native pointer and
 * expands over interactive elements. The system cursor stays visible.
 */
export function CursorHalo() {
  const fine = useMediaQuery("(pointer: fine)");
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fine || reduced) return;
    const el = ref.current;
    if (!el) return;
    let x = -100;
    let y = -100;
    let tx = -100;
    let ty = -100;
    let scale = 1;
    let target = 1;
    let raf = 0;
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      kick();
      tx = e.clientX;
      ty = e.clientY;
      const t = e.target as HTMLElement | null;
      target = t?.closest("a,button,[role=button],input,textarea,select,[data-cursor]") ? 2.2 : 1;
    };
    const onLeave = () => {
      tx = -100;
      ty = -100;
      kick();
    };
    const loop = () => {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      scale += (target - scale) * 0.14;
      el.style.transform = `translate3d(${x - 14}px, ${y - 14}px, 0) scale(${scale.toFixed(3)})`;
      // Sleep once settled — no per-frame work while the pointer is still.
      raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(target - scale) < 0.05 ? 0 : requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [fine, reduced]);

  if (!fine || reduced) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] h-7 w-7 rounded-full border border-white/35 mix-blend-difference"
      style={{ transform: "translate3d(-100px,-100px,0)" }}
    />
  );
}
