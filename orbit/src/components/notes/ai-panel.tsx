"use client";

import { Check, Copy, CornerDownLeft, Layers, ListChecks, Network, RotateCcw, Sparkles, Square, Wand, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { OrbitGlyph, OrbitPulse } from "@/components/brand/logo";
import { Markdown, NOT_IN_SOURCES, NotInSourcesBanner } from "@/components/app/markdown";
import { NoProviderNotice } from "@/components/app/no-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { streamJson } from "@/lib/client/stream";
import type { Citation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createQuizFromContent, generateFlashcardsFromText, saveFlashcards, type DraftCard } from "@/server/actions/practice";

export type AiAction = "explain" | "simplify" | "summarize" | "improve" | "connections" | "tutor";

export interface PersonaOption {
  id: string;
  name: string;
  role: string;
  glyph: number;
}

export interface SelectionInfo {
  text: string;
  from: number;
  to: number;
}

const ACTIONS: { key: AiAction; label: string; hint: string }[] = [
  { key: "explain", label: "Explain this", hint: "Deep explanation with an example" },
  { key: "simplify", label: "Simplify this", hint: "Plain-language rewrite" },
  { key: "summarize", label: "Summarize", hint: "Key points & definitions" },
  { key: "improve", label: "Improve writing", hint: "Suggestions — never auto-applied" },
  { key: "connections", label: "Find connections", hint: "Links to your other notes & sources" },
];

export interface AiRequest {
  action: AiAction;
  question?: string;
}

export function AiPanel({
  noteId,
  noteTitle,
  personas,
  defaultPersonaId,
  getSelection,
  getAllText,
  onInsert,
  onReplace,
  onClose,
  pendingRequest,
  onRequestConsumed,
}: {
  noteId: string;
  noteTitle: string;
  personas: PersonaOption[];
  defaultPersonaId: string | null;
  getSelection: () => SelectionInfo | null;
  getAllText: () => string;
  onInsert: (markdown: string, label: string) => void;
  onReplace: (range: { from: number; to: number }, markdown: string) => void;
  onClose?: () => void;
  pendingRequest?: AiRequest | null;
  onRequestConsumed?: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [personaId, setPersonaId] = useState(defaultPersonaId ?? personas[0]?.id ?? "");
  const [context, setContext] = useState<"selection" | "note" | "sources">("selection");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [meta, setMeta] = useState<{ persona: string | null; model: string; citations: Citation[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [lastAction, setLastAction] = useState<AiAction | null>(null);
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [cards, setCards] = useState<(DraftCard & { keep: boolean })[] | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const run = async (action: AiAction, q?: string) => {
    const sel = getSelection();
    const useSelection = context === "selection" && sel && sel.text.trim().length > 0;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setRunning(true);
    setResult("");
    setMeta(null);
    setError(null);
    setCards(null);
    setLastAction(action);
    setRange(useSelection && sel ? { from: sel.from, to: sel.to } : null);
    try {
      await streamJson(
        "/api/ai/action",
        {
          action,
          text: useSelection && sel ? sel.text : getAllText(),
          question: q,
          noteId,
          context: useSelection ? "selection" : context === "sources" ? "sources" : "note",
          personaId: personaId || undefined,
        },
        (e) => {
          if (e.type === "meta") setMeta({ persona: (e.persona as string | null) ?? null, model: String(e.model), citations: (e.citations as Citation[]) ?? [] });
          else if (e.type === "delta") setResult((r) => r + e.text);
          else if (e.type === "error") setError({ message: e.message, code: e.code });
        },
        ctrl.signal,
      );
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setRunning(false);
    }
  };

  // Requests coming from the floating selection bar.
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    if (!pendingRequest) return;
    onRequestConsumed?.();
    void runRef.current(pendingRequest.action, pendingRequest.question);
  }, [pendingRequest, onRequestConsumed]);

  const stop = () => {
    abort.current?.abort();
    setRunning(false);
  };

  const flashcards = () =>
    start(async () => {
      setError(null);
      setResult("");
      setMeta(null);
      const sel = getSelection();
      const text = sel && sel.text.trim() ? sel.text : getAllText();
      const r = await generateFlashcardsFromText({ text, noteId, personaId: personaId || undefined });
      if (r.ok) setCards(r.data.map((c) => ({ ...c, keep: true })));
      else setError({ message: r.error, code: r.error.includes("No AI provider") ? "no_provider" : undefined });
    });

  const quiz = () =>
    start(async () => {
      setError(null);
      const sel = getSelection();
      const r = await createQuizFromContent({ noteIds: [noteId], text: sel?.text.trim() ? sel.text : undefined, count: 6, types: ["mcq", "short"], title: `Quiz · ${noteTitle}` });
      if (r.ok) router.push(`/app/practice?quiz=${r.data.id}`);
      else setError({ message: r.error, code: r.error.includes("No AI provider") ? "no_provider" : undefined });
    });

  const notInSources = result.trimStart().startsWith(NOT_IN_SOURCES);
  const label = `AI · ${meta?.persona ?? "ORBIT"} · ${meta?.model ?? ""}`.trim();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="label text-ink">Ask ORBIT</span>
        </div>
        {onClose ? (
          <button onClick={onClose} aria-label="Close AI panel" className="rounded-md p-1 text-ink-2 hover:bg-soft hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" data-lenis-prevent>
        <div className="grid grid-cols-2 gap-2">
          <label className="col-span-2 sm:col-span-1">
            <span className="label mb-1 block text-ink-3">Persona</span>
            <Select value={personaId} onChange={(e) => setPersonaId(e.target.value)} className="[&_select]:h-9 [&_select]:text-[13px]">
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.role}
                </option>
              ))}
            </Select>
          </label>
          <label className="col-span-2 sm:col-span-1">
            <span className="label mb-1 block text-ink-3">Work on</span>
            <Select value={context} onChange={(e) => setContext(e.target.value as typeof context)} className="[&_select]:h-9 [&_select]:text-[13px]">
              <option value="selection">Selection (or whole note)</option>
              <option value="note">Entire note</option>
              <option value="sources">Note + linked sources</option>
            </Select>
          </label>
        </div>

        <div className="mt-4 grid gap-1.5">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              disabled={running}
              onClick={() => void run(a.key)}
              className={cn("group flex items-center justify-between rounded-lg border border-line px-3 py-2 text-left transition-colors hover:border-ink disabled:opacity-50", lastAction === a.key && running && "border-ink")}
            >
              <span>
                <span className="block text-[13px] font-medium">{a.label}</span>
                <span className="block text-[11.5px] text-ink-2">{a.hint}</span>
              </span>
              {a.key === "connections" ? <Network className="h-3.5 w-3.5 text-ink-3" /> : <Wand className="h-3.5 w-3.5 text-ink-3 group-hover:text-ink" />}
            </button>
          ))}
          <div className="grid grid-cols-2 gap-1.5">
            <button disabled={pending || running} onClick={flashcards} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-[13px] font-medium hover:border-ink disabled:opacity-50">
              <Layers className="h-3.5 w-3.5" /> Flashcards
            </button>
            <button disabled={pending || running} onClick={quiz} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-left text-[13px] font-medium hover:border-ink disabled:opacity-50">
              <ListChecks className="h-3.5 w-3.5" /> Quiz
            </button>
          </div>
        </div>

        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) void run("tutor", question.trim());
          }}
        >
          <span className="label mb-1 block text-ink-3">Ask the tutor</span>
          <div className="relative">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (question.trim()) void run("tutor", question.trim());
                }
              }}
              placeholder="Why does entropy always increase?"
              className="min-h-[72px] pr-10 text-[13px]"
            />
            <button type="submit" aria-label="Ask" className="absolute bottom-2.5 right-2.5 rounded-md p-1.5 text-ink-2 hover:bg-soft hover:text-ink">
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        {/* Output */}
        <div aria-live="polite" className="mt-5">
          {error ? (
            error.code === "no_provider" ? (
              <NoProviderNotice compact message={error.message} />
            ) : (
              <div role="alert" className="rounded-lg border border-danger/40 px-3 py-2 text-[12.5px] text-danger">
                {error.message}
              </div>
            )
          ) : null}

          {pending && !cards ? (
            <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
              <OrbitPulse className="h-4 w-4 text-ink" /> Generating…
            </div>
          ) : null}

          {cards ? (
            <div className="rounded-xl border border-line">
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <span className="label text-ink-2">{cards.length} flashcards — review before saving</span>
              </div>
              <ul className="max-h-[320px] divide-y divide-line overflow-y-auto">
                {cards.map((c, i) => (
                  <li key={i} className="flex gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={c.keep}
                      onChange={(e) => setCards((cs) => cs?.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)) ?? null)}
                      aria-label={`Keep card ${i + 1}`}
                      className="mt-1 accent-[var(--ink)]"
                    />
                    <div className="min-w-0 text-[12.5px]">
                      <p className="font-medium">{c.front}</p>
                      <p className="mt-0.5 text-ink-2">{c.back}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end gap-2 border-t border-line p-2">
                <Button size="sm" variant="ghost" onClick={() => setCards(null)}>
                  Discard
                </Button>
                <Button
                  size="sm"
                  loading={pending}
                  onClick={() =>
                    start(async () => {
                      const keep = cards.filter((c) => c.keep);
                      const r = await saveFlashcards({ cards: keep, deck: noteTitle, noteId });
                      if (r.ok) {
                        toast.show(`${r.data} cards added to “${noteTitle}”`, { action: { label: "Review", onClick: () => router.push("/app/practice") } });
                        setCards(null);
                      } else toast.error(r.error);
                    })
                  }
                >
                  Save {cards.filter((c) => c.keep).length} cards
                </Button>
              </div>
            </div>
          ) : null}

          {result || running ? (
            <div className="rounded-xl border border-line bg-canvas/50">
              <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <OrbitGlyph variant={personas.find((p) => p.id === personaId)?.glyph ?? 0} className="h-4 w-4 shrink-0" />
                  <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2">{meta ? `${meta.persona ?? "ORBIT"} · ${meta.model}` : "Connecting…"}</span>
                </span>
                {running ? (
                  <button onClick={stop} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-ink-2 hover:bg-soft hover:text-ink">
                    <Square className="h-3 w-3" /> Stop
                  </button>
                ) : (
                  <Badge tone="ai">AI suggestion</Badge>
                )}
              </div>
              <div className="px-3 py-3">
                {notInSources ? <NotInSourcesBanner /> : null}
                {result ? <Markdown text={result} citations={meta?.citations} /> : <OrbitPulse className="h-5 w-5 text-ink" />}
              </div>
              {!running && result ? (
                <div className="flex flex-wrap gap-1.5 border-t border-line p-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(result.replace(NOT_IN_SOURCES, "").trim()).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      });
                    }}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onInsert(result.replace(NOT_IN_SOURCES, "").trim(), label)}>
                    Insert below
                  </Button>
                  {range ? (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmReplace(true)}>
                      Replace selection…
                    </Button>
                  ) : null}
                  {lastAction ? (
                    <Button size="sm" variant="ghost" onClick={() => void run(lastAction, lastAction === "tutor" ? question : undefined)}>
                      <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmReplace}
        onOpenChange={setConfirmReplace}
        title="Replace your selected text?"
        body="Your original selection will be replaced with the AI suggestion. You can undo this with Ctrl/⌘ Z."
        confirmLabel="Replace"
        destructive
        onConfirm={() => {
          if (range) onReplace(range, result.replace(NOT_IN_SOURCES, "").trim());
          setConfirmReplace(false);
        }}
      />
    </div>
  );
}
