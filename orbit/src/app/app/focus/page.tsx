import type { Metadata } from "next";
import { FocusMode } from "@/components/focus/focus-mode";
import { getContext } from "@/lib/bootstrap";

export const metadata: Metadata = { title: "Focus Mode" };

export default async function FocusPage() {
  const { repo, workspace, settings } = await getContext();
  const [sessions, subjects, assignments, steps] = await Promise.all([
    repo.list("study_sessions", { where: { workspace_id: workspace.id }, order: { column: "started_at", ascending: false }, limit: 300 }),
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
    repo.list("assignments", { where: { workspace_id: workspace.id } }),
    repo.list("assignment_steps", { order: { column: "ord" } }),
  ]);
  return (
    <FocusMode
      prefs={{ focus: settings.focus_minutes, short: settings.break_minutes, long: settings.long_break_minutes, goal: settings.daily_goal_minutes, notifications: settings.notifications }}
      sessions={sessions}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
      assignments={assignments
        .filter((a) => a.status !== "complete")
        .map((a) => ({ id: a.id, title: a.title, steps: steps.filter((s) => s.assignment_id === a.id).map((s) => ({ id: s.id, title: s.title, done: s.done })) }))}
    />
  );
}
