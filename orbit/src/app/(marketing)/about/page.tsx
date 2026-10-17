import type { Metadata } from "next";
import { FinalCTA, PageIntro, SectionLabel } from "@/components/marketing/sections";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).pages.about.label };
}

export default async function AboutPage() {
  const a = (await getT()).pages.about;
  return (
    <>
      <PageIntro
        index="—"
        label={a.label}
        title={a.title}
        accent={a.accent}
        body={a.body}
      />
      <section className="bg-void px-5 pb-32 text-warm md:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-16 border-t border-white/10 pt-16 md:grid-cols-3">
          <div>
            <SectionLabel index="01">{a.principles}</SectionLabel>
            <ul className="mt-8 space-y-6 text-[15px] leading-relaxed text-silver">
              {a.p.map(([h, d]) => (
                <li key={h}>
                  <span className="text-warm">{h}</span> {d}
                </li>
              ))}
            </ul>
          </div>
          <div id="privacy">
            <SectionLabel index="02">{a.privacy}</SectionLabel>
            <p className="mt-8 text-[15px] leading-relaxed text-silver">
              {a.privacyText}{" "}
              <a href="/privacy" className="text-warm underline underline-offset-4">→</a>
            </p>
          </div>
          <div id="security">
            <SectionLabel index="03">{a.security}</SectionLabel>
            <p className="mt-8 text-[15px] leading-relaxed text-silver">
              {a.securityText}
            </p>
          </div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
