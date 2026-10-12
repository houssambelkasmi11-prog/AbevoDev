"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateJson } from "@/lib/ai/json";
import { getContext } from "@/lib/bootstrap";
import type { EntityType, GraphEdgeRow, GraphNodeRow } from "@/lib/types";
import { truncate } from "@/lib/utils";
import { run, type ActionResult } from "../result";

const entityType = z.enum(["subject", "note", "source", "conversation", "assignment", "concept"]);

export async function saveNodePositions(items: { entity_type: EntityType; entity_id: string; x: number; y: number }[]): Promise<ActionResult> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const data = z.array(z.object({ entity_type: entityType, entity_id: z.string(), x: z.number().finite(), y: z.number().finite() })).max(500).parse(items);
    const existing = await repo.list("graph_nodes", { where: { workspace_id: workspace.id } });
    for (const it of data) {
      const row = existing.find((n) => n.entity_id === it.entity_id);
      if (row) await repo.update("graph_nodes", row.id, { x: Math.round(it.x), y: Math.round(it.y) });
      else await repo.insert("graph_nodes", { workspace_id: workspace.id, entity_type: it.entity_type, entity_id: it.entity_id, x: Math.round(it.x), y: Math.round(it.y) });
    }
    return null;
  });
}

export async function createConcept(label: string, x: number, y: number): Promise<ActionResult<GraphNodeRow>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const id = crypto.randomUUID();
    const row = await repo.insert("graph_nodes", { id, workspace_id: workspace.id, entity_type: "concept", entity_id: id, label: z.string().trim().min(1).max(80).parse(label), x: Math.round(x), y: Math.round(y) });
    revalidatePath("/app/universe");
    return row;
  });
}

export async function deleteConcept(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    await repo.removeWhere("graph_edges", { from_id: id });
    await repo.removeWhere("graph_edges", { to_id: id });
    await repo.remove("graph_nodes", id);
    revalidatePath("/app/universe");
    return null;
  });
}

export async function setEdgeStatus(id: string, status: "approved" | "rejected"): Promise<ActionResult<GraphEdgeRow>> {
  return run(async () => {
    const { repo } = await getContext();
    const row = await repo.update("graph_edges", id, { status });
    revalidatePath("/app/universe");
    return row;
  });
}

const suggestionSchema = z.object({
  links: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        kind: z.enum(["references", "builds_upon", "related", "prerequisite"]),
        rationale: z.string().min(1).max(400),
      }),
    )
    .max(20),
});

/** Asks the model for conceptual links; stores them as *suggested* (never auto-approved). */
export async function suggestConnections(): Promise<ActionResult<GraphEdgeRow[]>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const [notes, sources, edges] = await Promise.all([
      repo.list("notes", { where: { workspace_id: workspace.id }, order: { column: "updated_at", ascending: false }, limit: 60 }),
      repo.list("sources", { where: { workspace_id: workspace.id, status: "ready" }, order: { column: "updated_at", ascending: false }, limit: 60 }),
      repo.list("graph_edges", { where: { workspace_id: workspace.id } }),
    ]);
    const items = [
      ...notes.map((n, i) => ({ key: `N${i + 1}`, type: "note" as const, id: n.id, title: n.title || "Untitled", gist: truncate(n.plain.replace(/\s+/g, " "), 280) })),
      ...sources.map((s, i) => ({ key: `R${i + 1}`, type: "source" as const, id: s.id, title: s.title, gist: truncate((s.summary ?? s.text ?? "").replace(/\s+/g, " "), 280) })),
    ];
    if (items.length < 2) throw new Error("Add at least two notes or indexed sources first.");
    const byKey = new Map(items.map((i) => [i.key, i]));
    const exists = new Set(edges.map((e) => `${e.from_id}>${e.to_id}`));

    const { data } = await generateJson(repo, {
      instruction:
        'Propose up to 12 meaningful conceptual connections between the student\'s items. Only connect items whose content genuinely relates. kind: "prerequisite" (from must be understood before to), "builds_upon" (from extends to), "references" (from cites/uses to), "related" (shared concept). rationale: one sentence explaining why, specific to the content. Use only the keys provided. Schema: {"links":[{"from":key,"to":key,"kind":string,"rationale":string}]}',
      input: `<material>\n${items.map((i) => `${i.key} [${i.type}] ${i.title}: ${i.gist}`).join("\n")}\n</material>`,
      schema: suggestionSchema,
      temperature: 0.3,
    });

    const rows = data.links
      .map((l) => ({ l, a: byKey.get(l.from), b: byKey.get(l.to) }))
      .filter((x): x is { l: (typeof data.links)[number]; a: (typeof items)[number]; b: (typeof items)[number] } => !!x.a && !!x.b && x.a.id !== x.b.id)
      .filter((x) => !exists.has(`${x.a.id}>${x.b.id}`) && !exists.has(`${x.b.id}>${x.a.id}`))
      .map((x) => ({
        workspace_id: workspace.id,
        from_type: x.a.type,
        from_id: x.a.id,
        to_type: x.b.type,
        to_id: x.b.id,
        kind: x.l.kind,
        origin: "ai" as const,
        status: "suggested" as const,
        rationale: x.l.rationale,
      }));
    const created = await repo.insertMany("graph_edges", rows);
    revalidatePath("/app/universe");
    return created;
  });
}
