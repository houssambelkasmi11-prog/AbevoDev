"use client";

import { FileText, Pin, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { NoteRow, SubjectRow } from "@/lib/types";
import { cn, relativeTime, truncate } from "@/lib/utils";
import { createNote } from "@/server/actions/notes";

type NoteLite = Pick<NoteRow, "id" | "title" | "plain" | "folder" | "tags" | "pinned" | "subject_id" | "updated_at" | "word_count">;

export function NotesBrowser({ notes, subjects }: { notes: NoteLite[]; subjects: Pick<SubjectRow, "id" | "name">[] }) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const folders = useMemo(() => [...new Set(notes.map((n) => n.folder).filter((f): f is string => !!f))].sort(), [notes]);
  const tags = useMemo(() => [...new Set(notes.flatMap((n) => n.tags))].sort(), [notes]);
  const subjectName = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  const filtered = notes.filter((n) => {
    if (folder && n.folder !== folder) return false;
    if (tag && !n.tags.includes(tag)) return false;
    if (subject && n.subject_id !== subject) return false;
    if (q) {
      const t = q.toLowerCase();
      return n.title.toLowerCase().includes(t) || n.plain.toLowerCase().includes(t) || n.tags.some((x) => x.toLowerCase().includes(t));
    }
    return true;
  });
  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  const create = () =>
    start(async () => {
      const r = await createNote({ folder, subject_id: subject });
      if (r.ok) router.push(`/app/notes/${r.data.id}`);
      else toast.error(r.error);
    });

  if (notes.length === 0) {
    return (
      <EmptyState
        body="Capture a lecture, a thought, or a question. Notes become stars in your knowledge universe."
        action={
          <Button onClick={create} loading={pending}>
            <Plus className="h-4 w-4" /> Create your first note
          </Button>
        }
      />
    );
  }

  const chip = (active: boolean) =>
    cn("h-7 rounded-full border px-3 text-[12px] transition-colors", active ? "border-ink bg-ink text-canvas" : "border-line text-ink-2 hover:border-ink-2 hover:text-ink");

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-6">
        <Button onClick={create} loading={pending} className="w-full">
          <Plus className="h-4 w-4" /> New note
        </Button>
        <div>
          <p className="label mb-2 text-ink-3">Folders</p>
          <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
            <li>
              <button onClick={() => setFolder(null)} className={cn("w-full rounded-lg px-2.5 py-1.5 text-left text-[13px]", !folder ? "bg-surface font-medium shadow-soft" : "text-ink-2 hover:bg-soft")}>
                All notes <span className="ml-1 font-mono text-[10px] text-ink-3">{notes.length}</span>
              </button>
            </li>
            {folders.map((f) => (
              <li key={f}>
                <button onClick={() => setFolder(f)} className={cn("w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px]", folder === f ? "bg-surface font-medium shadow-soft" : "text-ink-2 hover:bg-soft")}>
                  {f}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {subjects.length ? (
          <div>
            <p className="label mb-2 text-ink-3">Subjects</p>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => (
                <button key={s.id} onClick={() => setSubject(subject === s.id ? null : s.id)} className={chip(subject === s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {tags.length ? (
          <div>
            <p className="label mb-2 text-ink-3">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button key={t} onClick={() => setTag(tag === t ? null : t)} className={chip(tag === t)}>
                  #{t}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </aside>

      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" aria-label="Search notes" className="pl-10" />
        </div>
        {pinned.length ? (
          <section className="mt-6">
            <h2 className="label mb-3 flex items-center gap-2 text-ink-3">
              <Pin className="h-3 w-3" /> Pinned
            </h2>
            <NoteGrid notes={pinned} subjectName={subjectName} />
          </section>
        ) : null}
        <section className="mt-6">
          {pinned.length ? <h2 className="label mb-3 text-ink-3">All</h2> : null}
          {rest.length ? <NoteGrid notes={rest} subjectName={subjectName} /> : <p className="py-10 text-center text-[13px] text-ink-2">No notes match these filters.</p>}
        </section>
      </div>
    </div>
  );
}

function NoteGrid({ notes, subjectName }: { notes: NoteLite[]; subjectName: Map<string, string> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {notes.map((n) => (
        <li key={n.id}>
          <Link href={`/app/notes/${n.id}`} className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-strong">
            <div className="flex items-center gap-2 text-ink-3">
              <FileText className="h-3.5 w-3.5" />
              <span className="label truncate">{n.subject_id ? subjectName.get(n.subject_id) ?? "Subject" : n.folder ?? "Note"}</span>
              {n.pinned ? <Pin className="ml-auto h-3 w-3" /> : null}
            </div>
            <h3 className="mt-3 line-clamp-2 font-display text-[17px] font-bold leading-tight tracking-tight">{n.title || "Untitled"}</h3>
            <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-ink-2">{truncate(n.plain, 220) || "Empty note"}</p>
            <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-ink-3">
              <span>{relativeTime(n.updated_at)}</span>
              <span>{n.word_count} words</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
