import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NoteEditor, type NoteLink } from "@/components/notes/note-editor";
import { getContext } from "@/lib/bootstrap";
import { loadEntityIndex } from "@/lib/entities";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { repo } = await getContext();
  const note = await repo.get("notes", id);
  return { title: note?.title || "Note" };
}

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { repo, workspace, settings } = await getContext();
  const note = await repo.get("notes", id);
  if (!note || note.workspace_id !== workspace.id) notFound();

  const [subjects, notes, personas, outEdges, inEdges, index] = await Promise.all([
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
    repo.list("notes", { where: { workspace_id: workspace.id } }),
    repo.list("personas", { order: { column: "created_at" } }),
    repo.list("graph_edges", { where: { from_id: id } }),
    repo.list("graph_edges", { where: { to_id: id } }),
    loadEntityIndex(repo, workspace.id),
  ]);

  const links: NoteLink[] = [
    ...outEdges.filter((e) => e.status === "approved").map((e) => ({ e, dir: "out" as const, other: e.to_id })),
    ...inEdges.filter((e) => e.status === "approved").map((e) => ({ e, dir: "in" as const, other: e.from_id })),
  ]
    .map(({ e, dir, other }) => {
      const ref = index.get(other);
      return ref
        ? { edgeId: e.id, direction: dir, kind: e.kind, type: ref.type, id: ref.id, title: ref.title, href: ref.href, origin: e.origin }
        : null;
    })
    .filter((x): x is NoteLink => x !== null);

  const folders = [...new Set(notes.map((n) => n.folder).filter((f): f is string => !!f))].sort();

  return (
    <NoteEditor
      key={note.id}
      note={note}
      subjects={subjects}
      folders={folders}
      personas={personas.map((p) => ({ id: p.id, name: p.name, role: p.role, glyph: p.glyph }))}
      defaultPersonaId={settings.default_persona_id}
      links={links}
      linkables={[...index.values()].map((r) => ({ type: r.type, id: r.id, title: r.title }))}
    />
  );
}
