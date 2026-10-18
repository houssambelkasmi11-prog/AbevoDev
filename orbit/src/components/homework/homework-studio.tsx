"use client";

import { ArrowLeft, Check, Copy, Download, FileText, FileUp, MessageCircleQuestion, PenLine, Search, Sparkles, Square, Trash2, Wand } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Markdown } from "@/components/app/markdown";
import { NoProviderNotice } from "@/components/app/no-provider";
import { OrbitPulse } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useDebouncedCallback } from "@/lib/client/hooks";
import { streamJson } from "@/lib/client/stream";
import type { AssignmentRequirements, AssignmentRow, AssignmentStepRow, Citation, StageKey, StageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { analyzeAssignment, deleteAssignment, suggestSources, updateAssignment } from "@/server/actions/homework";

const STAGES: { key: StageKey; label: string }[] = [
  { key: "input", label: "Input" },
  { key: "analysis", label: "Analysis" },
  { key: "sources", label: "Sources" },
  { key: "generation", label: "Finished" },
];

const HELP_CHIPS = ["Explain it step by step", "Explain the hardest part simply", "How do I check this is right?"];

const empty: AssignmentRequirements = { subject: null, summary: "", questions: [], instructions: [], dueDate: null, outputFormat: null, objectives: [], constraints: [] };

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HomeworkStudio({
  assignment: initial,
  subjects,
  attachments: initialAttachments,
  library,
  hasProvider,
}: {
  assignment: AssignmentRow;
  steps: AssignmentStepRow[];
  subjects: { id: string; name: string }[];
  attachments: { id: string; title: string; kind: string; status: string }[];
  library: { id: string; title: string; type: "source" | "note" }[];
  hasProvider: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [a, setA] = useState(initial);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [req, setReq] = useState<AssignmentRequirements>(initial.requirements ?? empty);
  const [suggestions, setSuggestions] = useState<{ id: string; title: string; type: "source" | "note"; reason: string }[] | null>(null);
  const [output, setOutput] = useState(initial.ai_output ?? "");
  const [outputModel, setOutputModel] = useState(initial.ai_output_model);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [helpInput, setHelpInput] = useState("");
  const [extra, setExtra] = useState("");
  const [editing, setEditing] = useState(false);
  const [genMode, setGenMode] = useState<"complete" | "help">("complete");
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);

  const patch = async (p: Parameters<typeof updateAssignment>[1]) => {
    const r = await updateAssignment(a.id, p);
    if (r.ok) setA(r.data);
    else toast.error(r.error);
    return r;
  };
  const savePrompt = useDebouncedCallback((v: string) => void patch({ prompt_text: v }), 800);
  const saveOutput = useDebouncedCallback((v: string) => void patch({ ai_output: v }), 900);
  const saveReq = useDebouncedCallback((r: AssignmentRequirements) => void patch({ requirements: r }), 900);

  const aiError = (msg: string) => setError({ message: msg, code: /provider|model/i.test(msg) ? "no_provider" : undefined });

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const upload = async (files: File[]) => {
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("file", f));
    if (a.subject_id) fd.set("subject_id", a.subject_id);
    fd.set("collection", "Assignments");
    setBusy("upload");
    try {
      const res = await fetch("/api/sources/upload", { method: "POST", body: fd });
      const j = (await res.json()) as { created?: { id: string; title: string }[]; rejected?: { name: string; reason: string }[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Upload failed");
      j.rejected?.forEach((r) => toast.error(`${r.name}: ${r.reason}`));
      const created = j.created ?? [];
      if (created.length) {
        const ids = [...a.attachment_source_ids, ...created.map((c) => c.id)];
        await patch({ attachment_source_ids: ids });
        setAttachments((x) => [...x, ...created.map((c) => ({ id: c.id, title: c.title, kind: "file", status: "processing" }))]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const generate = async (mode: "complete" | "help", message?: string) => {
    setGenMode(mode);
    setError(null);
    setStreaming(true);
    setStreamingText("");
    const ctrl = new AbortController();
    abort.current = ctrl;
    let model = "";
    let text = "";
    try {
      await streamJson(
        `/api/homework/${a.id}/generate`,
        { mode, message },
        (e) => {
          if (e.type === "meta") {
            model = String(e.model);
            setCitations((e.citations as Citation[]) ?? []);
          } else if (e.type === "delta") {
            text += e.text;
            setStreamingText(text);
          } else if (e.type === "error") setError({ message: e.message, code: e.code });
        },
        ctrl.signal,
      );
    } finally {
      setStreaming(false);
      if (mode === "help") {
        if (text) setA((x) => ({ ...x, guide_log: [...x.guide_log, { role: "student", content: message || "Explain step by step how this was done." }, { role: "ai", content: text }] }));
        setStreamingText("");
      } else if (text) {
        setOutput(text);
        setOutputModel(model);
        setStreamingText("");
        setEditing(false);
        setA((x) => ({ ...x, ai_output: text, stages: { ...x.stages, generation: "done" } }));
      }
      router.refresh();
    }
  };

  const writing = streaming && genMode === "complete";
  const helping = streaming && genMode === "help";
  const stageOf = (k: StageKey): StageStatus => a.stages[k];
  const reqArray = (k: "questions" | "instructions" | "objectives" | "constraints", label: string) => (
    <Field label={label}>
      <Textarea
        value={req[k].join("\n")}
        onChange={(e) => {
          const next = { ...req, [k]: e.target.value.split("\n").filter((l, i, arr) => l.trim() || i === arr.length - 1) };
          setReq(next);
          saveReq.run({ ...next, [k]: next[k].filter((x) => x.trim()) });
        }}
        className="min-h-[84px] text-[13px]"
        placeholder="One per line"
      />
    </Field>
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/app/homework" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12.5px] text-ink-2 hover:bg-soft hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Homework
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Select aria-label="Status" value={a.status} onChange={(e) => void patch({ status: e.target.value as AssignmentRow["status"] })} className="[&_select]:h-8 [&_select]:text-[12.5px]">
            <option value="planning">Planning</option>
            <option value="in_progress">In progress</option>
            <option value="review">In review</option>
            <option value="complete">Complete</option>
          </Select>
          <button onClick={() => setConfirmDelete(true)} aria-label="Delete assignment" className="rounded-lg p-2 text-ink-3 hover:bg-soft hover:text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <input
        defaultValue={a.title === "Untitled assignment" ? "" : a.title}
        placeholder="Untitled assignment"
        aria-label="Assignment title"
        onBlur={(e) => e.target.value.trim() && e.target.value !== a.title && void patch({ title: e.target.value.trim() })}
        className="mt-4 w-full bg-transparent font-display text-[clamp(1.8rem,3.8vw,2.8rem)] font-bold leading-tight tracking-[-0.035em] placeholder:text-ink-3 focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Select aria-label="Subject" value={a.subject_id ?? ""} onChange={(e) => void patch({ subject_id: e.target.value || null })} className="[&_select]:h-8 [&_select]:rounded-full [&_select]:text-[12px]">
          <option value="">No subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <label className="flex h-8 items-center gap-2 rounded-full border border-line bg-surface px-3 text-[12px]">
          <span className="text-ink-2">Due</span>
          <input
            type="datetime-local"
            defaultValue={toLocalInput(a.due_at)}
            onBlur={(e) => void patch({ due_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="bg-transparent focus:outline-none"
            aria-label="Due date"
          />
        </label>
      </div>

      {/* Stage rail */}
      <nav aria-label="Workflow stages" className="sticky top-14 z-20 -mx-4 mt-8 border-y border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:top-0">
        <ol className="flex items-center gap-1">
          {STAGES.map((s, i) => {
            const st = stageOf(s.key);
            return (
              <li key={s.key} className="flex flex-1 items-center gap-1">
                <a href={`#stage-${s.key}`} className="group flex min-w-0 flex-col items-center gap-1.5 text-center">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[10px] transition-colors",
                      st === "done" ? "border-ink bg-ink text-canvas" : st === "running" ? "border-ink" : st === "error" ? "border-danger text-danger" : st === "stale" ? "border-dashed border-ink-2 text-ink-2" : "border-line-strong text-ink-3",
                    )}
                    title={st}
                  >
                    {st === "done" ? <Check className="h-3.5 w-3.5" /> : st === "running" ? <OrbitPulse className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="label hidden text-[8.5px] text-ink-2 group-hover:text-ink sm:block">{s.label}</span>
                </a>
                {i < STAGES.length - 1 ? <span className={cn("mb-4 h-px flex-1 sm:mb-5", st === "done" ? "bg-ink" : "bg-line")} /> : null}
              </li>
            );
          })}
        </ol>
      </nav>

      {error ? (
        <div className="mt-6">{error.code === "no_provider" ? <NoProviderNotice message={error.message} /> : <p role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-[13px] text-danger">{error.message}</p>}</div>
      ) : null}

      {/* 1 — Input */}
      <section id="stage-input" className="scroll-mt-32 pt-10">
        <StageTitle n="01" title="Input" status={stageOf("input")} />
        <Textarea
          defaultValue={a.prompt_text}
          onChange={(e) => savePrompt.run(e.target.value)}
          placeholder="Paste or type the assignment — questions, instructions, rubric…"
          className="mt-4 min-h-[160px] text-[14px]"
          aria-label="Assignment text"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} loading={busy === "upload"}>
            <FileUp className="h-3.5 w-3.5" /> Upload PDF or photo
          </Button>
          {attachments.map((f) => (
            <Link key={f.id} href={`/app/lessons/${f.id}`} className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface px-3 text-[12px] hover:border-ink">
              {f.title} <span className="label text-ink-3">{f.status}</span>
            </Link>
          ))}
          <input ref={fileRef} type="file" accept=".pdf,image/*,.docx,.txt,.md" multiple hidden onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ""; }} />
        </div>
        <div className="mt-4">
          <Field label="Relevant course notes">
            <Select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && !a.linked_note_ids.includes(id)) void patch({ linked_note_ids: [...a.linked_note_ids, id] });
              }}
            >
              <option value="">Add a note…</option>
              {library.filter((l) => l.type === "note" && !a.linked_note_ids.includes(l.id)).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.linked_note_ids.map((id) => (
              <button key={id} onClick={() => void patch({ linked_note_ids: a.linked_note_ids.filter((x) => x !== id) })} className="h-7 rounded-full bg-soft px-3 text-[12px] hover:line-through">
                {library.find((l) => l.id === id)?.title ?? "Note"} ×
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2 — Analysis */}
      <section id="stage-analysis" className="scroll-mt-32 pt-12">
        <StageTitle
          n="02"
          title="Analysis"
          status={stageOf("analysis")}
          action={
            <Button
              size="sm"
              loading={busy === "analyze"}
              disabled={!hasProvider}
              onClick={() =>
                runAction("analyze", async () => {
                  const r = await analyzeAssignment(a.id);
                  if (r.ok) {
                    setA(r.data);
                    setReq(r.data.requirements ?? empty);
                  } else aiError(r.error);
                })
              }
            >
              <Sparkles className="h-3.5 w-3.5" /> {a.requirements ? "Re-analyse" : "Analyse assignment"}
            </Button>
          }
        />
        {!hasProvider ? <div className="mt-4"><NoProviderNotice compact /></div> : null}
        <p className="mt-2 text-[12.5px] text-ink-2">ORBIT extracts what&apos;s being asked. Review and correct anything — later stages use your edited version.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Summary" className="md:col-span-2">
            <Textarea value={req.summary} onChange={(e) => { const n = { ...req, summary: e.target.value }; setReq(n); saveReq.run(n); }} className="min-h-[64px] text-[13px]" />
          </Field>
          {reqArray("questions", "Questions / tasks")}
          {reqArray("instructions", "Instructions")}
          <Field label="Expected output format">
            <Input value={req.outputFormat ?? ""} onChange={(e) => { const n = { ...req, outputFormat: e.target.value || null }; setReq(n); saveReq.run(n); }} placeholder="e.g. 1200-word essay, MLA" />
          </Field>
          <Field label="Detected subject">
            <Input value={req.subject ?? ""} onChange={(e) => { const n = { ...req, subject: e.target.value || null }; setReq(n); saveReq.run(n); }} />
          </Field>
          {reqArray("objectives", "Learning objectives")}
          {reqArray("constraints", "Teacher constraints")}
        </div>
      </section>

      {/* 3 — Sources */}
      <section id="stage-sources" className="scroll-mt-32 pt-12">
        <StageTitle
          n="03"
          title="Sources"
          status={stageOf("sources")}
          action={
            <Button
              size="sm"
              variant="outline"
              loading={busy === "suggest"}
              onClick={() =>
                runAction("suggest", async () => {
                  const r = await suggestSources(a.id);
                  if (r.ok) setSuggestions(r.data);
                  else toast.error(r.error);
                })
              }
            >
              <Search className="h-3.5 w-3.5" /> Find relevant material
            </Button>
          }
        />
        {suggestions ? (
          <ul className="mt-4 space-y-1.5">
            {suggestions.length === 0 ? <li className="text-[13px] text-ink-2">No matching material in your library yet.</li> : null}
            {suggestions.map((s) => {
              const on = s.type === "source" ? a.selected_source_ids.includes(s.id) : a.linked_note_ids.includes(s.id);
              return (
                <li key={s.id}>
                  <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3", on ? "border-ink bg-surface" : "border-line")}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        void (s.type === "source"
                          ? patch({ selected_source_ids: on ? a.selected_source_ids.filter((x) => x !== s.id) : [...a.selected_source_ids, s.id] })
                          : patch({ linked_note_ids: on ? a.linked_note_ids.filter((x) => x !== s.id) : [...a.linked_note_ids, s.id] }))
                      }
                      className="mt-1 accent-[var(--ink)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium">{s.title}</span>
                      <span className="block text-[12px] text-ink-2">{s.reason}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="mt-4">
          <Field label="Selected sources">
            <Select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id) void patch({ selected_source_ids: [...new Set([...a.selected_source_ids, id])] });
              }}
            >
              <option value="">Add a source from your library…</option>
              {library.filter((l) => l.type === "source" && !a.selected_source_ids.includes(l.id)).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.selected_source_ids.map((id) => (
              <button key={id} onClick={() => void patch({ selected_source_ids: a.selected_source_ids.filter((x) => x !== id) })} className="h-7 rounded-full bg-soft px-3 text-[12px] hover:line-through">
                {library.find((l) => l.id === id)?.title ?? "Source"} ×
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Finished work */}
      <section id="stage-generation" className="scroll-mt-32 pb-24 pt-12">
        <StageTitle n="04" title="Finished work" status={stageOf("generation")} />
        <p className="mt-2 text-[12.5px] text-ink-2">ORBIT writes the whole assignment from your analysis and sources, ready to hand in.</p>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <Field label="Anything specific? (optional)">
            <Input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. 800 words, in Dutch, formal tone, APA references" aria-label="Extra instructions" />
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button disabled={!hasProvider || streaming} loading={writing && !streamingText} onClick={() => void generate("complete", extra)}>
              <Wand className="h-4 w-4" /> {output ? "Rewrite it" : "Do it for me"}
            </Button>
            {streaming ? (
              <Button variant="ghost" onClick={() => abort.current?.abort()}>
                <Square className="h-3.5 w-3.5" /> Stop
              </Button>
            ) : null}
            {!a.requirements ? <span className="text-[12px] text-ink-2">Tip: run the analysis first for the best result.</span> : null}
          </div>
        </div>

        {writing || output ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-soft/60">
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
              <FileText className="h-4 w-4 text-ink-2" />
              <span className="text-[13px] font-medium">{a.title}</span>
              <span className="font-mono text-[10px] text-ink-3">{writing ? "writing…" : `${(output.trim().split(/\s+/).filter(Boolean).length).toLocaleString("en-GB")} words`}</span>
              {!writing ? (
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <button onClick={() => setEditing((e) => !e)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-ink-2 hover:bg-soft hover:text-ink">
                    {editing ? <Check className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />} {editing ? "Done" : "Edit"}
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(output).then(() => toast.show("Copied"))} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-ink-2 hover:bg-soft hover:text-ink">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                  <a href={`/api/homework/${a.id}/export?format=docx&include=final`} download className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12px] hover:bg-soft">
                    <Download className="h-3.5 w-3.5" /> Word
                  </a>
                  <a href={`/print/homework/${a.id}?auto=1`} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-[12px] font-medium text-canvas hover:opacity-90">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </a>
                </div>
              ) : null}
            </div>
            <div className="max-h-[78vh] overflow-y-auto px-3 py-6 sm:px-8" data-lenis-prevent>
              <div className="mx-auto max-w-[760px] rounded-xl border border-line bg-surface px-6 py-8 shadow-soft sm:px-12 sm:py-12">
                {editing ? (
                  <Textarea
                    value={output}
                    onChange={(e) => {
                      setOutput(e.target.value);
                      saveOutput.run(e.target.value);
                    }}
                    className="min-h-[60vh] border-0 font-mono text-[13px] leading-relaxed focus:border-0"
                    aria-label="Edit the finished work (Markdown)"
                  />
                ) : writing && !streamingText ? (
                  <OrbitPulse className="h-6 w-6 text-ink" />
                ) : (
                  <Markdown text={writing ? streamingText : output} citations={citations} />
                )}
              </div>
            </div>
          </div>
        ) : null}

        {output && !writing ? (
          <div className="mt-6 rounded-2xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <MessageCircleQuestion className="h-4 w-4 text-ink-2" />
              <span className="text-[13.5px] font-medium">Need help understanding it?</span>
              <span className="text-[12px] text-ink-2">Ask for steps or an explanation, only when you want one.</span>
            </div>
            {a.guide_log.length || helping ? (
              <ol className="max-h-[520px] space-y-4 overflow-y-auto p-5" data-lenis-prevent>
                {a.guide_log.map((t, i) => (
                  <li key={i} className={t.role === "student" ? "flex justify-end" : ""}>
                    {t.role === "student" ? <p className="max-w-[80%] rounded-2xl rounded-tr-md bg-ink px-4 py-2.5 text-[13.5px] text-canvas">{t.content}</p> : <Markdown text={t.content} />}
                  </li>
                ))}
                {helping ? <li>{streamingText ? <Markdown text={streamingText} /> : <OrbitPulse className="h-5 w-5 text-ink" />}</li> : null}
              </ol>
            ) : null}
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {HELP_CHIPS.map((c) => (
                <button key={c} disabled={streaming || !hasProvider} onClick={() => void generate("help", c)} className="h-8 rounded-full border border-line px-3 text-[12px] text-ink-2 hover:border-ink hover:text-ink disabled:opacity-50">
                  {c}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!helpInput.trim()) return;
                const msg = helpInput;
                setHelpInput("");
                void generate("help", msg);
              }}
            >
              <Input value={helpInput} onChange={(e) => setHelpInput(e.target.value)} placeholder="How did you get question 2?" aria-label="Ask about the finished work" />
              <Button type="submit" variant="outline" disabled={streaming || !hasProvider || !helpInput.trim()}>
                Ask
              </Button>
            </form>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete assignment?"
        body="The assignment, its steps and scheduled sessions are permanently removed. Uploaded attachments stay in your library."
        destructive
        confirmLabel="Delete"
        onConfirm={() =>
          start(async () => {
            const r = await deleteAssignment(a.id);
            if (r.ok) router.push("/app/homework");
            else toast.error(r.error);
          })
        }
      />
    </div>
  );
}

function StageTitle({ n, title, status, action }: { n: string; title: string; status: StageStatus; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-[11px] text-ink-3">{n}</span>
      <h2 className="font-display text-[22px] font-bold tracking-tight">{title}</h2>
      <span className={cn("label", status === "done" ? "text-ok" : status === "error" ? "text-danger" : status === "stale" ? "text-ink-2" : "text-ink-3")}>
        {status === "stale" ? "needs update" : status}
      </span>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}
