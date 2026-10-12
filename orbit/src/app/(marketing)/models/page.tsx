import type { Metadata } from "next";
import { ChooseIntelligence, FinalCTA, SectionLabel } from "@/components/marketing/sections";
import { PROVIDER_FACTS } from "@/lib/ai/provider-facts";

export const metadata: Metadata = { title: "AI Models" };

export default function ModelsPage() {
  return (
    <>
      <ChooseIntelligence standalone />
      <section className="bg-void px-5 pb-32 text-warm md:px-10">
        <div className="mx-auto max-w-[1400px] border-t border-white/10 pt-16">
          <SectionLabel index="D.2">Provider reference</SectionLabel>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-white/10">
                  {["Provider", "Streaming chat", "Vision", "Embeddings in ORBIT", "Notes"].map((h) => (
                    <th key={h} scope="col" className="label px-5 py-4 font-normal text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROVIDER_FACTS.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <th scope="row" className="px-5 py-5 font-display text-[17px] font-bold">
                      {p.name}
                    </th>
                    <td className="px-5 py-5 text-silver">{p.chat ? "Yes" : "No"}</td>
                    <td className="px-5 py-5 text-silver">{p.vision}</td>
                    <td className="px-5 py-5 text-silver">{p.embeddings}</td>
                    <td className="px-5 py-5 text-[13px] text-muted">{p.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              ["Your keys, encrypted", "API keys are encrypted with AES-256-GCM on the server and only ever shown masked. Replace, revoke or delete them at any time."],
              ["Live model lists", "ORBIT asks each provider which models your key can use — no hard-coded catalogues that go stale."],
              ["Honest pricing", "Request-cost estimates appear only when the provider publishes machine-readable prices (e.g. OpenRouter)."],
            ].map(([t, d]) => (
              <div key={t}>
                <h3 className="display text-[1.6rem]">{t}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-silver">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
