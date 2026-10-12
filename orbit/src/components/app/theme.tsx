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

function apply(resolved: "light" | "dark", animate: boolean) {
  const root = document.documentElement;
  if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 420);
  }
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
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
