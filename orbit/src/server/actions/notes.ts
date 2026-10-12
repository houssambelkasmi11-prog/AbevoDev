"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/bootstrap";
import type { EdgeKind, EntityType, GraphEdgeRow, NoteRow } from "@/lib/types";
import { stripHtml } from "@/lib/utils";
import { run, type ActionResult } from "../result";

const MAX_HTML = 1_500_000;

export async function createNote(input: { title?: string; subject_id?: string | null; folder?: string | null; content?: string }): Promise<ActionResult<NoteRow>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const content = (input.content ?? "").slice(0, MAX_HTML);
    const plain = stripHtml(content);
    const note = await repo.insert("notes", {
      workspace_id: workspace.id,
      title: (input.title ?? "Untitled").slice(0, 200),
      subject_id: input.subject_id ?? null,
      folder: input.folder ?? null,
      content,
      plain,
      word_count: plain ? plain.split(/\s+/).length : 0,
    });
    revalidatePath("/app/notes");
    return note;
  });
}

const saveSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(MAX_HTML).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  folder: z.string().trim().max(80).nullable().optional(),
  subject_id: z.string().nullable().optional(),
  pinned: z.boolean().optional(),
});

export async function saveNote(id: string, input: z.infer<typeof saveSchema>): Promise<ActionResult<{ updated_at: string }>> {
  return run(async () => {
    const { repo } = await getContext();
    const data = saveSchema.parse(input);
    const patch: Partial<NoteRow> = { ...data };
    if (data.content !== undefined) {
      const plain = stripHtml(data.content);
      patch.plain = plain;
      patch.word_count = plain ? plain.split(/\s+/).length : 0;
    }
    if (data.title !== undefined) patch.title = data.title.trim() || "Untitled";
    if (data.subject_id) {
      const s = await repo.get("subjects", data.subject_id);
      if (!s) throw new Error("Subject not found");
    }
    const row = await repo.update("notes", id, patch);
    return { updated_at: row.updated_at };
  });
}

export interface NoteSnapshot {
  note: NoteRow;
  edges: GraphEdgeRow[];
}

export async function deleteNote(id: string): Promise<ActionResult<NoteSnapshot>> {
  return run(async () => {
    const { repo } = await getContext();
    const note = await repo.get("notes", id);
    if (!note) throw new Error("Note not found");
    const [from, to] = await Promise.all([repo.list("graph_edges", { where: { from_id: id } }), repo.list("graph_edges", { where: { to_id: id } })]);
    const edges = [...from, ...to];
    for (const e of edges) await repo.remove("graph_edges", e.id);
    await repo.removeWhere("graph_nodes", { entity_id: id });
    await repo.remove("notes", id);
    revalidatePath("/app/notes");
    return { note, edges };
  });
}

/** Undo for deleteNote — re-inserts the exact snapshot. */
export async function restoreNote(snapshot: NoteSnapshot): Promise<ActionResult<NoteRow>> {
  return run(async () => {
    const { repo } = await getContext();
    const { id, user_id: _u, created_at: _c, updated_at: _up, ...rest } = snapshot.note;
    void _u;
    void _c;
    void _up;
    const note = await repo.insert("notes", { ...rest, id });
    for (const e of snapshot.edges) {
      const { id: eid, user_id: _eu, created_at: _ec, updated_at: _eup, ...er } = e;
      void _eu;
      void _ec;
      void _eup;
      await repo.insert("graph_edges", { ...er, id: eid });
    }
    revalidatePath("/app/notes");
    return note;
  });
}

const entityTypes = ["subject", "note", "source", "conversation", "assignment", "concept"] as const;
const edgeKinds = ["belongs_to", "references", "builds_upon", "related", "prerequisite"] as const;

export async function linkEntities(input: {
  from_type: EntityType;
  from_id: string;
  to_type: EntityType;
  to_id: string;
  kind: EdgeKind;
}): Promise<ActionResult<GraphEdgeRow>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const data = z
      .object({
        from_type: z.enum(entityTypes),
        from_id: z.string().min(1),
        to_type: z.enum(entityTypes),
        to_id: z.string().min(1),
        kind: z.enum(edgeKinds),
      })
      .parse(input);
    if (data.from_id === data.to_id) throw new Error("An item can't link to itself.");
    const existing = (await repo.list("graph_edges", { where: { from_id: data.from_id, to_id: data.to_id } })).find((e) => e.status !== "rejected");
    if (existing) {
      const updated = await repo.update("graph_edges", existing.id, { kind: data.kind, status: "approved" });
      revalidatePath("/app/universe");
      return updated;
    }
    const edge = await repo.insert("graph_edges", { ...data, workspace_id: workspace.id, origin: "user", status: "approved" });
    revalidatePath("/app/universe");
    return edge;
  });
}

export async function unlinkEdge(edgeId: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    await repo.remove("graph_edges", edgeId);
    revalidatePath("/app/universe");
    return null;
  });
}

export async function uploadInlineImage(form: FormData): Promise<ActionResult<{ url: string }>> {
  return run(async () => {
    const { repo } = await getContext();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    if (!file.type.startsWith("image/")) throw new Error("Only images can be embedded.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Images must be under 8 MB.");
    const { putObject } = await import("@/lib/storage");
    const ext = file.type.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "png";
    const key = `note-images/${crypto.randomUUID()}.${ext}`;
    const path = await putObject(repo.userId, key, new Uint8Array(await file.arrayBuffer()), file.type);
    return { url: `/api/files?path=${encodeURIComponent(path)}` };
  });
}
