import "server-only";
import type { Repo } from "@/lib/db/repo";
import type { EdgeKind, EntityType } from "@/lib/types";
import { truncate } from "@/lib/utils";

export interface UNode {
  id: string;
  type: EntityType;
  label: string;
  subjectId: string | null;
  glyph: number;
  x: number;
  y: number;
  snippet: string;
  href: string | null;
  createdAt: string;
  degree: number;
}

export interface UEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  origin: "user" | "ai" | "implicit";
  status: "approved" | "suggested";
  rationale: string | null;
}

const HREF: Partial<Record<EntityType, (id: string) => string>> = {
  note: (id) => `/app/notes/${id}`,
  source: (id) => `/app/lessons/${id}`,
  conversation: (id) => `/app/ai/${id}`,
  assignment: (id) => `/app/homework/${id}`,
};

/**
 * Builds the persisted knowledge graph for a workspace. Positions come from
 * graph_nodes when the student has arranged them; otherwise an orbital
 * default layout places items around their subject cluster.
 */
export async function loadGraph(repo: Repo, workspaceId: string): Promise<{ nodes: UNode[]; edges: UEdge[] }> {
  const [subjects, notes, sources, convs, assignments, positions, edges] = await Promise.all([
    repo.list("subjects", { where: { workspace_id: workspaceId }, order: { column: "created_at" } }),
    repo.list("notes", { where: { workspace_id: workspaceId } }),
    repo.list("sources", { where: { workspace_id: workspaceId } }),
    repo.list("conversations", { where: { workspace_id: workspaceId } }),
    repo.list("assignments", { where: { workspace_id: workspaceId } }),
    repo.list("graph_nodes", { where: { workspace_id: workspaceId } }),
    repo.list("graph_edges", { where: { workspace_id: workspaceId } }),
  ]);
  const pos = new Map(positions.map((p) => [p.entity_id, p]));
  const nodes: UNode[] = [];

  const R = Math.max(520, subjects.length * 130);
  const centers = new Map<string, { x: number; y: number }>();
  subjects.forEach((s, i) => {
    const a = (i / Math.max(1, subjects.length)) * Math.PI * 2 - Math.PI / 2;
    const c = subjects.length === 1 ? { x: 0, y: 0 } : { x: Math.cos(a) * R, y: Math.sin(a) * R * 0.72 };
    const p = pos.get(s.id);
    centers.set(s.id, p ? { x: p.x, y: p.y } : c);
    nodes.push({ id: s.id, type: "subject", label: s.name, subjectId: s.id, glyph: s.glyph, x: p?.x ?? c.x, y: p?.y ?? c.y, snippet: s.description ?? "", href: null, createdAt: s.created_at, degree: 0 });
  });

  const items: { id: string; type: EntityType; label: string; subjectId: string | null; snippet: string; createdAt: string }[] = [
    ...notes.map((n) => ({ id: n.id, type: "note" as const, label: n.title || "Untitled", subjectId: n.subject_id, snippet: truncate(n.plain, 200), createdAt: n.created_at })),
    ...sources.map((s) => ({ id: s.id, type: "source" as const, label: s.title, subjectId: s.subject_id, snippet: truncate(s.summary ?? s.text ?? "", 200), createdAt: s.created_at })),
    ...assignments.map((a) => ({ id: a.id, type: "assignment" as const, label: a.title, subjectId: a.subject_id, snippet: truncate(a.requirements?.summary ?? a.prompt_text, 200), createdAt: a.created_at })),
    ...convs.map((c) => ({ id: c.id, type: "conversation" as const, label: c.title, subjectId: c.scope.subjectIds[0] ?? null, snippet: "", createdAt: c.created_at })),
  ];

  const bySubject = new Map<string, typeof items>();
  for (const it of items) {
    const k = it.subjectId && centers.has(it.subjectId) ? it.subjectId : "__none";
    bySubject.set(k, [...(bySubject.get(k) ?? []), it]);
  }
  for (const [k, list] of bySubject) {
    const center = k === "__none" ? { x: 0, y: subjects.length > 1 ? 0 : R * 0.9 } : centers.get(k) ?? { x: 0, y: 0 };
    list.forEach((it, i) => {
      const ring = 150 + Math.floor(i / 10) * 70;
      const a = (i % 10) / Math.min(10, list.length) * Math.PI * 2 + (k.length % 7);
      const p = pos.get(it.id);
      nodes.push({
        ...it,
        glyph: 0,
        x: p?.x ?? center.x + Math.cos(a) * ring,
        y: p?.y ?? center.y + Math.sin(a) * ring * 0.8,
        href: HREF[it.type]?.(it.id) ?? null,
        degree: 0,
      });
    });
  }

  for (const c of positions.filter((p) => p.entity_type === "concept")) {
    nodes.push({ id: c.id, type: "concept", label: c.label ?? "Concept", subjectId: null, glyph: 0, x: c.x, y: c.y, snippet: "", href: null, createdAt: c.created_at, degree: 0 });
  }

  const ids = new Set(nodes.map((n) => n.id));
  const out: UEdge[] = [];
  for (const it of items) {
    if (it.subjectId && ids.has(it.subjectId)) out.push({ id: `bt-${it.id}`, source: it.id, target: it.subjectId, kind: "belongs_to", origin: "implicit", status: "approved", rationale: null });
  }
  for (const e of edges) {
    if (e.status === "rejected" || !ids.has(e.from_id) || !ids.has(e.to_id)) continue;
    out.push({ id: e.id, source: e.from_id, target: e.to_id, kind: e.kind, origin: e.origin, status: e.status === "suggested" ? "suggested" : "approved", rationale: e.rationale });
  }
  const deg = new Map<string, number>();
  out.filter((e) => e.status === "approved").forEach((e) => {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
  });
  nodes.forEach((n) => (n.degree = deg.get(n.id) ?? 0));
  return { nodes, edges: out };
}
