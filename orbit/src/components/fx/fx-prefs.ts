"use client";

import { useEffect, useState } from "react";

/** Visual effects level: full shader + motion, a lighter shader, or none. */
export type FxLevel = "full" | "lite" | "off";

const KEY = "orbit-fx";
const EVENT = "orbit-fx-change";

export function readFx(): FxLevel {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "full" || v === "lite" || v === "off") return v;
  } catch {
    /* storage unavailable */
  }
  // Default: lighter rendering on low-power devices.
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 8 : 8;
  const mem = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8 : 8;
  return cores <= 4 || mem <= 4 ? "lite" : "full";
}

export function writeFx(level: FxLevel) {
  try {
    localStorage.setItem(KEY, level);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: level }));
}

export function useFxLevel(): FxLevel | null {
  const [level, setLevel] = useState<FxLevel | null>(null);
  useEffect(() => {
    setLevel(readFx());
    const on = () => setLevel(readFx());
    window.addEventListener(EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  return level;
}
