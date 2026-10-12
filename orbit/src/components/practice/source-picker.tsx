"use client";

import { useState } from "react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface PickItem {
  id: string;
  title: string;
  type: "note" | "source";
  meta?: string;
}

export function SourcePicker({ items, selected, onChange }: { items: PickItem[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState("");
  const shown = items.filter((i) => !q || i.title.toLowerCase().includes(q.toLowerCase())).slice(0, 150);
  return (
    <div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter notes and sources…" aria-label="Filter material" className="h-9 text-[13px]" />
      <ul className="mt-2 max-h-[260px] overflow-y-auto rounded-xl border border-line" data-lenis-prevent>
        {shown.length === 0 ? <li className="px-3 py-5 text-center text-[12.5px] text-ink-2">Nothing here yet — add notes or lessons first.</li> : null}
        {shown.map((i) => {
          const on = selected.includes(i.id);
          return (
            <li key={i.id}>
              <label className={cn("flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 last:border-0 hover:bg-soft", on && "bg-soft")}>
                <input type="checkbox" checked={on} onChange={() => onChange(on ? selected.filter((x) => x !== i.id) : [...selected, i.id])} className="accent-[var(--ink)]" />
                <span className="label w-12 shrink-0 text-ink-3">{i.type}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{i.title}</span>
                {i.meta ? <span className="text-[11px] text-ink-3">{i.meta}</span> : null}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
