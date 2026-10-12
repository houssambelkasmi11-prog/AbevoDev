"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import type { ChatScope } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ScopeOptions {
  subjects: { id: string; name: string }[];
  sources: { id: string; title: string; subject_id: string | null; collection: string | null; status: string }[];
  notes: { id: string; title: string }[];
}

export function scopeSummary(scope: ChatScope, opts: ScopeOptions): string {
  const n = scope.subjectIds.length + scope.sourceIds.length + scope.noteIds.length + scope.collections.length;
  if (n === 0) return "Whole workspace";
  if (scope.sourceIds.length === 1 && n === 1) return opts.sources.find((s) => s.id === scope.sourceIds[0])?.title ?? "1 source";
  if (scope.subjectIds.length === 1 && n === 1) return opts.subjects.find((s) => s.id === scope.subjectIds[0])?.name ?? "1 subject";
  return `${n} selected`;
}

export function ScopeDialog({ open, onOpenChange, scope, onSave, options }: { open: boolean; onOpenChange: (o: boolean) => void; scope: ChatScope; onSave: (s: ChatScope) => void; options: ScopeOptions }) {
  const [draft, setDraft] = useState(scope);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setDraft(scope);
  }, [open, scope]);

  const collections = useMemo(() => [...new Set(options.sources.map((s) => s.collection).filter((c): c is string => !!c))], [options.sources]);
  const toggle = (key: keyof ChatScope, id: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id] }));
  const match = (t: string) => !q || t.toLowerCase().includes(q.toLowerCase());

  const Row = ({ k, id, label, meta }: { k: keyof ChatScope; id: string; label: string; meta?: string }) => (
    <label className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-soft", draft[k].includes(id) && "bg-soft")}>
      <input type="checkbox" checked={draft[k].includes(id)} onChange={() => toggle(k, id)} className="accent-[var(--ink)]" />
      <span className="min-w-0 flex-1 truncate text-[13px]">{label}</span>
      {meta ? <span className="label shrink-0 text-ink-3">{meta}</span> : null}
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Restrict to sources" description="ORBIT will only retrieve passages from what you select. Leave everything unchecked to search the whole workspace.">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" aria-label="Filter scope items" />
      <div className="mt-4 max-h-[50vh] space-y-5 overflow-y-auto" data-lenis-prevent>
        {options.subjects.length ? (
          <section>
            <p className="label mb-1 px-3 text-ink-3">Courses / subjects</p>
            {options.subjects.filter((s) => match(s.name)).map((s) => (
              <Row key={s.id} k="subjectIds" id={s.id} label={s.name} />
            ))}
          </section>
        ) : null}
        {collections.length ? (
          <section>
            <p className="label mb-1 px-3 text-ink-3">Collections</p>
            {collections.filter(match).map((c) => (
              <Row key={c} k="collections" id={c} label={c} />
            ))}
          </section>
        ) : null}
        <section>
          <p className="label mb-1 px-3 text-ink-3">Documents</p>
          {options.sources.filter((s) => match(s.title)).map((s) => (
            <Row key={s.id} k="sourceIds" id={s.id} label={s.title} meta={s.status !== "ready" ? s.status : undefined} />
          ))}
          {options.sources.length === 0 ? <p className="px-3 py-2 text-[12.5px] text-ink-2">No sources yet — add some in Lessons & Sources.</p> : null}
        </section>
        {options.notes.length ? (
          <section>
            <p className="label mb-1 px-3 text-ink-3">Notes</p>
            {options.notes.filter((n) => match(n.title)).slice(0, 200).map((n) => (
              <Row key={n.id} k="noteIds" id={n.id} label={n.title || "Untitled"} />
            ))}
          </section>
        ) : null}
      </div>
      <div className="mt-5 flex justify-between gap-2">
        <Button variant="ghost" onClick={() => setDraft({ subjectIds: [], sourceIds: [], noteIds: [], collections: [] })}>
          Clear
        </Button>
        <Button
          onClick={() => {
            onSave(draft);
            onOpenChange(false);
          }}
        >
          Apply scope
        </Button>
      </div>
    </Dialog>
  );
}
