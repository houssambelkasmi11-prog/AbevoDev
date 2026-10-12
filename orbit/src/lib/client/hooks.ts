"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  };
}

export function useMediaQuery(query: string, serverFallback = false): boolean {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subscribe = useCallback(subscribeMedia(query), [query]);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  const fnRef = useRef(fn);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return {
    run: (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    flush: (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      fnRef.current(...args);
    },
    cancel: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    },
  };
}

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Global keyboard shortcut helper (ignores typing contexts unless `allowInInputs`). */
export function useHotkey(combo: { key: string; mod?: boolean; shift?: boolean }, handler: (e: KeyboardEvent) => void, allowInInputs = false) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  }, [handler]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!!combo.mod !== mod) return;
      if (!!combo.shift !== e.shiftKey) return;
      if (e.key.toLowerCase() !== combo.key.toLowerCase()) return;
      const t = e.target as HTMLElement | null;
      const typing = t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
      if (typing && !allowInInputs && !combo.mod) return;
      ref.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo.key, combo.mod, combo.shift, allowInInputs]);
}
