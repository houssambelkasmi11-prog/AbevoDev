import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeworkStudio } from "@/components/homework/homework-studio";
import { getContext } from "@/lib/bootstrap";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { repo } = await getContext();
  const a = await repo.get("assignments", id);
  return { title: a?.title ?? "Assignment" };
}

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo, workspace } = await getContext();
  const a = await repo.get("assignments", id);
  if (!a || a.workspace_id !== workspace.id) notFound();
  const [steps, subjects, sources, notes, creds] = await Promise.all([
    repo.list("assignment_steps", { where: { assignment_id: id }, order: { column: "ord" } }),
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
    repo.list("sources", { where: { workspace_id: workspace.id }, order: { column: "updated_at", ascending: false } }),
    repo.list("notes", { where: { workspace_id: workspace.id }, order: { column: "updated_at", ascending: false } }),
    repo.count("credentials"),
  ]);
  return (
    <HomeworkStudio
      key={a.id}
      assignment={a}
      steps={steps}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
      attachments={sources.filter((s) => a.attachment_source_ids.includes(s.id)).map((s) => ({ id: s.id, title: s.title, kind: s.kind, status: s.status }))}
      library={[
        ...sources.filter((s) => s.status === "ready").map((s) => ({ id: s.id, title: s.title, type: "source" as const })),
        ...notes.map((n) => ({ id: n.id, title: n.title || "Untitled", type: "note" as const })),
      ]}
      hasProvider={creds > 0}
    />
  );
}
