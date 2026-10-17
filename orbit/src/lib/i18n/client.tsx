"use client";

import { createContext, useContext } from "react";
import type { Dict } from "./dict/en";
import { en } from "./dict/en";
import type { Locale } from "./locales";

const Ctx = createContext<{ locale: Locale; t: Dict }>({ locale: "en", t: en });

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, t: dict }}>{children}</Ctx.Provider>;
}

/** `const { t, locale } = useI18n()` — strings for the visitor's language. */
export function useI18n() {
  return useContext(Ctx);
}
