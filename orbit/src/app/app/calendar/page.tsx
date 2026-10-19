import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar/calendar-view";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import { getContext } from "@/lib/bootstrap";
import { listFeeds } from "@/server/actions/feeds";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const { repo, workspace } = await getContext();
  const [events, sessions, subjects, creds] = await Promise.all([
    repo.list("events", { where: { workspace_id: workspace.id }, order: { column: "starts_at" } }),
    repo.list("study_sessions", { where: { workspace_id: workspace.id, kind: "focus" }, order: { column: "started_at", ascending: false }, limit: 300 }),
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
    repo.count("credentials"),
  ]);
  const feedsRes = await listFeeds();
  const feeds = feedsRes.ok ? feedsRes.data : [];
  return (
    <PageContainer wide>
      <PageHeader index="09" label="Study planning" title="Calendar" description="Your timetable, deadlines, planned sessions and completed focus time in one place. Double-click a day to add an event." />
      <div className="mt-8">
        <CalendarView
          events={[
            ...events.map((e) => ({ id: e.id, title: e.title, kind: e.kind, starts_at: e.starts_at, ends_at: e.ends_at, done: e.done, origin: e.origin, assignment_id: e.assignment_id, subject_id: e.subject_id, feed_id: e.feed_id ?? null, location: e.location ?? null })),
            ...sessions
              .filter((s) => s.ended_at && s.actual_seconds >= 60)
              .map((s) => ({ id: `s-${s.id}`, title: s.label, kind: "study" as const, starts_at: s.started_at, ends_at: s.ended_at, done: true, origin: "student" as const, assignment_id: s.assignment_id, subject_id: s.subject_id, focus: true })),
          ]}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          hasProvider={creds > 0}
          feeds={feeds}
        />
      </div>
    </PageContainer>
  );
}
