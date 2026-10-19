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
  complete: [
    "MODE: DO IT. Write the finished assignment exactly as it will be handed in. It must be complete, correct and polished.",
    "Answer every question and task in the assignment, in order, numbered the same way the assignment numbers them. Skip nothing.",
    "Follow every instruction and constraint: required length, structure, format, citation style and language. Write in the language the assignment is written in.",
    "Maths and science: show the working a teacher expects to see, concisely and in LaTeX, and make each final answer clear. Check every result before writing it.",
    "If reference material is provided, use it, and cite it in the required style (default author-date in the text) with a reference list at the end using the real titles of the provided sources. Never write [S1]-style keys, and never invent sources, quotes or statistics.",
    "",
    "VOICE. It must read like a capable student wrote it, not like an AI assistant:",
    "- Write at the student's level (see LEVEL below). Plain, precise words. A student explains things in their own way; they don't sound like a press release.",
    "- Vary sentence length a lot. Mix short sentences with longer ones. Paragraphs have different lengths. Not every paragraph ends with a summary sentence.",
    "- Be concrete: specific examples, numbers, names and cases from the material instead of general statements.",
    "- Take a clear position when the task asks for an opinion or argument, and give the reasoning behind it.",
    "- Use headings only where the format calls for them (reports, case studies, multi-part answers). Essays are flowing paragraphs under a title. Prefer paragraphs over bullet lists unless the task asks for a list.",
    "- Bold only final answers in calculations. No emojis. No em dashes or en dashes: use commas, full stops, brackets or colons instead.",
    "- Never use these: delve, crucial, pivotal, vital, landscape, tapestry, realm, testament, multifaceted, intricate, navigate (figuratively), foster, leverage, robust, seamless, underscore, showcase, meticulous, 'in today's world', 'in today's fast-paced', 'it is important to note', 'it is worth noting', 'plays a crucial role', 'a wide range of', 'in conclusion,' as the first words of the last paragraph, 'not only ... but also' more than once, 'furthermore' or 'moreover' more than once in the whole text, rhetorical questions as openers, and groups of three adjectives or examples used as a habit.",
    "- No opening that restates the question, and no closing line that sums up everything once more.",
    "",
    "DIAGRAMS. When the assignment asks for a process flow, BPMN model, flowchart, swimlane diagram or workflow, draw it. Never describe it as text, a list or ASCII art. Write it as a fenced code block with the language bpmn containing only JSON in this shape:",
    '```bpmn\n{"title":"Order handling","lanes":["Customer","Sales"],"nodes":[{"id":"s","type":"start","label":"Order placed","lane":"Customer"},{"id":"t1","type":"user","label":"Check order","lane":"Sales"},{"id":"g1","type":"xor","label":"In stock?","lane":"Sales"},{"id":"e","type":"end","label":"Order shipped","lane":"Sales"}],"flows":[{"from":"s","to":"t1"},{"from":"t1","to":"g1"},{"from":"g1","to":"e","label":"Yes"}]}\n```',
    "Node types: start, end, intermediate, timer, message (events); task, user, service, manual, subprocess (activities); xor, and, or, event (gateways); data, store (data objects). Use lanes for roles/departments when the process has more than one actor. Every gateway gets labelled outgoing flows (e.g. Yes / No). A flow with \"kind\":\"message\" is a dashed message flow between participants. Use correct BPMN logic: one start, explicit end events, parallel splits joined by a matching and-gateway. Short labels (verb + object for tasks). After the diagram, write one or two sentences explaining it, like a student would.",
    "",
    "Output ONLY the finished document in Markdown. No tutoring, no tips, no notes or comments to the student, no disclaimers, no placeholders, no mention of AI. If something essential is missing, make the most reasonable assumption and state it in one short line where it applies.",
  ].join("\n"),
  help: [
    "MODE: HELP. The student already has the finished work for this assignment (provided as <finished_work>). Answer exactly what they ask, directly and clearly.",
    "When they ask how something was done or for the steps, give a numbered step-by-step walkthrough with the reasoning for each step. When they ask to explain a concept, explain it simply with one example.",
    "Keep it focused and short unless they ask for more. Use LaTeX for maths.",
  ].join("\n"),
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
  mode: z.enum(["complete", "help", "guide", "solve", "research", "automate"]),
  message: z.string().max(10_000).optional(),
});

