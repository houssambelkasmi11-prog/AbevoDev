import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { getContext } from "@/lib/bootstrap";
import { loadChatContext } from "@/server/loaders/chat";

export async function generateMetadata({ params }: { params: Promise<{ conversationId: string }> }): Promise<Metadata> {
  const { conversationId } = await params;
  const { repo } = await getContext();
  const c = await repo.get("conversations", conversationId);
  return { title: c?.title ?? "Conversation" };
}

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const { repo, workspace } = await getContext();
  const conv = await repo.get("conversations", conversationId);
  if (!conv || conv.workspace_id !== workspace.id) notFound();
  const [ctx, messages] = await Promise.all([
    loadChatContext(repo, workspace.id),
    repo.list("messages", { where: { conversation_id: conv.id }, order: { column: "created_at" } }),
  ]);
  return (
    <ChatWorkspace
      key={conv.id}
      {...ctx}
      initial={{
        conversationId: conv.id,
        title: conv.title,
        personaId: conv.persona_id,
        credentialId: conv.credential_id,
        model: conv.model,
        mode: conv.mode,
        grounded: conv.grounded,
        scope: conv.scope,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          persona_name: m.persona_name,
          model: m.model,
          citations: m.citations,
          grounding: m.grounding,
          error: m.error,
        })),
      }}
    />
  );
}
