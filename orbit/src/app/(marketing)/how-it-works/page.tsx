import type { Metadata } from "next";
import { FinalCTA, HowItWorks, SectionLabel } from "@/components/marketing/sections";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).nav.how };
}


export default async function HowItWorksPage() {
  const h = (await getT()).pages.how;
  return (
    <>
      <HowItWorks standalone />
      <section className="bg-void px-5 pb-32 text-warm md:px-10">
        <div className="mx-auto max-w-[1400px] border-t border-white/10 pt-16">
          <SectionLabel index="C.2">{h.deepLabel}</SectionLabel>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {h.deep.map(([xt, xd], i) => (
              <div key={xt} className="border-l border-white/10 pl-6">
                <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="display mt-3 text-[2rem]">{xt}</h3>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-silver">{xd}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
