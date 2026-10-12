import type { Metadata } from "next";
import { FeatureStage, FinalCTA, PageIntro } from "@/components/marketing/sections";

export const metadata: Metadata = { title: "Features" };

const MORE = [
  ["Practice Lab", "Flashcards with spaced repetition, multiple-choice, short and open questions, practice exams — each question links back to its source."],
  ["Focus Mode", "A full-screen timer with an orbital progress ring, custom intervals, daily goals, ambient sound and a summary of what you finished."],
  ["Calendar", "Deadlines, planned study sessions and focus history in one place — with AI-proposed plans you approve before they're saved."],
  ["Command palette", "⌘K / Ctrl K to search every note, lesson, conversation and assignment, and to launch any action."],
  ["Source-grounded chat", "Restrict a conversation to a course, folder or document. Answers cite page references and say plainly when your sources don't cover it."],
  ["Private by design", "Row-level security, encrypted provider keys and nothing sent to an AI provider unless you start the action."],
];

export default function FeaturesPage() {
  return (
    <>
      <PageIntro
        index="—"
        label="Features"
        title="Everything you learn."
        accent="One system."
        body="ORBIT brings your notes, sources, AI tutors and study tools into a single, connected workspace — built to make understanding faster and work more honest."
      />
      <FeatureStage />
      <section className="bg-void px-5 pb-32 text-warm md:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
          {MORE.map(([t, d], i) => (
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
