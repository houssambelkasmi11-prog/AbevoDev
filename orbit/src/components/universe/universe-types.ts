import type { EdgeKind, EntityType } from "@/lib/types";

export interface GNode {
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

export interface GEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  origin: "user" | "ai" | "implicit";
  status: "approved" | "suggested";
  rationale: string | null;
}

export const KIND_LABEL: Record<EdgeKind, string> = {
  belongs_to: "Belongs to",
  references: "References",
  builds_upon: "Builds upon",
  related: "Related concept",
  prerequisite: "Prerequisite",
};
