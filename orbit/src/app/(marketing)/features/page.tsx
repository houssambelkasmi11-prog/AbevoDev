import type { Metadata } from "next";
import { FeatureStage, FinalCTA, PageIntro } from "@/components/marketing/sections";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pages.features.label };
}


export default async function FeaturesPage() {
  const f = (await getT()).pages.features;
  return (
    <>
      <PageIntro
        index="—"
        label={f.label}
        title={f.title}
        accent={f.accent}
        body={f.body}
      />
      <FeatureStage />
      <section className="bg-void px-5 pb-32 text-warm md:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
          {f.more.map(([t, d], i) => (
            <div key={t} className="bg-void p-8">
              <span className="font-mono text-[11px] text-muted">{String(i + 7).padStart(2, "0")}</span>
              <h3 className="display mt-6 text-[1.9rem]">{t}</h3>
              <p className="mt-4 text-[14.5px] leading-relaxed text-silver">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
