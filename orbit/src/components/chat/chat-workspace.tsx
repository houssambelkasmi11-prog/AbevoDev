"use client";

import {
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  Filter,
  History,
  MessagesSquare,
  PanelRight,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Markdown, NOT_IN_SOURCES, NotInSourcesBanner } from "@/components/app/markdown";
import { NoProviderNotice } from "@/components/app/no-provider";
import { OrbitGlyph, OrbitPulse } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Badge, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useMediaQuery } from "@/lib/client/hooks";
import { streamJson } from "@/lib/client/stream";
import type { ChatMode, ChatScope, Citation, MessageRow } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { deleteConversation } from "@/server/actions/chat";
import { estimateCost, ModelPicker, type CredentialLite } from "./model-picker";
import { ScopeDialog, scopeSummary, type ScopeOptions } from "./scope-dialog";

export interface PersonaLite {
  id: string;
  name: string;
  role: string;
  tagline: string;
  glyph: number;
  bestFor: string[];
}

export interface ConversationLite {
  id: string;
  title: string;
  updated_at: string;
  persona_id: string | null;
}

type Msg = Pick<MessageRow, "id" | "role" | "content" | "persona_name" | "model" | "citations" | "grounding" | "error"> & { streaming?: boolean };

const MODES: { key: ChatMode; label: string }[] = [
  { key: "concise", label: "Concise" },
  { key: "detailed", label: "Detailed" },
  { key: "tutorial", label: "Step-by-step" },
  { key: "examples", label: "Examples" },
  { key: "practice", label: "Practice me" },
  { key: "socratic", label: "Ask me questions" },
];

