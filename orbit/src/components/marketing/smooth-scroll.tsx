"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/client/gsap";
import { usePrefersReducedMotion } from "@/lib/client/hooks";

let current: Lenis | null = null;

export function getLenis(): Lenis | null {
  return current;
}

/** Scrolls to an in-page anchor, through Lenis when active. */
export function scrollToHash(hash: string): boolean {
  const el = document.querySelector<HTMLElement>(hash);
  if (!el) return false;
  if (current) current.scrollTo(el, { offset: -24 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Move focus for keyboard and screen-reader users.
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
  return true;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.95 });
    current = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      current = null;
    };
  }, [reduced]);

  return <>{children}</>;
}
