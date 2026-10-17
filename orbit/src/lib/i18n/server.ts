import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDict } from "./dict";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./locales";

/** Visitor's language: English unless they explicitly picked another one (cookie). */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(chosen) ? chosen : DEFAULT_LOCALE;
});

export async function getT() {
  return getDict(await getLocale());
}
