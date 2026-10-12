"use client";

import { ArrowLeft, ExternalLink, MessagesSquare, Pin, PinOff, RefreshCw, ScanText, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Markdown } from "@/components/app/markdown";
import { NoProviderNotice } from "@/components/app/no-provider";
import { OrbitPulse } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge, Field, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { SourceChunkRow, SourceRow, SubjectRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { extractSourceWithAI, getSourceStatuses, reprocessSource, setTranscript, summarizeSource, updateSource } from "@/server/actions/sources";
import { KIND_LABEL, STATUS_LABEL } from "./source-meta";

type ChunkLite = Pick<SourceChunkRow, "id" | "ord" | "content" | "page" | "heading">;

export function LessonView({
  source,
  chunks,
  subjects,
  fileUrl,
  initialPage,
  hasProvider,
}: {
  source: Omit<SourceRow, "text"> & { textPreview: string | null };
  chunks: ChunkLite[];
  subjects: Pick<SubjectRow, "id" | "name">[];
  fileUrl: string | null;
  initialPage: number | null;
  hasProvider: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"outline" | "summary" | "passages">(source.summary ? "summary" : source.outline.length ? "outline" : "passages");
  const [page, setPage] = useState<number | null>(initialPage);
  const [status, setStatus] = useState({ status: source.status, progress: source.progress, detail: source.status_detail });
  const [transcript, setTranscriptText] = useState("");
  const [pending, start] = useTransition();
  const [summary, setSummary] = useState(source.summary);
  const [summaryModel, setSummaryModel] = useState(source.summary_model);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  // Poll processing status.
  useEffect(() => {
    if (status.status !== "queued" && status.status !== "processing") return;
    const t = setInterval(async () => {
      const r = await getSourceStatuses([source.id]);
      if (!r.ok || !r.data[0]) return;
      const s = r.data[0];
      setStatus({ status: s.status, progress: s.progress, detail: s.status_detail });
      if (s.status !== "queued" && s.status !== "processing") router.refresh();
    }, 1500);
    return () => clearInterval(t);
  }, [status.status, source.id, router]);

  // Deep link to a cited passage: #chunk-<id>
  useEffect(() => {
    const id = window.location.hash.replace("#chunk-", "");
    if (id && chunks.some((c) => c.id === id)) {
      setTab("passages");
      setHighlight(id);
      setTimeout(() => document.getElementById(`chunk-${id}`)?.scrollIntoView({ block: "center" }), 120);
    }
  }, [chunks]);

  const pdfSrc = useMemo(() => (fileUrl && source.kind === "pdf" ? `${fileUrl}${page ? `#page=${page}` : ""}` : null), [fileUrl, page, source.kind]);

  const save = (patch: Parameters<typeof updateSource>[1]) =>
    start(async () => {
      const r = await updateSource(source.id, patch);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });

  const tabBtn = (k: typeof tab, label: string, count?: number) => (
    <button role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("h-9 rounded-lg px-3 text-[12.5px]", tab === k ? "bg-surface font-medium shadow-soft" : "text-ink-2 hover:text-ink")}>
      {label}
      {count !== undefined ? <span className="ml-1.5 font-mono text-[10px] text-ink-3">{count}</span> : null}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 md:px-10 md:py-8">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/app/lessons" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12.5px] text-ink-2 hover:bg-soft hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Library
        </Link>
        <Badge>{KIND_LABEL[source.kind]}</Badge>
        <Badge tone={status.status === "ready" ? "ok" : status.status === "failed" ? "danger" : "neutral"}>{STATUS_LABEL[status.status]}</Badge>
        {source.page_count ? <span className="font-mono text-[10.5px] text-ink-3">{source.page_count} pages</span> : null}
        <div className="ml-auto flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => save({ pinned: !source.pinned })}>
            {source.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} {source.pinned ? "Unpin" : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push(`/app/ai?source=${source.id}`)} disabled={status.status !== "ready"}>
            <MessagesSquare className="h-3.5 w-3.5" /> Ask about this
          </Button>
        </div>
      </div>

      <input
        defaultValue={source.title}
        aria-label="Source title"
        onBlur={(e) => e.target.value.trim() && e.target.value !== source.title && save({ title: e.target.value.trim() })}
        className="mt-4 w-full bg-transparent font-display text-[clamp(1.6rem,3.4vw,2.6rem)] font-bold leading-tight tracking-[-0.035em] focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Select aria-label="Subject" value={source.subject_id ?? ""} onChange={(e) => save({ subject_id: e.target.value || null })} className="[&_select]:h-8 [&_select]:rounded-full [&_select]:text-[12px]">
          <option value="">No subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <input
          defaultValue={source.collection ?? ""}
          onBlur={(e) => e.target.value !== (source.collection ?? "") && save({ collection: e.target.value.trim() || null })}
          placeholder="Collection"
          aria-label="Collection"
          className="h-8 w-36 rounded-full border border-line bg-surface px-3 text-[12px] focus:border-ink focus:outline-none"
        />
        {source.url ? (
          <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] text-ink-2 hover:text-ink">
            Original <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>

      {/* Status panels */}
      {status.status === "queued" || status.status === "processing" ? (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-surface p-5" role="status">
          <OrbitPulse className="h-6 w-6 text-ink" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium">{status.detail ?? "Processing…"}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-soft">
              <div className="h-full bg-ink transition-[width] duration-500" style={{ width: `${status.progress}%` }} />
            </div>
          </div>
          <span className="font-mono text-[12px] text-ink-2">{status.progress}%</span>
        </div>
      ) : null}

      {status.status === "failed" ? (
        <div className="mt-6 rounded-2xl border border-danger/40 p-5" role="alert">
          <p className="label text-danger">Processing failed</p>
          <p className="mt-1 text-[13.5px]">{status.detail}</p>
          <Button size="sm" variant="outline" className="mt-3" loading={pending} onClick={() => start(async () => { const r = await reprocessSource(source.id); if (r.ok) setStatus({ status: "queued", progress: 0, detail: "Queued" }); })}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : null}

      {status.status === "needs_input" ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong p-5">
          <p className="label text-ink-3">Needs your input</p>
          <p className="mt-1 text-[13.5px] leading-relaxed">{status.detail}</p>
          {source.kind === "youtube" ? (
            <form
              className="mt-4 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await setTranscript(source.id, transcript);
                  if (r.ok) setStatus({ status: "queued", progress: 0, detail: "Queued" });
                  else toast.error(r.error);
                });
              }}
            >
              <Field label="Transcript">
                <Textarea value={transcript} onChange={(e) => setTranscriptText(e.target.value)} className="min-h-[180px] font-mono text-[12px]" placeholder="Paste the transcript text…" required />
              </Field>
              <Button type="submit" loading={pending} className="self-start">
                Index transcript
              </Button>
            </form>
          ) : source.kind === "image" || source.kind === "pdf" ? (
            hasProvider ? (
              <Button
                className="mt-4"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const r = await extractSourceWithAI(source.id);
                    if (r.ok) setStatus({ status: "processing", progress: 10, detail: "Reading with AI…" });
                    else toast.error(r.error);
                  })
                }
              >
                <ScanText className="h-4 w-4" /> Extract text with AI
              </Button>
            ) : (
              <div className="mt-4">
                <NoProviderNotice compact message="Text extraction for images and scanned PDFs runs through your own vision-capable model." />
              </div>
            )
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        {/* Viewer */}
        <section aria-label="Document" className="min-h-[50vh] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
          {pdfSrc ? (
            <iframe key={pdfSrc} src={pdfSrc} title={source.title} className="h-[78vh] w-full" />
          ) : source.kind === "image" && fileUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={source.title} className="max-h-[78vh] w-full object-contain" />
          ) : source.textPreview ? (
            <div className="max-h-[78vh] overflow-y-auto p-6 md:p-8" data-lenis-prevent>
              <pre className="whitespace-pre-wrap font-sans text-[14.5px] leading-[1.75] text-ink">{source.textPreview}</pre>
            </div>
          ) : (
            <div className="flex h-[50vh] items-center justify-center text-[13px] text-ink-2">No preview available yet.</div>
          )}
        </section>

        {/* Study panel */}
        <section aria-label="Study tools" className="flex min-h-0 flex-col rounded-2xl border border-line bg-canvas">
          <div className="flex gap-1 border-b border-line p-1.5" role="tablist">
            {tabBtn("outline", "Outline", source.outline.length)}
            {tabBtn("summary", "Summary")}
            {tabBtn("passages", "Passages", chunks.length)}
          </div>
          <div className="max-h-[72vh] min-h-[40vh] overflow-y-auto p-4" data-lenis-prevent>
            {tab === "outline" ? (
              source.outline.length ? (
                <ol className="space-y-0.5">
                  {source.outline.map((o, i) => (
                    <li key={i}>
                      <button
                        onClick={() => o.page && setPage(o.page)}
                        disabled={!o.page}
                        className="flex w-full items-baseline gap-3 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-soft disabled:cursor-default disabled:hover:bg-transparent"
                        style={{ paddingLeft: 8 + (o.level - 1) * 14 }}
                      >
                        <span className="flex-1">{o.title}</span>
                        {o.page ? <span className="font-mono text-[10.5px] text-ink-3">p.{o.page}</span> : null}
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-8 text-center text-[13px] text-ink-2">No headings were detected in this source.</p>
              )
            ) : null}

            {tab === "summary" ? (
              <div>
                {summary ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <Badge tone="ai">AI summary · {summaryModel}</Badge>
                    </div>
                    <Markdown text={summary} />
                  </>
                ) : (
                  <p className="text-[13px] text-ink-2">Generate a concise study summary grounded only in this document.</p>
                )}
                {providerError ? (
                  <div className="mt-4">
                    <NoProviderNotice compact message={providerError} />
                  </div>
                ) : null}
                <Button
                  size="sm"
                  variant={summary ? "outline" : "primary"}
                  className="mt-4"
                  loading={pending}
                  disabled={status.status !== "ready"}
                  onClick={() =>
                    start(async () => {
                      setProviderError(null);
                      const r = await summarizeSource(source.id);
                      if (r.ok) {
                        setSummary(r.data.summary);
                        setSummaryModel(r.data.model);
                      } else if (/provider|model/i.test(r.error)) setProviderError(r.error);
                      else toast.error(r.error);
                    })
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" /> {summary ? "Regenerate summary" : "Generate summary"}
                </Button>
              </div>
            ) : null}

            {tab === "passages" ? (
              chunks.length ? (
                <ol className="space-y-2">
                  {chunks.map((c) => (
                    <li
                      key={c.id}
                      id={`chunk-${c.id}`}
                      className={cn("rounded-xl border p-3 transition-colors", highlight === c.id ? "border-ink bg-surface shadow-soft" : "border-line bg-surface/60")}
                    >
                      <div className="flex items-center gap-2 text-ink-3">
                        <span className="font-mono text-[10px]">#{c.ord + 1}</span>
                        {c.page ? (
                          <button onClick={() => setPage(c.page)} className="font-mono text-[10px] underline-offset-2 hover:text-ink hover:underline">
                            p.{c.page}
                          </button>
                        ) : null}
                        {c.heading ? <span className="truncate text-[11px]">{c.heading}</span> : null}
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">{c.content}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-8 text-center text-[13px] text-ink-2">No indexed passages yet.</p>
              )
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
