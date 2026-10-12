"use client";

import { GraduationCap, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { AssignmentRow, StageKey } from "@/lib/types";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import { createAssignment } from "@/server/actions/homework";

const STAGES: StageKey[] = ["input", "analysis", "sources", "generation", "review", "export"];
const STATUS: Record<AssignmentRow["status"], string> = { planning: "Planning", in_progress: "In progress", review: "In review", complete: "Complete" };

type Lite = Pick<AssignmentRow, "id" | "title" | "status" | "due_at" | "mode" | "stages" | "updated_at" | "subject_id"> & { stepsDone: number; stepsTotal: number };

export function HomeworkList({ assignments, subjects }: { assignments: Lite[]; subjects: { id: string; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const create = () =>
    start(async () => {
      const r = await createAssignment({ title: "Untitled assignment" });
      if (r.ok) router.push(`/app/homework/${r.data.id}`);
      else toast.error(r.error);
    });

  if (!assignments.length)
    return (
      <EmptyState
        title="No assignments in orbit."
        body="Paste a prompt, upload a worksheet or snap a photo. ORBIT extracts the requirements and helps you plan, learn and review — you stay the author."
        action={
          <Button onClick={create} loading={pending}>
            <Plus className="h-4 w-4" /> New assignment
          </Button>
        }
      />
    );

  const sorted = [...assignments].sort((a, b) => {
    if (a.status === "complete" && b.status !== "complete") return 1;
    if (b.status === "complete" && a.status !== "complete") return -1;
    return (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999");
  });
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="flex justify-end">
        <Button onClick={create} loading={pending}>
          <Plus className="h-4 w-4" /> New assignment
        </Button>
      </div>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {sorted.map((a) => {
          const overdue = a.due_at && a.status !== "complete" && new Date(a.due_at).getTime() < Date.now();
          return (
            <li key={a.id}>
              <Link href={`/app/homework/${a.id}`} className="block rounded-2xl border border-line bg-surface p-5 shadow-soft transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-ink-2" />
                  <span className="label text-ink-3">{a.subject_id ? subjectName.get(a.subject_id) : "Assignment"}</span>
                  <Badge tone={a.status === "complete" ? "ok" : "neutral"} className="ml-auto">
                    {STATUS[a.status]}
                  </Badge>
                </div>
                <h3 className="mt-3 font-display text-[18px] font-bold leading-tight tracking-tight">{a.title}</h3>
                <p className={cn("mt-1 text-[12.5px]", overdue ? "text-danger" : "text-ink-2")}>
                  {a.due_at ? `Due ${formatDate(a.due_at, { weekday: "short", month: "short", day: "numeric" })} · ${relativeTime(a.due_at)}` : "No due date"}
                  {a.stepsTotal ? ` · ${a.stepsDone}/${a.stepsTotal} steps` : ""}
                </p>
                <div className="mt-4 flex items-center gap-1" aria-label="Workflow progress">
                  {STAGES.map((s) => (
                    <span key={s} title={`${s}: ${a.stages[s]}`} className={cn("h-1 flex-1 rounded-full", a.stages[s] === "done" ? "bg-ink" : a.stages[s] === "stale" ? "bg-ink-3" : a.stages[s] === "error" ? "bg-danger" : "bg-soft")} />
                  ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
