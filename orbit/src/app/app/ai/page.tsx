import type { Metadata } from "next";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { getContext } from "@/lib/bootstrap";
import { loadChatContext } from "@/server/loaders/chat";

export const metadata: Metadata = { title: "AI Studio" };

export default async function AiStudioPage({ searchParams }: { searchParams: Promise<{ source?: string; persona?: string; subject?: string }> }) {
  const sp = await searchParams;
  const { repo, workspace, settings } = await getContext();
  const ctx = await loadChatContext(repo, workspace.id);
  const persona = sp.persona ? ctx.personas.find((p) => p.name.toLowerCase() === sp.persona?.toLowerCase() || p.id === sp.persona) : null;
  const sourceIds = sp.source && ctx.scopeOptions.sources.some((s) => s.id === sp.source) ? [sp.source] : [];
  const subjectIds = sp.subject && ctx.scopeOptions.subjects.some((s) => s.id === sp.subject) ? [sp.subject] : [];
  return (
    <ChatWorkspace
      key={`new-${sp.source ?? ""}-${sp.persona ?? ""}`}
      {...ctx}
      initial={{
        conversationId: null,
        title: "New conversation",
        personaId: persona?.id ?? settings.default_persona_id ?? ctx.personas[0]?.id ?? null,
        credentialId: null,
        model: null,
        mode: "detailed",
        grounded: sourceIds.length + subjectIds.length > 0,
        scope: { subjectIds, sourceIds, noteIds: [], collections: [] },
        messages: [],
      }}
    />
  );
}
