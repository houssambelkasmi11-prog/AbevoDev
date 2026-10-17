/**
 * ⚠️  FILL THIS IN BEFORE LAUNCH — these details appear in the Terms, Privacy
 * Policy and Legal notice. Dutch law (art. 3:15d BW) requires a business
 * selling online to show its name, address, email and KvK number, plus a VAT
 * number once it charges VAT. Anything still in [brackets] shows on the site.
 *
 * Have a Dutch lawyer review the legal texts before you start charging money.
 */
export const LEGAL = {
  /** Your full legal name (eenmanszaak) or company name (e.g. "Orbit Labs B.V."). */
  operator: "[Your legal name or company name]",
  tradeName: "ORBIT",
  /** Street + number, postcode, city. A business address is fine. */
  address: "[Street and number, postcode, city], the Netherlands",
  /** Chamber of Commerce (KvK) registration number. */
  kvk: "[KvK number]",
  /** VAT (btw) identification number, once registered. */
  vat: "[VAT number]",
  /** A monitored address for legal, privacy and support requests. */
  email: "[contact email]",
  website: "https://orbit-lime-xi.vercel.app",
  /** Bump when the texts change materially; shown on each page and stored at sign-up. */
  version: "2026-10-17",
  updated: "2026-10-17",
};

export type LegalConfig = typeof LEGAL;

/** Replaces {{operator}}, {{email}} … in a legal text. */
export function fillLegal(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in LEGAL ? String(LEGAL[k as keyof LegalConfig]) : m));
}
