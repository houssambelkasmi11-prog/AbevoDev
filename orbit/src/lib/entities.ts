import "server-only";
import type { Repo } from "@/lib/db/repo";
import type { EntityType } from "@/lib/types";

export interface EntityRef {
  type: EntityType;
  id: string;
  title: string;
  href: string | null;
}

export function hrefFor(type: EntityType, id: string): string | null {
  switch (type) {
    case "note":
      return `/app/notes/${id}`;
    case "source":
      return `/app/lessons/${id}`;
    case "conversation":
      return `/app/ai/${id}`;
    case "assignment":
      return `/app/homework/${id}`;
    case "subject":
      return `/app/universe?focus=${id}`;
    default:
      return null;
  }
}

/** Loads every linkable entity in a workspace as lightweight refs. */
export async function loadEntityIndex(repo: Repo, workspaceId: string): Promise<Map<string, EntityRef>> {
  const [subjects, notes, sources, convs, assignments, concepts] = await Promise.all([
    repo.list("subjects", { where: { workspace_id: workspaceId } }),
    repo.list("notes", { where: { workspace_id: workspaceId } }),
    repo.list("sources", { where: { workspace_id: workspaceId } }),
    repo.list("conversations", { where: { workspace_id: workspaceId } }),
    repo.list("assignments", { where: { workspace_id: workspaceId } }),
    repo.list("graph_nodes", { where: { workspace_id: workspaceId, entity_type: "concept" } }),
  ]);
  const map = new Map<string, EntityRef>();
  const add = (type: EntityType, id: string, title: string) => map.set(id, { type, id, title, href: hrefFor(type, id) });
  subjects.forEach((s) => add("subject", s.id, s.name));
  notes.forEach((n) => add("note", n.id, n.title || "Untitled"));
  sources.forEach((s) => add("source", s.id, s.title));
  convs.forEach((c) => add("conversation", c.id, c.title));
  assignments.forEach((a) => add("assignment", a.id, a.title));
  concepts.forEach((c) => add("concept", c.id, c.label ?? "Concept"));
  return map;
}
