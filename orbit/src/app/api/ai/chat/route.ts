import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepoOrNull } from "@/lib/auth/session";
import { ensureBootstrap } from "@/lib/bootstrap";
import { buildSystemPrompt, NOT_IN_SOURCES } from "@/lib/ai/prompts";
import { PROVIDERS } from "@/lib/ai/providers";
import { resolveModel } from "@/lib/ai/resolve";
import { retrieve, type RetrievalResult } from "@/lib/ai/retrieval";
import { ndjsonStream } from "@/lib/ai/stream";
import type { ChatMessage } from "@/lib/ai/types";
import type { ChatScope, MessageRow } from "@/lib/types";
import { errorMessage, truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const scopeSchema = z.object({
  subjectIds: z.array(z.string()).max(50).default([]),
  sourceIds: z.array(z.string()).max(200).default([]),
  noteIds: z.array(z.string()).max(200).default([]),
  collections: z.array(z.string()).max(50).default([]),
});

const schema = z.object({
  conversationId: z.string().optional(),
  content: z.string().max(40_000).default(""),
  regenerate: z.boolean().default(false),
  personaId: z.string().nullable().optional(),
  credentialId: z.string().nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  mode: z.enum(["concise", "detailed", "tutorial", "examples", "practice", "socratic"]).optional(),
  grounded: z.boolean().optional(),
  scope: scopeSchema.optional(),
});

export async function POST(req: Request) {
  const ctx = await getRepoOrNull();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const input = parsed.data;
  if (!input.regenerate && !input.content.trim()) return NextResponse.json({ error: "Message is empty." }, { status: 400 });

  const { repo, user } = ctx;
  const { workspace, settings } = await ensureBootstrap(repo, user);

  // Conversation (create or load + apply setting changes).
  let conv = input.conversationId ? await repo.get("conversations", input.conversationId) : null;
  if (input.conversationId && !conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  const scope: ChatScope | undefined = input.scope;
  if (!conv) {
    conv = await repo.insert("conversations", {
      workspace_id: workspace.id,
      title: truncate(input.content.replace(/\s+/g, " ").trim(), 64) || "New conversation",
      persona_id: input.personaId ?? settings.default_persona_id ?? null,
      credential_id: input.credentialId ?? null,
      model: input.model ?? null,
      mode: input.mode ?? "detailed",
      grounded: input.grounded ?? !!(scope && (scope.sourceIds.length || scope.subjectIds.length || scope.noteIds.length)),
      scope: scope ?? { subjectIds: [], sourceIds: [], noteIds: [], collections: [] },
    });
  } else {
    const patch: Partial<typeof conv> = {};
    if (input.personaId !== undefined) patch.persona_id = input.personaId;
    if (input.credentialId !== undefined) patch.credential_id = input.credentialId;
    if (input.model !== undefined) patch.model = input.model;
    if (input.mode) patch.mode = input.mode;
    if (input.grounded !== undefined) patch.grounded = input.grounded;
    if (scope) patch.scope = scope;
    if (Object.keys(patch).length) conv = await repo.update("conversations", conv.id, patch);
  }
  const conversation = conv;

  return ndjsonStream(req, async (emit, signal) => {
    let history = await repo.list("messages", { where: { conversation_id: conversation.id }, order: { column: "created_at" } });

    let question = input.content.trim();
    let userMessage: MessageRow | null = null;
    if (input.regenerate) {
      const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
      if (lastAssistant && history[history.length - 1]?.id === lastAssistant.id) {
        await repo.remove("messages", lastAssistant.id);
        history = history.filter((m) => m.id !== lastAssistant.id);
      }
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      if (!lastUser) throw new Error("Nothing to regenerate.");
      question = lastUser.content;
    } else {
      userMessage = await repo.insert("messages", { conversation_id: conversation.id, role: "user", content: question });
      history.push(userMessage);
    }

    const persona = conversation.persona_id ? await repo.get("personas", conversation.persona_id) : null;
    const resolved = await resolveModel(repo, { credentialId: conversation.credential_id, model: conversation.model, persona });

    let grounding: RetrievalResult = { blocks: [], citations: [], method: "none" };
    if (conversation.grounded) {
      const prevUser = history.filter((m) => m.role === "user").slice(-2, -1)[0]?.content ?? "";
      const sc = conversation.scope;
      const empty = sc.subjectIds.length + sc.sourceIds.length + sc.noteIds.length + sc.collections.length === 0;
      // A persona's preferred collections become the default scope.
      const effective = empty && persona?.source_collections.length ? { ...sc, collections: persona.source_collections } : sc;
      grounding = await retrieve(repo, workspace.id, `${question}\n${truncate(prevUser, 300)}`, effective, 8);
    }

    emit({
      type: "meta",
      conversationId: conversation.id,
      title: conversation.title,
      userMessageId: userMessage?.id ?? null,
      persona: persona?.name ?? null,
      model: resolved.model,
      provider: resolved.credential.provider,
      citations: grounding.citations,
      retrieval: grounding.method,
      grounded: conversation.grounded,
    });

    const system = buildSystemPrompt({
      persona,
      mode: conversation.mode,
      grounding: grounding.blocks,
      extra: conversation.grounded && grounding.blocks.length === 0
        ? `The student asked for answers grounded in their sources, but no relevant passages were found in the selected scope. Start your reply with the exact line ${NOT_IN_SOURCES} and then answer from general knowledge, saying so.`
        : undefined,
    });

    // Keep the most recent turns within a sensible budget.
    const turns: ChatMessage[] = [];
    let budget = 60_000;
    for (const m of [...history].reverse()) {
      if (m.error && !m.content) continue;
      const cost = m.content.length;
      if (budget - cost < 0 && turns.length > 0) break;
      budget -= cost;
      turns.unshift({ role: m.role, content: m.content });
    }

    let answer = "";
    let failure: string | null = null;
    try {
      for await (const piece of PROVIDERS[resolved.conn.kind].stream(resolved.conn, {
        model: resolved.model,
        system,
        messages: turns,
        temperature: persona?.temperature ?? null,
        maxTokens: persona?.length === "long" ? 4000 : persona?.length === "short" ? 1200 : 2500,
        signal,
      })) {
        answer += piece;
        emit({ type: "delta", text: piece });
      }
    } catch (e) {
      if (!signal.aborted) failure = errorMessage(e);
    }

    const grade: MessageRow["grounding"] = !conversation.grounded
      ? "none"
      : answer.trimStart().startsWith(NOT_IN_SOURCES)
        ? "ungrounded"
        : /\[S\d+\]/.test(answer)
          ? "grounded"
          : "partial";

    if (answer || failure) {
      const saved = await repo.insert("messages", {
        conversation_id: conversation.id,
        role: "assistant",
        content: answer,
        persona_name: persona?.name ?? null,
        model: resolved.model,
        provider: resolved.credential.provider,
        citations: grounding.citations.filter((c) => answer.includes(`[${c.key}`) || answer.includes(`${c.key}]`) || answer.includes(`, ${c.key}`)),
        grounding: grade,
        error: failure ?? (signal.aborted ? "Stopped by student" : null),
      });
      await repo.update("conversations", conversation.id, { title: conversation.title });
      if (failure) throw new Error(failure);
      emit({ type: "done", messageId: saved.id, grounding: grade });
    }
  });
}
