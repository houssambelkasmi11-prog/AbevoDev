import type { Metadata } from "next";
import { FinalCTA, HowItWorks, SectionLabel } from "@/components/marketing/sections";

export const metadata: Metadata = { title: "How it works" };

const DEEP = [
  {
    t: "Ingestion",
    d: "Uploaded files are stored privately, then text is extracted page by page (PDF), section by section (DOCX), or from the page body (URLs). If extraction fails, ORBIT says so — it never invents content.",
  },
  {
    t: "Indexing",
    d: "Text is split into overlapping chunks that keep their page and heading. With an embedding provider connected, chunks are embedded for semantic search; otherwise ORBIT uses BM25 keyword ranking.",
  },
  {
    t: "Grounding",
    d: "When you ask about your material, the most relevant chunks inside your chosen scope are passed to the model as clearly delimited, untrusted reference text — with instructions to cite them and to admit when they don't contain the answer.",
  },
  {
    t: "Control",
    d: "AI output appears beside your work, never on top of it. Replacements require confirmation, suggested connections require approval, and nothing is sent to a provider without your action.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <HowItWorks standalone />
      <section className="bg-void px-5 pb-32 text-warm md:px-10">
        <div className="mx-auto max-w-[1400px] border-t border-white/10 pt-16">
          <SectionLabel index="C.2">Under the surface</SectionLabel>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            {DEEP.map((x, i) => (
              <div key={x.t} className="border-l border-white/10 pl-6">
                <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="display mt-3 text-[2rem]">{x.t}</h3>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-silver">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
