import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { getLegalDocs } from "@/lib/legal";
import { getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const doc = getLegalDocs(await getLocale()).terms;
  return { title: doc.title, description: doc.summary };
}

export default async function Page() {
  return <LegalPage kind="terms" locale={await getLocale()} />;
}
