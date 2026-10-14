"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A thin luminous progress line at the top of the viewport. Starts the moment
 * an internal link is clicked (before the server responds) and completes when
 * the new route has rendered — navigation always feels acknowledged.
 */
export function RouteProgress() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const search = useSearchParams();
  const state = useRef<{ running: boolean; value: number; timer: number | null }>({ running: false, value: 0, timer: null });

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const s = state.current;

    const set = (v: number) => {
      s.value = v;
      el.style.transform = `scaleX(${v})`;
    };

    const start = () => {
      if (s.running) return;
      s.running = true;
      el.style.transition = "none";
      el.style.opacity = "1";
      set(0.02);
      void el.offsetWidth;
      el.style.transition = "transform 420ms cubic-bezier(0.16,1,0.3,1), opacity 300ms ease";
      const trickle = () => {
        // Ease toward 90% — never "finishes" until the route actually arrives.
        set(s.value + (0.9 - s.value) * 0.18);
        s.timer = window.setTimeout(trickle, 260);
      };
      trickle();
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(href, location.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };

    const onStart = () => start();
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("orbit:navigate", onStart);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("orbit:navigate", onStart);
      if (s.timer) window.clearTimeout(s.timer);
    };
  }, []);

  // Route arrived → complete and fade.
  useEffect(() => {
    const el = bar.current;
    const s = state.current;
    if (!el || !s.running) return;
    if (s.timer) window.clearTimeout(s.timer);
    s.timer = null;
    s.running = false;
    el.style.transform = "scaleX(1)";
    const t = window.setTimeout(() => {
      el.style.opacity = "0";
    }, 220);
    return () => window.clearTimeout(t);
  }, [pathname, search]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px]">
      <div ref={bar} className="fx-progress h-full origin-left opacity-0" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}

/** Lets programmatic navigations (router.push) light up the progress line too. */
export function signalNavigation() {
  window.dispatchEvent(new Event("orbit:navigate"));
}
