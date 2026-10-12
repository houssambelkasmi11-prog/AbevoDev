"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateJson } from "@/lib/ai/json";
import { getContext } from "@/lib/bootstrap";
import type { EventRow } from "@/lib/types";
import { run, type ActionResult } from "../result";

const eventSchema = z.object({
  title: z.string().trim().min(1).max(160),
  kind: z.enum(["study", "deadline", "exam", "other"]),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }).nullable().optional(),
  subject_id: z.string().nullable().optional(),
  assignment_id: z.string().nullable().optional(),
});

export async function createEvent(input: z.input<typeof eventSchema>): Promise<ActionResult<EventRow>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const d = eventSchema.parse(input);
    const row = await repo.insert("events", { ...d, ends_at: d.ends_at ?? null, subject_id: d.subject_id ?? null, assignment_id: d.assignment_id ?? null, workspace_id: workspace.id, origin: "student" });
    revalidatePath("/app/calendar");
    return row;
  });
}

export async function updateEvent(id: string, input: Partial<z.input<typeof eventSchema>> & { done?: boolean }): Promise<ActionResult<EventRow>> {
  return run(async () => {
    const { repo } = await getContext();
    const d = eventSchema.partial().extend({ done: z.boolean().optional() }).parse(input);
    const row = await repo.update("events", id, d);
    revalidatePath("/app/calendar");
    return row;
  });
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    await repo.remove("events", id);
    revalidatePath("/app/calendar");
    return null;
  });
}

export interface ProposedEvent {
  title: string;
  starts_at: string;
  minutes: number;
  subject_id: string | null;
  assignment_id: string | null;
  reason: string;
}

const planSchema = z.object({
  sessions: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        minutes: z.number().int().min(15).max(240),
        assignment_id: z.string().nullable().optional(),
        subject_id: z.string().nullable().optional(),
        reason: z.string().max(300).default(""),
      }),
    )
    .max(40),
});

/** AI-assisted planning: proposes sessions — nothing is saved until accepted. */
export async function proposeWeekPlan(input: { hoursPerDay: number; startHour: number; timezoneOffsetMinutes: number }): Promise<ActionResult<ProposedEvent[]>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const now = new Date();
    const horizon = new Date(now.getTime() + 14 * 86400000);
    const [assignments, events, subjects, cards] = await Promise.all([
      repo.list("assignments", { where: { workspace_id: workspace.id } }),
      repo.list("events", { where: { workspace_id: workspace.id } }),
      repo.list("subjects", { where: { workspace_id: workspace.id } }),
      repo.list("flashcards", { where: { workspace_id: workspace.id } }),
    ]);
    const open = assignments.filter((a) => a.status !== "complete");
    const busy = events.filter((e) => new Date(e.starts_at) > now && new Date(e.starts_at) < horizon);
    const dueCards = cards.filter((c) => new Date(c.due_at) < horizon).length;
    const pulse = (await repo.list("personas", { where: { slug: "pulse" } }))[0] ?? null;
    const localToday = new Date(now.getTime() - input.timezoneOffsetMinutes * 60000).toISOString().slice(0, 10);

    const { data } = await generateJson(repo, {
      persona: pulse,
      instruction: `Plan focused study sessions for the next 7 days starting ${localToday} (student's local dates). Budget about ${input.hoursPerDay} hour(s) per day, starting no earlier than ${String(input.startHour).padStart(2, "0")}:00 local time. Prioritise earlier deadlines, avoid existing events, add short spaced-review sessions if flashcards are due, and leave buffer before deadlines. Use only the ids provided. Schema: {"sessions":[{"title":string,"day":"YYYY-MM-DD","start":"HH:MM","minutes":number,"assignment_id":string|null,"subject_id":string|null,"reason":string}]}`,
      input: `<material>\nASSIGNMENTS: ${JSON.stringify(open.map((a) => ({ id: a.id, title: a.title, due: a.due_at, subject_id: a.subject_id, status: a.status })))}\nSUBJECTS: ${JSON.stringify(subjects.map((s) => ({ id: s.id, name: s.name })))}\nEXISTING EVENTS: ${JSON.stringify(busy.map((e) => ({ title: e.title, start: e.starts_at, end: e.ends_at })))}\nFLASHCARDS DUE SOON: ${dueCards}\n</material>`,
      schema: planSchema,
    });
    const validA = new Set(open.map((a) => a.id));
    const validS = new Set(subjects.map((s) => s.id));
    return data.sessions.map((s) => {
      // Convert local day+time into an ISO instant using the browser's offset.
      const [y, m, d] = s.day.split("-").map(Number);
      const [hh, mm] = s.start.split(":").map(Number);
      const utc = Date.UTC(y, m - 1, d, hh, mm) + input.timezoneOffsetMinutes * 60000;
      return {
        title: s.title,
        starts_at: new Date(utc).toISOString(),
        minutes: s.minutes,
        assignment_id: s.assignment_id && validA.has(s.assignment_id) ? s.assignment_id : null,
        subject_id: s.subject_id && validS.has(s.subject_id) ? s.subject_id : null,
        reason: s.reason,
      };
    });
  });
}

export async function acceptPlan(events: ProposedEvent[]): Promise<ActionResult<number>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const rows = events.slice(0, 40).map((e) => ({
      workspace_id: workspace.id,
      title: e.title.slice(0, 160),
      kind: "study" as const,
      starts_at: new Date(e.starts_at).toISOString(),
      ends_at: new Date(new Date(e.starts_at).getTime() + e.minutes * 60000).toISOString(),
      subject_id: e.subject_id,
      assignment_id: e.assignment_id,
      origin: "ai" as const,
    }));
    await repo.insertMany("events", rows);
    revalidatePath("/app/calendar");
    return rows.length;
  });
}
