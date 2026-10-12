import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { HomeworkList } from "@/components/homework/homework-list";
import { getContext } from "@/lib/bootstrap";

export const metadata: Metadata = { title: "Homework Studio" };

export default async function HomeworkPage() {
  const { repo, workspace } = await getContext();
  const [assignments, steps, subjects] = await Promise.all([
    repo.list("assignments", { where: { workspace_id: workspace.id }, order: { column: "updated_at", ascending: false } }),
    repo.list("assignment_steps"),
    repo.list("subjects", { where: { workspace_id: workspace.id } }),
  ]);
  return (
    <PageContainer>
      <PageHeader
        index="06"
        label="Homework studio"
        title="Homework Studio"
        description="Turn any assignment into requirements, sources, a plan and a reviewed answer. Your work and AI suggestions always stay visibly separate — and ORBIT never submits anything for you."
      />
      <div className="mt-8">
        <HomeworkList
          assignments={assignments.map((a) => {
            const s = steps.filter((x) => x.assignment_id === a.id);
            return { id: a.id, title: a.title, status: a.status, due_at: a.due_at, mode: a.mode, stages: a.stages, updated_at: a.updated_at, subject_id: a.subject_id, stepsDone: s.filter((x) => x.done).length, stepsTotal: s.length };
          })}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </PageContainer>
  );
}
