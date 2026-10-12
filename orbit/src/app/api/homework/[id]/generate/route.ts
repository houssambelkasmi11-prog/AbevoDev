import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepoOrNull } from "@/lib/auth/session";
import { ensureBootstrap } from "@/lib/bootstrap";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { PROVIDERS } from "@/lib/ai/providers";
import { resolveModel } from "@/lib/ai/resolve";
import { retrieve, type RetrievalResult } from "@/lib/ai/retrieval";
import { ndjsonStream } from "@/lib/ai/stream";
import type { ChatMessage } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODE_INSTRUCTIONS = {
  guide: [
    "MODE: GUIDE ME. You are tutoring the student through this assignment. Do NOT produce the finished answer.",
    "Give the smallest helpful next step: a hint, a guiding question, or a short explanation of a concept they need. Escalate help gradually if they ask for more.",
    "If the student shares their attempt, respond to their reasoning specifically.",
  ].join("\n"),
  solve: [
    "MODE: SOLVE & EXPLAIN. Produce a complete worked solution with the reasoning made explicit so the student can learn from it.",
    "Number each question. For mathematics/science show every intermediate step in LaTeX and finish with a verification (substitute back, check units, or estimate).",
    "End with a short 'What to remember' list. This is a study aid — the student remains responsible for their own submission.",
  ].join("\n"),
  research: [
    "MODE: RESEARCH & DRAFT. Write an organised draft that answers the assignment using the provided reference material.",
    "Structure: title, introduction, sections with headings, conclusion, then a 'References used' list naming only the provided sources.",
    "Cite supporting excerpts inline with their keys, e.g. [S1]. After the draft add a section 'Claims to verify' listing any statement not directly supported by the excerpts.",
    "Never invent sources, quotes, statistics or page numbers.",
  ].join("\n"),
  automate: [
    "MODE: AUTOMATE — OUTLINE. Produce an editable outline for the final deliverable: headings, the key point for each section, which provided source supports it ([S#]), and target length per section.",
    "Add a short checklist mapping each teacher instruction/constraint to where the outline satisfies it.",
  ].join("\n"),
} as const;

const schema = z.object({
  mode: z.enum(["guide", "solve", "research", "automate"]),
  message: z.string().max(10_000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRepoOrNull();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { repo, user } = ctx;
  const { workspace } = await ensureBootstrap(repo, user);
  const a = await repo.get("assignments", id);
  if (!a) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  const { mode, message } = parsed.data;

  return ndjsonStream(req, async (emit, signal) => {
    const personaSlug = mode === "guide" ? "socrates" : mode === "solve" ? "axiom" : mode === "automate" ? "pulse" : "atlas";
    const persona = (await repo.list("personas", { where: { slug: personaSlug } }))[0] ?? null;
    const resolved = await resolveModel(repo, { persona });

    let grounding: RetrievalResult = { blocks: [], citations: [], method: "none" };
    if (mode !== "guide" || a.selected_source_ids.length) {
      const query = [a.title, a.requirements?.summary, ...(a.requirements?.questions ?? []).slice(0, 6), message].filter(Boolean).join("\n");
      grounding = await retrieve(repo, workspace.id, query, { subjectIds: [], sourceIds: a.selected_source_ids, noteIds: a.linked_note_ids, collections: [] }, mode === "research" ? 10 : 6);
      if (!a.selected_source_ids.length && !a.linked_note_ids.length) grounding = { blocks: [], citations: [], method: "none" };
    }

    emit({ type: "meta", model: resolved.model, persona: persona?.name ?? null, citations: grounding.citations });
    await repo.update("assignments", id, { stages: { ...a.stages, generation: "running" } });

    const brief = [
      `<assignment title="${a.title.replace(/"/g, "'")}">`,
      a.requirements ? `REQUIREMENTS (extracted, student-verified): ${JSON.stringify(a.requirements)}` : "",
      a.prompt_text ? `TEXT:\n${a.prompt_text.slice(0, 20_000)}` : "",
      "</assignment>",
      a.student_work.trim() && mode === "guide" ? `<student_progress>\n${a.student_work.slice(0, 8000)}\n</student_progress>` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const messages: ChatMessage[] = [{ role: "user", content: brief }];
    if (mode === "guide") {
      for (const turn of a.guide_log.slice(-12)) messages.push({ role: turn.role === "ai" ? "assistant" : "user", content: turn.content });
      messages.push({ role: "user", content: message?.trim() || "I'm getting started. What should I do first?" });
    } else if (message?.trim()) {
      messages.push({ role: "user", content: `Additional request from the student: ${message.trim()}` });
    }

    let out = "";
    try {
      for await (const piece of PROVIDERS[resolved.conn.kind].stream(resolved.conn, {
        model: resolved.model,
        system: buildSystemPrompt({ persona, grounding: grounding.blocks, extra: MODE_INSTRUCTIONS[mode] }),
        messages,
        temperature: persona?.temperature ?? null,
        maxTokens: mode === "guide" ? 1200 : 6000,
        signal,
      })) {
        out += piece;
        emit({ type: "delta", text: piece });
      }
    } catch (e) {
      await repo.update("assignments", id, { stages: { ...a.stages, generation: "error" } });
      throw e;
    }

    if (mode === "guide") {
      const log = [...a.guide_log, { role: "student" as const, content: message?.trim() || "I'm getting started. What should I do first?" }, { role: "ai" as const, content: out }];
      await repo.update("assignments", id, { guide_log: log.slice(-40), stages: { ...a.stages, generation: "done" }, status: a.status === "planning" ? "in_progress" : a.status });
    } else if (out.trim()) {
      await repo.update("assignments", id, {
        ai_output: out,
        ai_output_model: resolved.model,
        stages: { ...a.stages, generation: "done" },
        status: a.status === "planning" ? "in_progress" : a.status,
      });
    }
    emit({ type: "done" });
  });
}
