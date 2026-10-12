"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/bootstrap";
import type { StudySessionRow } from "@/lib/types";
import { run, type ActionResult } from "../result";

export async function startSession(input: { label?: string; subject_id?: string | null; assignment_id?: string | null; planned_seconds: number; kind: "focus" | "break" }): Promise<ActionResult<StudySessionRow>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const d = z
      .object({
        label: z.string().trim().max(120).optional(),
        subject_id: z.string().nullable().optional(),
        assignment_id: z.string().nullable().optional(),
        planned_seconds: z.number().int().min(60).max(6 * 3600),
        kind: z.enum(["focus", "break"]),
      })
      .parse(input);
    return repo.insert("study_sessions", {
      workspace_id: workspace.id,
      label: d.label || (d.kind === "focus" ? "Focus session" : "Break"),
      subject_id: d.subject_id ?? null,
      assignment_id: d.assignment_id ?? null,
      planned_seconds: d.planned_seconds,
      kind: d.kind,
      started_at: new Date().toISOString(),
    });
  });
}

export async function finishSession(id: string, input: { actual_seconds: number; completed_note?: string | null; completedStepIds?: string[] }): Promise<ActionResult<StudySessionRow>> {
  return run(async () => {
    const { repo } = await getContext();
    const d = z.object({ actual_seconds: z.number().int().min(0).max(12 * 3600), completed_note: z.string().max(2000).nullable().optional(), completedStepIds: z.array(z.string()).max(50).optional() }).parse(input);
    for (const sid of d.completedStepIds ?? []) await repo.update("assignment_steps", sid, { done: true }).catch(() => undefined);
    const row = await repo.update("study_sessions", id, { actual_seconds: d.actual_seconds, ended_at: new Date().toISOString(), completed_note: d.completed_note ?? null });
    revalidatePath("/app/focus");
    revalidatePath("/app");
    return row;
  });
}

export async function deleteSession(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    await repo.remove("study_sessions", id);
    revalidatePath("/app/focus");
    return null;
  });
}
