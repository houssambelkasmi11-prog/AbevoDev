import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { LessonsLibrary } from "@/components/lessons/lessons-library";
import { getContext } from "@/lib/bootstrap";

export const metadata: Metadata = { title: "Lessons & Sources" };

export default async function LessonsPage() {
  const { repo, workspace } = await getContext();
  const [sources, subjects] = await Promise.all([
    repo.list("sources", { where: { workspace_id: workspace.id }, order: { column: "updated_at", ascending: false } }),
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
  ]);
  return (
    <PageContainer>
      <PageHeader
        index="04"
        label="Lesson vault"
        title="Lessons & Sources"
        description="Your central knowledge repository. Every source is extracted with page references and indexed so AI answers can cite it."
      />
      <div className="mt-10">
        <Suspense>
          <LessonsLibrary
            sources={sources.map((s) => ({
              id: s.id,
              title: s.title,
              kind: s.kind,
              status: s.status,
              status_detail: s.status_detail,
              progress: s.progress,
              subject_id: s.subject_id,
              collection: s.collection,
              pinned: s.pinned,
              size_bytes: s.size_bytes,
              page_count: s.page_count,
              updated_at: s.updated_at,
            }))}
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          />
        </Suspense>
      </div>
    </PageContainer>
  );
}
