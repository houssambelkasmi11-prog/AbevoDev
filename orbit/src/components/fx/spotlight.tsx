"use client";

import { useEffect } from "react";

/**
 * One delegated pointer listener for the whole app: any element marked
 * `data-spotlight` gets `--mx`/`--my` CSS variables so its sheen/border glow
 * follows the cursor (see `.fx-spot` in globals.css). Writes are batched into
 * a single animation frame, so it costs nothing when idle.
 */
export function Spotlight() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let target: HTMLElement | null = null;
    let x = 0;
    let y = 0;
    const flush = () => {
      raf = 0;
      if (!target) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${x - r.left}px`);
      target.style.setProperty("--my", `${y - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-spotlight]") ?? null;
      if (el !== target) {
        target?.removeAttribute("data-spot-active");
        target = el;
        target?.setAttribute("data-spot-active", "");
      }
      x = e.clientX;
      y = e.clientY;
      if (target && !raf) raf = requestAnimationFrame(flush);
    };
    const onLeave = () => {
      target?.removeAttribute("data-spot-active");
      target = null;
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return null;
}
