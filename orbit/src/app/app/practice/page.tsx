import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { PracticeLab } from "@/components/practice/practice-lab";
import { getContext } from "@/lib/bootstrap";

export const metadata: Metadata = { title: "Practice Lab" };

export default async function PracticePage() {
  const { repo, workspace } = await getContext();
  const [cards, quizzes, attempts, notes, sources, subjects, creds] = await Promise.all([
    repo.list("flashcards", { where: { workspace_id: workspace.id }, order: { column: "due_at" } }),
    repo.list("quizzes", { where: { workspace_id: workspace.id }, order: { column: "created_at", ascending: false } }),
    repo.list("quiz_attempts", { order: { column: "created_at" } }),
    repo.list("notes", { where: { workspace_id: workspace.id }, order: { column: "updated_at", ascending: false } }),
    repo.list("sources", { where: { workspace_id: workspace.id, status: "ready" }, order: { column: "updated_at", ascending: false } }),
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
    repo.count("credentials"),
  ]);
  const quizIds = new Set(quizzes.map((q) => q.id));
  return (
    <PageContainer>
      <PageHeader index="07" label="Practice lab" title="Practice" description="Active recall, spaced repetition and practice exams — generated from your own material, tracked honestly." />
      <div className="mt-8">
        <Suspense>
          <PracticeLab
            cards={cards}
            quizzes={quizzes}
            attempts={attempts.filter((a) => quizIds.has(a.quiz_id))}
            material={[
              ...notes.filter((n) => n.plain.trim()).map((n) => ({ id: n.id, title: n.title || "Untitled", type: "note" as const })),
              ...sources.map((s) => ({ id: s.id, title: s.title, type: "source" as const, meta: s.page_count ? `${s.page_count}p` : undefined })),
            ]}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
            hasProvider={creds > 0}
          />
        </Suspense>
      </div>
    </PageContainer>
  );
}
