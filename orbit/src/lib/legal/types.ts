export interface LegalSection {
  id: string;
  h: string;
  /** Paragraphs. A paragraph starting with "• " renders as a bullet. */
  body: string[];
}
export interface LegalDoc {
  title: string;
  summary: string;
  sections: LegalSection[];
}
export interface LegalDocs {
  terms: LegalDoc;
  privacy: LegalDoc;
  cookies: LegalDoc;
  imprint: LegalDoc;
}
export type LegalKind = keyof LegalDocs;
