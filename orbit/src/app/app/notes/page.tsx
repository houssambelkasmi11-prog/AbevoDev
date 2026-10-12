import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { NotesBrowser } from "@/components/notes/notes-browser";
import { getContext } from "@/lib/bootstrap";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage() {
  const { repo, workspace } = await getContext();
  const [notes, subjects] = await Promise.all([
    repo.list("notes", { where: { workspace_id: workspace.id }, order: { column: "updated_at", ascending: false } }),
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
  ]);
  return (
    <PageContainer wide>
      <PageHeader index="03" label="Intelligent notes" title="Notes" description="Write freely. Ask ORBIT to explain, simplify, connect or quiz you — it never overwrites your words without asking." />
      <div className="mt-10">
        <NotesBrowser
          notes={notes.map((n) => ({ id: n.id, title: n.title, plain: n.plain.slice(0, 2000), folder: n.folder, tags: n.tags, pinned: n.pinned, subject_id: n.subject_id, updated_at: n.updated_at, word_count: n.word_count }))}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </PageContainer>
  );
}
