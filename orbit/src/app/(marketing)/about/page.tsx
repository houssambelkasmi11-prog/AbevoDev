import type { Metadata } from "next";
import { FinalCTA, PageIntro, SectionLabel } from "@/components/marketing/sections";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PageIntro
        index="—"
        label="About ORBIT"
        title="Not another chatbot."
        accent="A place for thinking."
        body="ORBIT exists because learning is more than getting answers. It's building a connected understanding of the world — and AI should strengthen that process, not replace it."
      />
      <section className="bg-void px-5 pb-32 text-warm md:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-16 border-t border-white/10 pt-16 md:grid-cols-3">
          <div>
            <SectionLabel index="01">Principles</SectionLabel>
            <ul className="mt-8 space-y-6 text-[15px] leading-relaxed text-silver">
              <li><span className="text-warm">Students stay in control.</span> AI suggestions, drafts and your own work are always visibly distinct.</li>
              <li><span className="text-warm">Grounded, not guessed.</span> Answers about your material cite it — or say they can&apos;t.</li>
              <li><span className="text-warm">No fake intelligence.</span> If a provider isn&apos;t connected, ORBIT tells you instead of pretending.</li>
            </ul>
          </div>
          <div id="privacy">
            <SectionLabel index="02">Privacy</SectionLabel>
            <p className="mt-8 text-[15px] leading-relaxed text-silver">
              Your notes, sources and conversations belong to your account alone. In hosted mode, Postgres row-level security enforces this at the database. Documents are only sent to an AI provider when you start an action that needs them, and you can delete your data at any time from Settings.
            </p>
          </div>
          <div id="security">
            <SectionLabel index="03">Security</SectionLabel>
            <p className="mt-8 text-[15px] leading-relaxed text-silver">
              Provider keys are encrypted server-side with AES-256-GCM, bound to your account, never logged and never returned to the browser. Retrieved document text is treated as untrusted input and cannot override assistant instructions.
            </p>
          </div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
