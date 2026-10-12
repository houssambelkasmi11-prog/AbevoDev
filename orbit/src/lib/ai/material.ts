import "server-only";
import type { Repo } from "@/lib/db/repo";
import type { SourceRef } from "@/lib/types";
import { truncate } from "@/lib/utils";

/**
 * Assembles study material (notes, sources, or pasted text) into keyed
 * blocks so generated questions can point back to where they came from.
 */
export async function buildMaterial(
  repo: Repo,
  opts: { noteIds?: string[]; sourceIds?: string[]; text?: string; budget?: number },
): Promise<{ input: string; refs: Map<string, SourceRef>; empty: boolean }> {
  const budget = opts.budget ?? 40_000;
  const refs = new Map<string, SourceRef>();
  const blocks: string[] = [];
  let used = 0;
  let k = 1;
  const push = (ref: SourceRef, content: string) => {
    if (used >= budget) return;
    const c = content.slice(0, Math.max(0, budget - used));
    const key = `S${k++}`;
    refs.set(key, { ...ref, excerpt: truncate(c.replace(/\s+/g, " "), 240) });
    blocks.push(`<material key="${key}" title="${ref.title.replace(/"/g, "'")}"${ref.page ? ` page="${ref.page}"` : ""}>\n${c}\n</material>`);
    used += c.length;
  };

  if (opts.text?.trim()) {
    const note = opts.noteIds?.[0] ? await repo.get("notes", opts.noteIds[0]) : null;
    push({ type: note ? "note" : "source", id: note?.id ?? "selection", title: note?.title ?? "Selected text", page: null, excerpt: null }, opts.text.trim());
  } else {
    for (const id of opts.noteIds ?? []) {
      const n = await repo.get("notes", id);
      if (n?.plain.trim()) push({ type: "note", id: n.id, title: n.title || "Untitled", page: null, excerpt: null }, n.plain);
    }
  }

  for (const id of opts.sourceIds ?? []) {
    const s = await repo.get("sources", id);
    if (!s || s.status !== "ready") continue;
    const chunks = await repo.list("source_chunks", { where: { source_id: id }, order: { column: "ord" } });
    // Sample evenly so long documents are covered end to end.
    const perSource = Math.max(4, Math.floor(24 / Math.max(1, opts.sourceIds?.length ?? 1)));
    const step = Math.max(1, Math.floor(chunks.length / perSource));
    for (let i = 0; i < chunks.length; i += step) {
      const c = chunks[i];
      push({ type: "source", id: s.id, title: s.title, page: c.page, excerpt: null }, c.content);
    }
  }

  return { input: blocks.join("\n\n"), refs, empty: blocks.length === 0 };
}
