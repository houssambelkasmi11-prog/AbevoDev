import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getDict } from "./dict";
import { isLocale, LOCALE_COOKIE, matchLocale, type Locale } from "./locales";

/** Visitor's language: explicit choice (cookie) → browser preference → English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  return matchLocale((await headers()).get("accept-language"));
});

export async function getT() {
  return getDict(await getLocale());
}
