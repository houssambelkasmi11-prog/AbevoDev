import type { Locale } from "../locales";
import { ar } from "./ar";
import { de } from "./de";
import { en, type Dict } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { nl } from "./nl";

const DICTS: Record<Locale, Dict> = { en, nl, fr, de, es, ar };

export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? en;
}
export type { Dict };