/** Em/en dashes are a common giveaway of generated text; swap them outside code and maths. */
function tidyDashes(md: string): string {
  return md
    .split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g)
    .map((part, i) => (i % 2 ? part : part.replace(/\s+[—–]\s+/g, ", ").replace(/(\d)\s*[–—]\s*(\d)/g, "$1-$2").replace(/[—–]/g, ", ")))
    .join("");
}

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
    const chatLike = mode === "guide" || mode === "help";
    const personaSlug = mode === "help" ? "atlas" : mode === "guide" ? "socrates" : mode === "solve" ? "axiom" : mode === "automate" ? "pulse" : "atlas";
    // "complete" writes the deliverable itself, so it runs without a tutoring persona voice.
    const persona = mode === "complete" ? null : ((await repo.list("personas", { where: { slug: personaSlug } }))[0] ?? null);
    const resolved = await resolveModel(repo, { persona });

    let grounding: RetrievalResult = { blocks: [], citations: [], method: "none" };
    if (!chatLike || a.selected_source_ids.length) {
      const query = [a.title, a.requirements?.summary, ...(a.requirements?.questions ?? []).slice(0, 6), message].filter(Boolean).join("\n");
      grounding = await retrieve(repo, workspace.id, query, { subjectIds: [], sourceIds: a.selected_source_ids, noteIds: a.linked_note_ids, collections: [] }, mode === "research" || mode === "complete" ? 10 : 6);
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
      mode === "help" && a.ai_output ? `<finished_work>\n${a.ai_output.slice(0, 30_000)}\n</finished_work>` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const messages: ChatMessage[] = [{ role: "user", content: brief }];
    if (chatLike) {
      for (const turn of a.guide_log.filter((t) => t.content.trim()).slice(-12)) messages.push({ role: turn.role === "ai" ? "assistant" : "user", content: turn.content });
      messages.push({ role: "user", content: message?.trim() || (mode === "help" ? "Explain step by step how this was done." : "I'm getting started. What should I do first?") });
    } else if (message?.trim()) {
      messages.push({ role: "user", content: `Instructions for the finished work (follow them): ${message.trim()}` });
    }

    // Some providers (DeepSeek reasoning models, Gemini) reject two turns in a row from the same role: merge them.
    const turns: ChatMessage[] = [];
    for (const m of messages) {
      const last = turns[turns.length - 1];
      if (last && last.role === m.role && typeof last.content === "string" && typeof m.content === "string") last.content = `${last.content}\n\n${m.content}`;
      else turns.push({ ...m });
    }

    let out = "";
    try {
      for await (const piece of PROVIDERS[resolved.conn.kind].stream(resolved.conn, {
        model: resolved.model,
        system: buildSystemPrompt({ persona, grounding: grounding.blocks, extra: MODE_INSTRUCTIONS[mode], deliverable: mode === "complete" }),
        messages: turns,
        temperature: persona?.temperature ?? null,
        // thinking models spend part of the budget on reasoning before any visible text, so keep it generous
        maxTokens: mode === "guide" ? 4000 : 8000,
        signal,
      })) {
        out += piece;
        emit({ type: "delta", text: piece });
      }
    } catch (e) {
      await repo.update("assignments", id, { stages: { ...a.stages, generation: "error" } });
      throw e;
    }

    if (!out.trim()) {
      await repo.update("assignments", id, { stages: { ...a.stages, generation: a.ai_output ? "done" : "error" } });
      emit({ type: "error", message: "The AI didn't send an answer back. Try again, or pick another model in Settings → AI." });
      return;
    }
    if (chatLike) {
      const log = [...a.guide_log, { role: "student" as const, content: message?.trim() || (mode === "help" ? "Explain step by step how this was done." : "I'm getting started. What should I do first?") }, { role: "ai" as const, content: out }];
      await repo.update("assignments", id, { guide_log: log.slice(-40), stages: { ...a.stages, generation: "done" }, status: a.status === "planning" ? "in_progress" : a.status });
    } else if (out.trim()) {
      if (mode === "complete") out = tidyDashes(out);
      await repo.update("assignments", id, {
        ai_output: out,
        ai_output_model: resolved.model,
        stages: { ...a.stages, generation: "done" },
        status: a.status === "planning" ? "in_progress" : a.status,
      });
    }
    if (mode === "complete" && out.trim()) emit({ type: "final", text: out });
    emit({ type: "done" });
  });
}
