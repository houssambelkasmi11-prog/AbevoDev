import type { Locale } from "@/lib/i18n/locales";
import { ar } from "./ar";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { nl } from "./nl";
import type { LegalDocs } from "./types";

const DOCS: Record<Locale, LegalDocs> = { en, nl, fr, de, es, ar };

export function getLegalDocs(locale: Locale): LegalDocs {
  return DOCS[locale] ?? en;
}
