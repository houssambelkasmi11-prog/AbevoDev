"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ThemePref } from "@/lib/types";
import { updateSettings } from "@/server/actions/workspace";

interface ThemeCtx {
  pref: ThemePref;
  resolved: "light" | "dark";
  setPref: (p: ThemePref) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Remember where the user last pressed so the theme can bloom out from that point.
let lastPoint: { x: number; y: number } | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => (lastPoint = { x: e.clientX, y: e.clientY }), { capture: true, passive: true });
}

type VTDocument = { startViewTransition?: (cb: () => void) => { ready: Promise<unknown> } };

function apply(resolved: "light" | "dark", animate: boolean) {
  const root = document.documentElement;
  const flip = () => {
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!animate || reduced || root.classList.contains("dark") === (resolved === "dark")) {
    flip();
    return;
  }
  const doc = document as unknown as VTDocument;
  if (typeof doc.startViewTransition === "function") {
    // Circular reveal of the new theme from the click point.
    const { x, y } = lastPoint ?? { x: window.innerWidth - 48, y: 48 };
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    try {
      const vt = doc.startViewTransition(flip);
      vt.ready
        .then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
            { duration: 680, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
          );
        })
        .catch(() => undefined);
      return;
    } catch {
      /* fall through to the CSS cross-fade */
    }
  }
  root.classList.add("theme-transition");
  window.setTimeout(() => root.classList.remove("theme-transition"), 420);
  flip();
}

export function ThemeProvider({ initial, children }: { initial: ThemePref; children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(initial);
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Sync with server preference on mount (no animation → no flicker).
  useEffect(() => {
    const r = initial === "system" ? (systemDark() ? "dark" : "light") : initial;
    try {
      if (initial === "system") localStorage.removeItem("orbit-theme");
      else localStorage.setItem("orbit-theme", initial);
    } catch {
      /* storage unavailable */
    }
    setResolved(r);
    apply(r, false);
  }, [initial]);

  useEffect(() => {
    if (pref !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => {
      const r = mql.matches ? "dark" : "light";
      setResolved(r);
      apply(r, true);
    };
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    const r = p === "system" ? (systemDark() ? "dark" : "light") : p;
    setResolved(r);
    apply(r, true);
    try {
      if (p === "system") localStorage.removeItem("orbit-theme");
      else localStorage.setItem("orbit-theme", p);
    } catch {
      /* ignore */
    }
    void updateSettings({ theme: p });
  }, []);

  const toggle = useCallback(() => setPref(resolved === "dark" ? "light" : "dark"), [resolved, setPref]);

  return <Ctx.Provider value={{ pref, resolved, setPref, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme outside ThemeProvider");
  return c;
}
