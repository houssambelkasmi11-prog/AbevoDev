"use client";

import { FileUp, Link2, Pin, Plus, Search, Trash2, Type, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { OrbitPulse } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { SourceRow, SubjectRow } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { addTextSource, addUrlSource, deleteSource, getSourceStatuses } from "@/server/actions/sources";
import { formatBytes, KIND_LABEL, STATUS_LABEL } from "./source-meta";
import { TabPill } from "@/components/fx/motion-kit";

type SourceLite = Pick<SourceRow, "id" | "title" | "kind" | "status" | "status_detail" | "progress" | "subject_id" | "collection" | "pinned" | "size_bytes" | "page_count" | "updated_at">;

interface UploadItem {
  name: string;
  progress: number;
  error?: string;
}

export function LessonsLibrary({ sources: initial, subjects }: { sources: SourceLite[]; subjects: Pick<SubjectRow, "id" | "name">[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [sources, setSources] = useState(initial);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [addOpen, setAddOpen] = useState(params.get("add") === "1");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<SourceLite | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setSources(initial), [initial]);

  // Poll while anything is processing.
  const active = sources.filter((s) => s.status === "queued" || s.status === "processing").map((s) => s.id);
  const activeKey = active.join(",");
  useEffect(() => {
    if (!activeKey) return;
    const ids = activeKey.split(",");
    const t = setInterval(async () => {
      const r = await getSourceStatuses(ids);
      if (!r.ok) return;
      setSources((prev) => prev.map((s) => ({ ...s, ...(r.data.find((x) => x.id === s.id) ?? {}) })));
      if (r.data.every((x) => x.status !== "queued" && x.status !== "processing")) router.refresh();
    }, 1500);
    return () => clearInterval(t);
  }, [activeKey, router]);

  const upload = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      const fd = new FormData();
      files.forEach((f) => fd.append("file", f));
      if (subject) fd.set("subject_id", subject);
      const label = files.length === 1 ? files[0].name : `${files.length} files`;
      setUploads((u) => [...u, { name: label, progress: 0 }]);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/sources/upload");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploads((u) => u.map((x) => (x.name === label ? { ...x, progress: e.loaded / e.total } : x)));
      };
      xhr.onload = () => {
        setUploads((u) => u.filter((x) => x.name !== label));
        try {
          const res = JSON.parse(xhr.responseText) as { created?: { id: string }[]; rejected?: { name: string; reason: string }[]; error?: string };
          if (xhr.status >= 400) return toast.error(res.error ?? "Upload failed");
          res.rejected?.forEach((r) => toast.error(`${r.name}: ${r.reason}`));
          if (res.created?.length) toast.show(`${res.created.length} source${res.created.length > 1 ? "s" : ""} uploaded — processing`);
        } catch {
          toast.error("Upload failed");
        }
        router.refresh();
      };
      xhr.onerror = () => {
        setUploads((u) => u.filter((x) => x.name !== label));
        toast.error("Upload failed — check your connection.");
      };
      xhr.send(fd);
    },
    [subject, router, toast],
  );

  const filtered = useMemo(
    () =>
      sources.filter((s) => (!subject || s.subject_id === subject) && (!q || s.title.toLowerCase().includes(q.toLowerCase()) || (s.collection ?? "").toLowerCase().includes(q.toLowerCase()))),
    [sources, subject, q],
  );
  const subjectName = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        upload([...e.dataTransfer.files]);
      }}
      className="relative"
    >
      {/* Dropzone */}
      <button
        onClick={() => fileRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-ink bg-soft" : "border-line-strong hover:border-ink-2 hover:bg-surface",
        )}
      >
        <UploadCloud className="h-6 w-6 text-ink-2" />
        <span className="mt-3 font-display text-lg font-bold tracking-tight">Drop lessons here</span>
        <span className="mt-1 text-[13px] text-ink-2">PDF, DOCX, Markdown, text, transcripts (VTT/SRT) and images · up to 50 MB each</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        accept=".pdf,.docx,.md,.markdown,.txt,.vtt,.srt,image/*"
        onChange={(e) => {
          upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />

      {uploads.length ? (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.name} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px]">
              <OrbitPulse className="h-4 w-4 text-ink" />
              <span className="flex-1 truncate">Uploading {u.name}</span>
              <span className="h-1 w-32 overflow-hidden rounded-full bg-soft">
                <span className="block h-full bg-ink transition-[width]" style={{ width: `${Math.round(u.progress * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons and collections…" aria-label="Search lessons" className="pl-10" />
        </div>
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Filter by subject" className="sm:w-56">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add source
        </Button>
      </div>

      {sources.length === 0 ? (
        <EmptyState title="Your library is waiting." body="Upload a lecture PDF, paste a transcript, or add a web page. ORBIT extracts, structures and indexes it for grounded answers." compact className="mt-6" />
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
          {filtered.map((s) => (
            <li key={s.id} className="group flex items-center gap-4 px-4 py-3.5 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line font-mono text-[9px] uppercase tracking-wider text-ink-2">{KIND_LABEL[s.kind].slice(0, 4)}</span>
              <Link href={`/app/lessons/${s.id}`} className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium group-hover:underline">{s.title}</span>
                  {s.pinned ? <Pin className="h-3 w-3 shrink-0 text-ink-3" /> : null}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-ink-2">
                  {[KIND_LABEL[s.kind], s.subject_id ? subjectName.get(s.subject_id) : null, s.collection, s.page_count ? `${s.page_count} pages` : null, formatBytes(s.size_bytes), relativeTime(s.updated_at)].filter(Boolean).join(" · ")}
                </span>
              </Link>
              <StatusPill s={s} />
              <button onClick={() => setToDelete(s)} aria-label={`Delete ${s.title}`} className="rounded-lg p-2 text-ink-3 opacity-0 transition-opacity hover:bg-soft hover:text-danger focus:opacity-100 group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {filtered.length === 0 ? <li className="px-5 py-8 text-center text-[13px] text-ink-2">No sources match.</li> : null}
        </ul>
      )}

      <AddSourceDialog open={addOpen} onOpenChange={setAddOpen} subjects={subjects} onUpload={() => fileRef.current?.click()} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this source?"
        body={`“${toDelete?.title}” and its indexed passages will be permanently removed. Notes that cited it keep their text.`}
        confirmLabel="Delete source"
        destructive
        loading={pending}
        onConfirm={() =>
          start(async () => {
            if (!toDelete) return;
            const r = await deleteSource(toDelete.id);
            if (r.ok) {
              setSources((prev) => prev.filter((x) => x.id !== toDelete.id));
              toast.show("Source deleted");
            } else toast.error(r.error);
            setToDelete(null);
          })
        }
      />
    </div>
  );
}

function StatusPill({ s }: { s: SourceLite }) {
  if (s.status === "queued" || s.status === "processing")
    return (
      <span className="hidden items-center gap-2 text-[11.5px] text-ink-2 sm:flex" title={s.status_detail ?? undefined}>
        <OrbitPulse className="h-4 w-4 text-ink" />
        {s.progress}%
      </span>
    );
  return (
    <span
      title={s.status_detail ?? undefined}
      className={cn(
        "hidden shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] sm:inline",
        s.status === "ready" ? "text-ok" : s.status === "failed" ? "text-danger" : "text-ink-2",
      )}
    >
      {STATUS_LABEL[s.status]}
    </span>
  );
}

function AddSourceDialog({ open, onOpenChange, subjects, onUpload }: { open: boolean; onOpenChange: (o: boolean) => void; subjects: Pick<SubjectRow, "id" | "name">[]; onUpload: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"link" | "text">("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"text" | "markdown" | "transcript" | "summary">("summary");
  const [subjectId, setSubjectId] = useState("");
  const [collection, setCollection] = useState("");
  const [pending, start] = useTransition();

  const done = (id: string) => {
    onOpenChange(false);
    setUrl("");
    setTitle("");
    setText("");
    router.push(`/app/lessons/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Add a source" description="Everything you add is private to your account.">
      <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-soft p-1" role="tablist">
        {(
          [
            ["upload", "Upload", FileUp],
            ["link", "Link", Link2],
            ["text", "Write / paste", Type],
          ] as const
        ).map(([k, l, Icon]) => (
          <button
            key={k}
            role="tab"
            aria-selected={k !== "upload" && tab === k}
            onClick={() => {
              if (k === "upload") {
                onOpenChange(false);
                onUpload();
              } else setTab(k);
            }}
            className={cn("relative isolate flex h-9 items-center justify-center gap-2 rounded-lg text-[13px] transition-colors", k !== "upload" && tab === k ? "font-medium text-ink" : "text-ink-2 hover:text-ink")}
          >
            {k !== "upload" && tab === k ? <TabPill id="add-source-tabs" /> : null}
            <span className="relative z-[1] flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" /> {l}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Subject">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">None</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Collection">
          <Input value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="e.g. Midterm" />
        </Field>
      </div>

      {tab === "link" ? (
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await addUrlSource({ url, subject_id: subjectId || null, collection: collection || null });
              if (r.ok) done(r.data.id);
              else toast.error(r.error);
            });
          }}
        >
          <Field label="Web page or YouTube URL" hint="YouTube lessons need their transcript pasted after adding (no unofficial scraping).">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" type="url" required autoFocus />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Add link
            </Button>
          </div>
        </form>
      ) : (
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await addTextSource({ title, text, kind, subject_id: subjectId || null, collection: collection || null });
              if (r.ok) done(r.data.id);
              else toast.error(r.error);
            });
          }}
        >
          <div className="grid grid-cols-[1fr_160px] gap-3">
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Lecture 4 — summary" />
            </Field>
            <Field label="Type">
              <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                <option value="summary">My lesson summary</option>
                <option value="transcript">Lecture transcript</option>
                <option value="markdown">Markdown</option>
                <option value="text">Plain text</option>
              </Select>
            </Field>
          </div>
          <Field label="Content">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} required className="min-h-[200px] font-mono text-[12.5px]" placeholder="Paste or write here…" />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Add to library
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
