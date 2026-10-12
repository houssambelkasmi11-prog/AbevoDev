import "server-only";
import { bestForOf } from "@/lib/ai/personas";
import type { CredentialLite } from "@/components/chat/model-picker";
import type { ConversationLite, PersonaLite } from "@/components/chat/chat-workspace";
import type { ScopeOptions } from "@/components/chat/scope-dialog";
import type { Repo } from "@/lib/db/repo";
import type { CredentialRow } from "@/lib/types";

export function credentialLite(c: CredentialRow): CredentialLite {
  return {
    id: c.id,
    provider: c.provider,
    label: c.label,
    default_model: c.default_model,
    status: c.status,
    models: c.models_cache.map((m) => ({ id: m.id, label: m.label, inputPrice: m.inputPrice, outputPrice: m.outputPrice })),
  };
}

export async function loadChatContext(repo: Repo, workspaceId: string): Promise<{
  conversations: ConversationLite[];
  personas: PersonaLite[];
  credentials: CredentialLite[];
  scopeOptions: ScopeOptions;
}> {
  const [conversations, personas, credentials, subjects, sources, notes] = await Promise.all([
    repo.list("conversations", { where: { workspace_id: workspaceId }, order: { column: "updated_at", ascending: false }, limit: 200 }),
    repo.list("personas", { order: { column: "created_at" } }),
    repo.list("credentials", { order: { column: "created_at" } }),
    repo.list("subjects", { where: { workspace_id: workspaceId }, order: { column: "name" } }),
    repo.list("sources", { where: { workspace_id: workspaceId }, order: { column: "updated_at", ascending: false } }),
    repo.list("notes", { where: { workspace_id: workspaceId }, order: { column: "updated_at", ascending: false } }),
  ]);
  return {
    conversations: conversations.map((c) => ({ id: c.id, title: c.title, updated_at: c.updated_at, persona_id: c.persona_id })),
    personas: personas.map((p) => ({ id: p.id, name: p.name, role: p.role, tagline: p.tagline, glyph: p.glyph, bestFor: bestForOf(p.slug) })),
    credentials: credentials.map(credentialLite),
    scopeOptions: {
      subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
      sources: sources.map((s) => ({ id: s.id, title: s.title, subject_id: s.subject_id, collection: s.collection, status: s.status })),
      notes: notes.map((n) => ({ id: n.id, title: n.title })),
    },
  };
}