export function ChatWorkspace({
  conversations,
  personas,
  credentials,
  scopeOptions,
  initial,
}: {
  conversations: ConversationLite[];
  personas: PersonaLite[];
  credentials: CredentialLite[];
  scopeOptions: ScopeOptions;
  initial: {
    conversationId: string | null;
    title: string;
    personaId: string | null;
    credentialId: string | null;
    model: string | null;
    mode: ChatMode;
    grounded: boolean;
    scope: ChatScope;
    messages: Msg[];
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const xl = useMediaQuery("(min-width: 1280px)", true);
  const [conversationId, setConversationId] = useState(initial.conversationId);
  const [title, setTitle] = useState(initial.title);
  const [personaId, setPersonaId] = useState(initial.personaId);
  const [credentialId, setCredentialId] = useState(initial.credentialId);
  const [model, setModel] = useState(initial.model);
  const [mode, setMode] = useState<ChatMode>(initial.mode);
  const [grounded, setGrounded] = useState(initial.grounded);
  const [scope, setScope] = useState<ChatScope>(initial.scope);
  const [messages, setMessages] = useState<Msg[]>(initial.messages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [panel, setPanel] = useState<{ kind: "citations"; messageId: string } | { kind: "reader"; id: string } | null>(null);
  const [historyQ, setHistoryQ] = useState("");
  const [toDelete, setToDelete] = useState<ConversationLite | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [, start] = useTransition();
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const persona = personas.find((p) => p.id === personaId) ?? null;
  const activeModel = useMemo(() => {
    const c = credentials.find((x) => x.id === credentialId);
    return c?.models.find((m) => m.id === model);
  }, [credentials, credentialId, model]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: streaming ? "auto" : "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`;
  }, [input]);

  const send = useCallback(
    async (text: string, regenerate = false) => {
      if (streaming) return;
      if (!regenerate && !text.trim()) return;
      setError(null);
      const ctrl = new AbortController();
      abort.current = ctrl;
      setStreaming(true);
      const tempUser: Msg | null = regenerate
        ? null
        : { id: `tmp-u-${Date.now()}`, role: "user", content: text.trim(), persona_name: null, model: null, citations: [], grounding: "none", error: null };
      const tempAssistant: Msg = { id: `tmp-a-${Date.now()}`, role: "assistant", content: "", persona_name: persona?.name ?? null, model: model, citations: [], grounding: "none", error: null, streaming: true };
      setMessages((m) => {
        let next = [...m];
        if (regenerate && next[next.length - 1]?.role === "assistant") next = next.slice(0, -1);
        if (tempUser) next.push(tempUser);
        next.push(tempAssistant);
        return next;
      });
      if (!regenerate) setInput("");

      let assistantId = tempAssistant.id;
      try {
        await streamJson(
          "/api/ai/chat",
          { conversationId: conversationId ?? undefined, content: text, regenerate, personaId, credentialId, model, mode, grounded, scope },
          (e) => {
            if (e.type === "meta") {
              const cid = String(e.conversationId);
              if (!conversationId) {
                setConversationId(cid);
                setTitle(String(e.title ?? "Conversation"));
                window.history.replaceState(null, "", `/app/ai/${cid}`);
              }
              setMessages((m) =>
                m.map((x) =>
                  x.id === assistantId ? { ...x, persona_name: (e.persona as string | null) ?? null, model: String(e.model), citations: (e.citations as Citation[]) ?? [] } : x.id === tempUser?.id && e.userMessageId ? { ...x, id: String(e.userMessageId) } : x,
                ),
              );
            } else if (e.type === "delta") {
              setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: x.content + e.text } : x)));
            } else if (e.type === "done") {
              const realId = String(e.messageId);
              setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, id: realId, streaming: false, grounding: (e.grounding as Msg["grounding"]) ?? x.grounding } : x)));
              assistantId = realId;
            } else if (e.type === "error") {
              setError({ message: e.message, code: e.code });
              setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, streaming: false, error: e.message } : x)));
            }
          },
          ctrl.signal,
        );
      } catch (e) {
        setError({ message: e instanceof Error ? e.message : "Request failed" });
      } finally {
        setStreaming(false);
        setMessages((m) => m.filter((x) => !(x.id === assistantId && !x.content && !x.error)).map((x) => (x.id === assistantId ? { ...x, streaming: false } : x)));
        router.refresh();
      }
    },
    [streaming, persona, model, conversationId, personaId, credentialId, mode, grounded, scope, router],
  );

  const stop = () => {
    abort.current?.abort();
    setStreaming(false);
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    files.forEach((f) => fd.append("file", f));
    try {
      const res = await fetch("/api/sources/upload", { method: "POST", body: fd });
      const j = (await res.json()) as { created?: { id: string; title: string }[]; rejected?: { name: string; reason: string }[]; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Upload failed");
      j.rejected?.forEach((r) => toast.error(`${r.name}: ${r.reason}`));
      if (j.created?.length) {
        setScope((s) => ({ ...s, sourceIds: [...new Set([...s.sourceIds, ...j.created!.map((c) => c.id)])] }));
        setGrounded(true);
        toast.show(`${j.created.length} document${j.created.length > 1 ? "s" : ""} attached — indexing, then grounded answers will cite ${j.created.length > 1 ? "them" : "it"}.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const suggestions = useMemo(() => {
    if (messages.length === 0) {
      const subject = scope.sourceIds.length ? scopeSummary(scope, scopeOptions) : null;
      return [
        subject ? `Summarise the key ideas in ${subject}` : "Explain a concept I'm struggling with",
        subject ? `Quiz me on ${subject}` : "Make me a study plan for this week",
        persona?.bestFor[0] ? `Help me with ${persona.bestFor[0].toLowerCase()}` : "Give me 3 practice questions",
      ];
    }
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && !streaming) return ["Make it simpler", "Give me a worked example", "Quiz me on this"];
    return [];
  }, [messages, scope, scopeOptions, persona, streaming]);

  const hasProvider = credentials.length > 0;
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const citationMsg = panel?.kind === "citations" ? messages.find((m) => m.id === panel.messageId) : null;

  const history = (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button className="w-full" onClick={() => router.push("/app/ai?new=1")}>
          <Plus className="h-4 w-4" /> New conversation
        </Button>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <Input value={historyQ} onChange={(e) => setHistoryQ(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="h-9 pl-9 text-[13px]" />
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" data-lenis-prevent>
        {conversations
          .filter((c) => !historyQ || c.title.toLowerCase().includes(historyQ.toLowerCase()))
          .map((c) => (
            <li key={c.id} className="group relative">
              <Link
                href={`/app/ai/${c.id}`}
                className={cn("block rounded-lg px-3 py-2 pr-8", c.id === conversationId ? "bg-surface shadow-soft" : "hover:bg-soft")}
              >
                <span className="block truncate text-[13px]">{c.title}</span>
                <span className="block font-mono text-[10px] text-ink-3">
                  {personas.find((p) => p.id === c.persona_id)?.name ?? "ORBIT"} · {relativeTime(c.updated_at)}
                </span>
              </Link>
              <button onClick={() => setToDelete(c)} aria-label={`Delete ${c.title}`} className="absolute right-1.5 top-2 rounded p-1 text-ink-3 opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        {conversations.length === 0 ? <li className="px-3 py-6 text-center text-[12.5px] text-ink-2">No conversations yet.</li> : null}
      </ul>
    </div>
  );

  const sidePanel =
    panel?.kind === "citations" && citationMsg ? (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="label text-ink">Sources · {citationMsg.citations.length}</span>
          <button onClick={() => setPanel(null)} aria-label="Close sources" className="rounded p-1 hover:bg-soft">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="flex-1 space-y-2 overflow-y-auto p-3" data-lenis-prevent>
          {citationMsg.citations.map((c) => (
            <li key={c.key} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="rounded border border-ink px-1 font-mono text-[9.5px]">{c.key}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{c.sourceTitle}</span>
                {c.page ? <span className="font-mono text-[10px] text-ink-3">p.{c.page}</span> : null}
              </div>
              {c.heading ? <p className="mt-1 text-[11px] text-ink-2">{c.heading}</p> : null}
              <p className="mt-2 text-[12px] leading-relaxed text-ink-2">{c.excerpt}</p>
              <div className="mt-2 flex gap-3 text-[11.5px]">
                <button onClick={() => setPanel({ kind: "reader", id: c.sourceId })} className="underline-offset-2 hover:underline">
                  Open beside chat
                </button>
                <Link href={c.kind === "note" ? `/app/notes/${c.sourceId}` : `/app/lessons/${c.sourceId}${c.page ? `?page=${c.page}` : ""}#chunk-${c.chunkId}`} className="text-ink-2 underline-offset-2 hover:underline">
                  Go to source
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    ) : panel?.kind === "reader" ? (
      <ReaderPanel id={panel.id} onClose={() => setPanel(null)} />
    ) : null;

  return (
    <div
      className="flex h-[calc(100dvh-56px-64px)] min-h-0 lg:h-[100dvh]"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void uploadFiles([...e.dataTransfer.files]);
      }}
    >
      {/* History */}
      <aside className="hidden w-[260px] shrink-0 border-r border-line xl:block" aria-label="Conversation history">
        {history}
      </aside>

      {/* Main */}
      <section className="relative flex min-w-0 flex-1 flex-col" aria-label="Conversation">
        {dragging ? (
          <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border border-dashed border-ink bg-canvas/80 backdrop-blur-sm">
            <p className="font-display text-xl font-bold">Drop documents to ground this chat</p>
          </div>
        ) : null}

        {/* Header */}
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5 md:px-5">
          <button onClick={() => setHistoryOpen(true)} aria-label="Conversation history" className="rounded-lg p-2 text-ink-2 hover:bg-soft xl:hidden">
            <History className="h-4 w-4" />
          </button>
          <h1 className="mr-auto min-w-0 max-w-[40%] truncate text-[14px] font-medium">{title}</h1>
          <Select aria-label="Personality" value={personaId ?? ""} onChange={(e) => setPersonaId(e.target.value || null)} className="w-[150px] [&_select]:h-8 [&_select]:text-[12.5px]">
            <option value="">ORBIT (neutral)</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <ModelPicker
            credentials={credentials}
            credentialId={credentialId}
            model={model}
            onChange={(c, m) => {
              setCredentialId(c);
              setModel(m);
            }}
            className="w-[190px] [&_select]:h-8 [&_select]:text-[12.5px]"
          />
          <button
            onClick={() => setScopeOpen(true)}
            className={cn("flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[12.5px]", grounded ? "border-ink" : "border-line text-ink-2")}
            title="Choose which sources answers may use"
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="max-w-[140px] truncate">{scopeSummary(scope, scopeOptions)}</span>
          </button>
          <label className="flex h-8 cursor-pointer items-center gap-2 rounded-xl border border-line px-2.5 text-[12.5px]">
            <input type="checkbox" checked={grounded} onChange={(e) => setGrounded(e.target.checked)} className="accent-[var(--ink)]" />
            Grounded
          </label>
          {!xl ? (
            <button onClick={() => setPanel(panel ? null : { kind: "citations", messageId: lastAssistantId ?? "" })} aria-label="Toggle sources panel" className="rounded-lg p-2 text-ink-2 hover:bg-soft">
              <PanelRight className="h-4 w-4" />
            </button>
          ) : null}
        </header>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
          <div className="mx-auto max-w-[760px] px-4 py-8 md:px-6">
            {messages.length === 0 ? (
              <Welcome personas={personas} personaId={personaId} onPick={setPersonaId} hasProvider={hasProvider} />
            ) : (
              <ol className="space-y-8">
                {messages.map((m) => (
                  <li key={m.id} className="animate-rise">
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-ink px-4 py-3 text-[14.5px] leading-relaxed text-canvas">
                          <p translate="no" className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                      </div>
                    ) : (
                      <article>
                        <div className="mb-2 flex items-center gap-2">
                          <OrbitGlyph variant={personas.find((p) => p.name === m.persona_name)?.glyph ?? 0} className="h-5 w-5" />
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
                            {m.persona_name ?? "ORBIT"} {m.model ? <span className="text-ink-3">· {m.model}</span> : null}
                          </span>
                          {m.grounding === "grounded" ? <Badge tone="ok">Cited</Badge> : m.grounding === "partial" ? <Badge>Partly cited</Badge> : null}
                        </div>
                        {m.content.trimStart().startsWith(NOT_IN_SOURCES) || m.grounding === "ungrounded" ? <NotInSourcesBanner /> : null}
                        {m.content ? <Markdown text={m.content} citations={m.citations} className="text-[15px]" /> : m.streaming ? (
                          <span className="flex items-center gap-2.5">
                            <OrbitPulse className="h-5 w-5 text-ink" label="Thinking" />
                            <span className="fx-shimmer-text font-mono text-[11px] uppercase tracking-[0.18em]">Thinking</span>
                          </span>
                        ) : null}
                        {m.error && m.error !== "Stopped by student" ? <p className="mt-2 text-[12.5px] text-danger">{m.error}</p> : null}
                        {m.error === "Stopped by student" ? <p className="label mt-2 text-ink-3">Stopped</p> : null}
                        {!m.streaming && m.content ? (
                          <div className="mt-3 flex flex-wrap items-center gap-1">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(m.content.replace(NOT_IN_SOURCES, "").trim()).then(() => {
                                  setCopied(m.id);
                                  setTimeout(() => setCopied(null), 1500);
                                });
                              }}
                              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-ink-2 hover:bg-soft hover:text-ink"
                            >
                              {copied === m.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
                            </button>
                            {m.id === lastAssistantId ? (
                              <button onClick={() => void send("", true)} disabled={streaming} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-ink-2 hover:bg-soft hover:text-ink">
                                <RotateCcw className="h-3 w-3" /> Regenerate
                              </button>
                            ) : null}
                            {m.citations.length ? (
                              <button onClick={() => setPanel({ kind: "citations", messageId: m.id })} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-ink-2 hover:bg-soft hover:text-ink">
                                <BookOpen className="h-3 w-3" /> {m.citations.length} source{m.citations.length > 1 ? "s" : ""}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {error ? (
              <div className="mt-6">
                {error.code === "no_provider" ? (
                  <NoProviderNotice message={error.message} />
                ) : (
                  <div role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-[13px] text-danger">
                    {error.message}
                  </div>
                )}
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-line bg-canvas px-3 pb-3 pt-2 md:px-5">
          <div className="mx-auto max-w-[760px]">
            <div className="scrollbar-none mb-2 flex gap-1.5 overflow-x-auto">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  aria-pressed={mode === m.key}
                  className={cn("h-7 shrink-0 rounded-full border px-3 text-[11.5px] transition-colors", mode === m.key ? "border-ink bg-ink text-canvas" : "border-line text-ink-2 hover:text-ink")}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {suggestions.length && !input ? (
              <div className="scrollbar-none mb-2 flex gap-1.5 overflow-x-auto">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => void send(s)} disabled={streaming || !hasProvider} className="h-7 shrink-0 rounded-lg bg-soft px-3 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-soft focus-within:border-ink"
            >
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach documents" className="rounded-lg p-2 text-ink-2 hover:bg-soft hover:text-ink">
                {uploading ? <OrbitPulse className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
              </button>
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                placeholder={persona ? `Ask ${persona.name}…` : "Ask anything about your studies…"}
                aria-label="Message"
                className="max-h-[220px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[14.5px] leading-relaxed placeholder:text-ink-3 focus:outline-none"
              />
              {streaming ? (
                <button type="button" onClick={stop} aria-label="Stop generating" className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-canvas">
                  <Square className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} aria-label="Send" className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-canvas disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </form>
            <p className="mt-1.5 flex justify-between px-1 font-mono text-[9.5px] text-ink-3">
              <span>{grounded ? `Grounded · ${scopeSummary(scope, scopeOptions)}` : "General knowledge"} · Enter to send · AI can make mistakes — check important facts</span>
              <span>{estimateCost(input.length + messages.reduce((n, m) => n + m.content.length, 0), activeModel) ?? ""}</span>
            </p>
            <input ref={fileRef} type="file" multiple hidden accept=".pdf,.docx,.md,.txt,.vtt,.srt,image/*" onChange={(e) => { void uploadFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
          </div>
        </div>
      </section>

      {/* Split panel */}
      {xl && sidePanel ? <aside className="w-[420px] shrink-0 border-l border-line bg-surface">{sidePanel}</aside> : null}
      {!xl ? (
        <Dialog open={!!sidePanel} onOpenChange={(o) => !o && setPanel(null)} title={panel?.kind === "reader" ? "Reader" : "Sources"} side="right" className="[&>div:last-child]:p-0">
          <div className="h-[calc(100dvh-74px)]">{sidePanel}</div>
        </Dialog>
      ) : null}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen} title="Conversations" side="right" className="[&>div:last-child]:p-0">
        <div className="h-[calc(100dvh-74px)]">{history}</div>
      </Dialog>

      <ScopeDialog open={scopeOpen} onOpenChange={setScopeOpen} scope={scope} onSave={(s) => { setScope(s); if (s.sourceIds.length + s.subjectIds.length + s.noteIds.length + s.collections.length) setGrounded(true); }} options={scopeOptions} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete conversation?"
        body="This permanently removes the conversation and its messages."
        destructive
        confirmLabel="Delete"
        onConfirm={() =>
          start(async () => {
            if (!toDelete) return;
            const r = await deleteConversation(toDelete.id);
            setToDelete(null);
            if (!r.ok) return toast.error(r.error);
            if (toDelete.id === conversationId) router.push("/app/ai");
            else router.refresh();
          })
        }
      />
    </div>
  );
}

function Welcome({ personas, personaId, onPick, hasProvider }: { personas: PersonaLite[]; personaId: string | null; onPick: (id: string) => void; hasProvider: boolean }) {
  return (
    <div>
      <p className="label text-ink-3">AI Studio</p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-[1.05] tracking-[-0.035em]">
        Who would you like
        <span className="serif-accent block font-normal text-ink-2">to learn with?</span>
      </h2>
      {!hasProvider ? (
        <div className="mt-6">
          <NoProviderNotice />
        </div>
      ) : null}
      <div className="mt-8 grid gap-2 sm:grid-cols-2">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            aria-pressed={personaId === p.id}
            className={cn("flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-300", personaId === p.id ? "border-ink bg-ink text-canvas" : "border-line bg-surface hover:border-line-strong")}
          >
            <OrbitGlyph variant={p.glyph} className="h-9 w-9" />
            <span className="min-w-0">
              <span className="block font-display text-[14px] font-bold tracking-[0.12em]">{p.name}</span>
              <span className={cn("block text-[12px]", personaId === p.id ? "text-canvas/70" : "text-ink-2")}>{p.role}</span>
              {p.tagline ? <span className={cn("mt-1.5 block text-[12px] leading-snug", personaId === p.id ? "text-canvas/60" : "text-ink-3")}>{p.tagline}</span> : null}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-6 flex items-center gap-2 text-[12.5px] text-ink-2">
        <MessagesSquare className="h-3.5 w-3.5" /> Tip: drop documents anywhere to ground answers in them.
      </p>
    </div>
  );
}

function ReaderPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<{ title: string; kind: string; fileUrl: string | null; text: string | null; href: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setData(null);
    setErr(null);
    fetch(`/api/sources/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn't load source"))))
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, [id]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{data?.title ?? "Loading…"}</span>
        {data ? (
          <Link href={data.href} className="label text-ink-2 hover:text-ink">
            Open
          </Link>
        ) : null}
        <button onClick={onClose} aria-label="Close reader" className="rounded p-1 hover:bg-soft">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
        {err ? <p className="p-4 text-[13px] text-danger">{err}</p> : null}
        {!data && !err ? <OrbitPulse className="m-4 h-5 w-5 text-ink" /> : null}
        {data?.kind === "pdf" && data.fileUrl ? <iframe src={data.fileUrl} title={data.title} className="h-full w-full" /> : null}
        {data?.kind === "image" && data.fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.fileUrl} alt={data.title} className="w-full" />
        ) : null}
        {data && data.kind !== "pdf" && data.kind !== "image" ? <pre className="whitespace-pre-wrap p-5 font-sans text-[13.5px] leading-relaxed">{data.text ?? "No text extracted."}</pre> : null}
      </div>
    </div>
  );
}
