"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll reveal for the public site: any element with `data-reveal` rises,
 * fades and de-blurs in once, the first time it enters the viewport.
 * Optional per-element delay via the `--reveal-delay` CSS variable (ms).
 * Content is only hidden once this script is running (html.reveal-ready),
 * so nothing disappears without JavaScript or with reduced motion.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove("reveal-ready");
      return;
    }
    (window as Window & { __orbitReveal?: boolean }).__orbitReveal = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.revealed = "";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((el) => io.observe(el));
    };
    scan();
    root.classList.add("reveal-ready");
    // Late content (dynamic imports, client-only sections) gets picked up too.
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
    // Safety net: never leave something hidden for long (e.g. printed / odd layouts).
    const t = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.dataset.revealed = "";
      });
    }, 2500);
    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, [pathname]);

  return null;
}
