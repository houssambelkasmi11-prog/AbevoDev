import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen, FileText, GraduationCap, Layers, MessagesSquare, Pin, Sparkles, Timer } from "lucide-react";
import { KnowledgeOrbit } from "@/components/dashboard/knowledge-orbit";
import { PageContainer, Panel } from "@/components/app/page-header";
import { Bars, Ring } from "@/components/app/viz";
import { EmptyState } from "@/components/ui/empty-state";
import { getContext } from "@/lib/bootstrap";
import { addDays, cn, formatDate, formatTime, greeting, relativeTime, sameDay, startOfDay, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const { repo, workspace, settings, user } = await getContext();
  const ws = { workspace_id: workspace.id };
  const [notes, sources, convs, assignments, steps, events, sessions, cards, quizzes, attempts, subjects, creds] = await Promise.all([
    repo.list("notes", { where: ws, order: { column: "updated_at", ascending: false } }),
    repo.list("sources", { where: ws, order: { column: "updated_at", ascending: false } }),
    repo.list("conversations", { where: ws, order: { column: "updated_at", ascending: false }, limit: 5 }),
    repo.list("assignments", { where: ws }),
    repo.list("assignment_steps"),
    repo.list("events", { where: ws, order: { column: "starts_at" } }),
    repo.list("study_sessions", { where: { ...ws, kind: "focus" }, order: { column: "started_at", ascending: false }, limit: 400 }),
    repo.list("flashcards", { where: ws }),
    repo.list("quizzes", { where: ws }),
    repo.list("quiz_attempts", { order: { column: "created_at" } }),
    repo.list("subjects", { where: ws, order: { column: "name" } }),
    repo.count("credentials"),
  ]);

  const now = new Date();
  const name = (settings.display_name ?? user.name ?? "").split(" ")[0];
  const isEmpty = notes.length + sources.length + assignments.length + cards.length === 0;

  const open = assignments.filter((a) => a.status !== "complete");
  const upcoming = open.filter((a) => a.due_at).sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? "")).slice(0, 5);
  const inProgress = open.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const schedule = events.filter((e) => !e.done && new Date(e.starts_at) >= startOfDay(now) && new Date(e.starts_at) < addDays(startOfDay(now), 7)).slice(0, 6);
  const dueCards = cards.filter((c) => new Date(c.due_at) <= now);
  const pinned = [...notes.filter((n) => n.pinned).map((n) => ({ id: n.id, title: n.title, href: `/app/notes/${n.id}`, kind: "Note" })), ...sources.filter((s) => s.pinned).map((s) => ({ id: s.id, title: s.title, href: `/app/lessons/${s.id}`, kind: "Source" }))].slice(0, 6);

  const finished = sessions.filter((s) => s.ended_at);
  const todayMin = Math.round(finished.filter((s) => sameDay(new Date(s.started_at), now)).reduce((n, s) => n + s.actual_seconds, 0) / 60);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(startOfDay(now), i - 6);
    return { label: d.toLocaleDateString(undefined, { weekday: "narrow" }), min: Math.round(finished.filter((s) => sameDay(new Date(s.started_at), d)).reduce((n, s) => n + s.actual_seconds, 0) / 60) };
  });
  const quizIds = new Set(quizzes.map((q) => q.id));
  const myAttempts = attempts.filter((a) => quizIds.has(a.quiz_id));
  const avgScore = myAttempts.length ? myAttempts.slice(-10).reduce((n, a) => n + a.score, 0) / Math.min(10, myAttempts.length) : null;

  const review = subjects
    .map((s) => {
      const due = dueCards.filter((c) => c.subject_id === s.id).length;
      const qs = new Set(quizzes.filter((q) => q.subject_id === s.id).map((q) => q.id));
      const at = myAttempts.filter((a) => qs.has(a.quiz_id));
      const avg = at.length ? at.reduce((n, a) => n + a.score, 0) / at.length : null;
      return { s, due, avg };
    })
    .filter((x) => x.due > 0 || (x.avg !== null && x.avg < 0.7))
    .sort((a, b) => b.due - a.due)
    .slice(0, 5);

  // Recommendations derived from real activity (deterministic, explained).
  const recs: { text: string; href: string; why: string }[] = [];
  if (dueCards.length) recs.push({ text: `Review ${dueCards.length} flashcard${dueCards.length > 1 ? "s" : ""}`, href: "/app/practice", why: "Due today in your spaced-repetition queue." });
  const soon = upcoming.find((a) => a.due_at && new Date(a.due_at).getTime() - now.getTime() < 3 * 86400000);
  if (soon) recs.push({ text: `Work on “${truncate(soon.title, 40)}”`, href: `/app/homework/${soon.id}`, why: `Due ${relativeTime(soon.due_at)}.` });
  const unsummarised = sources.find((s) => s.status === "ready" && !s.summary);
  if (unsummarised && creds) recs.push({ text: `Summarise “${truncate(unsummarised.title, 40)}”`, href: `/app/lessons/${unsummarised.id}`, why: "Indexed but not yet summarised." });
  const lonely = notes.find((n) => n.word_count > 150 && !cards.some((c) => c.source_ref?.id === n.id));
  if (lonely && creds) recs.push({ text: `Make flashcards from “${truncate(lonely.title, 36)}”`, href: `/app/notes/${lonely.id}`, why: "A substantial note with no practice material yet." });
  if (todayMin < settings.daily_goal_minutes && now.getHours() >= 9) recs.push({ text: `Start a ${settings.focus_minutes}-minute focus session`, href: "/app/focus", why: `${todayMin} of ${settings.daily_goal_minutes} minutes toward today's goal.` });
  if (!creds) recs.unshift({ text: "Connect an AI provider", href: "/app/settings/providers", why: "Unlocks tutors, grounded answers, quizzes and planning." });

  const clusters = subjects.map((s) => ({ name: s.name, count: notes.filter((n) => n.subject_id === s.id).length + sources.filter((x) => x.subject_id === s.id).length + assignments.filter((a) => a.subject_id === s.id).length }));
  const unassigned = notes.filter((n) => !n.subject_id).length + sources.filter((s) => !s.subject_id).length;
  const continueItems = [
    notes[0] ? { icon: FileText, label: "Note", title: notes[0].title, href: `/app/notes/${notes[0].id}`, meta: relativeTime(notes[0].updated_at) } : null,
    convs[0] ? { icon: MessagesSquare, label: "Conversation", title: convs[0].title, href: `/app/ai/${convs[0].id}`, meta: relativeTime(convs[0].updated_at) } : null,
    inProgress ? { icon: GraduationCap, label: "Assignment", title: inProgress.title, href: `/app/homework/${inProgress.id}`, meta: inProgress.due_at ? `due ${relativeTime(inProgress.due_at)}` : relativeTime(inProgress.updated_at) } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <PageContainer wide>
      <section className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <p className="label text-ink-3">
            01 / Overview · {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[0.98] tracking-[-0.045em]">
            {greeting(now)}
            {name ? `, ${name}` : ""}.
            <span className="serif-accent block font-normal text-ink-2">Ready to expand your universe?</span>
          </h1>
          {continueItems.length ? (
            <div className="mt-8">
              <p className="label mb-3 text-ink-3">Continue studying</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {continueItems.map((c) => (
                  <Link key={c.href} href={c.href} className="group rounded-2xl border border-line bg-surface p-4 shadow-soft transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong">
                    <div className="flex items-center gap-2 text-ink-3">
                      <c.icon className="h-3.5 w-3.5" />
                      <span className="label">{c.label}</span>
                      <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[14px] font-medium leading-snug">{c.title || "Untitled"}</p>
                    <p className="mt-1 font-mono text-[10px] text-ink-3">{c.meta}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[340px]">
          <KnowledgeOrbit clusters={clusters} unassigned={unassigned} />
          <Link href="/app/universe" className="label absolute bottom-0 right-0 flex items-center gap-1 text-ink-2 hover:text-ink">
            Open My Universe <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {isEmpty ? (
        <div className="mt-12 rounded-3xl border border-dashed border-line-strong">
          <EmptyState
            body="Start with one thing: write a note, upload a lecture PDF, or add an assignment. ORBIT connects everything as your universe grows."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/app/notes" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm text-accent-ink">
                  Create your first note
                </Link>
                <Link href="/app/lessons?add=1" className="inline-flex h-10 items-center rounded-xl border border-line-strong px-4 text-sm">
                  Upload a lesson
                </Link>
              </div>
            }
          />
        </div>
      ) : null}

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        <Panel title="Recommendations" action={<span className="label text-ink-3">From your activity</span>}>
          {recs.length ? (
            <ul className="space-y-3">
              {recs.slice(0, 5).map((r) => (
                <li key={r.text}>
                  <Link href={r.href} className="group flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-2" />
                    <span>
                      <span className="block text-[13.5px] font-medium group-hover:underline">{r.text}</span>
                      <span className="block text-[12px] text-ink-2">{r.why}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-2">You&apos;re on track. Nothing urgent right now.</p>
          )}
          <Link href="/app/ai?persona=pulse" className="label mt-5 inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            Ask PULSE for a plan <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Panel>

        <Panel title="Upcoming assignments" action={<Link href="/app/homework" className="label text-ink-2 hover:text-ink">All</Link>}>
          {upcoming.length ? (
            <ul className="divide-y divide-line">
              {upcoming.map((a) => {
                const s = steps.filter((x) => x.assignment_id === a.id);
                const overdue = a.due_at && new Date(a.due_at) < now;
                return (
                  <li key={a.id}>
                    <Link href={`/app/homework/${a.id}`} className="flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{a.title}</span>
                        <span className={cn("block text-[11.5px]", overdue ? "text-danger" : "text-ink-2")}>
                          {formatDate(a.due_at, { weekday: "short", month: "short", day: "numeric" })} · {relativeTime(a.due_at)}
                        </span>
                      </span>
                      {s.length ? (
                        <Ring value={s.filter((x) => x.done).length / s.length} size={32} stroke={1.5}>
                          <span className="font-mono text-[8px]">{s.filter((x) => x.done).length}</span>
                        </Ring>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact title="No deadlines ahead." body="Add an assignment to plan it." />
          )}
        </Panel>

        <Panel title="Study schedule · 7 days" action={<Link href="/app/calendar" className="label text-ink-2 hover:text-ink">Calendar</Link>}>
          {schedule.length ? (
            <ul className="space-y-2.5">
              {schedule.map((e) => (
                <li key={e.id} className="flex items-baseline gap-3">
                  <span className="w-20 shrink-0 font-mono text-[10.5px] text-ink-3">
                    {sameDay(new Date(e.starts_at), now) ? "Today" : formatDate(e.starts_at, { weekday: "short", day: "numeric" })} {formatTime(e.starts_at)}
                  </span>
                  <span className={cn("min-w-0 truncate text-[13px]", e.kind === "deadline" && "font-semibold")}>{e.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="Nothing scheduled." body="Plan sessions in the calendar or let PULSE propose a week." />
          )}
        </Panel>

        <Panel title="Progress overview">
          <div className="flex items-center gap-5">
            <Ring value={todayMin / Math.max(1, settings.daily_goal_minutes)} size={76}>
              <span className="font-mono text-[11px]">{todayMin}m</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="label text-ink-3">Focus · last 7 days</p>
              <Bars values={week.map((w) => w.min)} labels={week.map((w) => w.label)} className="mt-2" />
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
            <div>
              <dt className="label text-ink-3">Notes</dt>
              <dd className="mt-1 font-display text-xl font-bold">{notes.length}</dd>
            </div>
            <div>
              <dt className="label text-ink-3">Cards due</dt>
              <dd className="mt-1 font-display text-xl font-bold">{dueCards.length}</dd>
            </div>
            <div>
              <dt className="label text-ink-3">Quiz avg</dt>
              <dd className="mt-1 font-display text-xl font-bold">{avgScore === null ? "—" : `${Math.round(avgScore * 100)}%`}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Subjects requiring review">
          {review.length ? (
            <ul className="space-y-2.5">
              {review.map(({ s, due, avg }) => (
                <li key={s.id} className="flex items-center justify-between gap-3 text-[13px]">
                  <Link href={`/app/universe?focus=${s.id}`} className="truncate hover:underline">
                    {s.name}
                  </Link>
                  <span className="shrink-0 font-mono text-[10.5px] text-ink-2">
                    {due ? `${due} due` : ""}
                    {due && avg !== null ? " · " : ""}
                    {avg !== null ? `${Math.round(avg * 100)}% avg` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-2">Practice results by subject will surface here.</p>
          )}
          <Link href="/app/practice" className="label mt-5 inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            <Layers className="h-3 w-3" /> Practice lab
          </Link>
        </Panel>

        <Panel title="Saved resources">
          {pinned.length ? (
            <ul className="space-y-2">
              {pinned.map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className="flex items-center gap-2.5 text-[13px] hover:underline">
                    {p.kind === "Note" ? <FileText className="h-3.5 w-3.5 text-ink-3" /> : <BookOpen className="h-3.5 w-3.5 text-ink-3" />}
                    <span className="truncate">{p.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-ink-2">
              <Pin className="h-3.5 w-3.5" /> Pin notes and sources to keep them here.
            </p>
          )}
        </Panel>
      </div>

      <section className="mt-5">
        <Panel title="Recently edited notes" action={<Link href="/app/notes" className="label text-ink-2 hover:text-ink">All notes</Link>}>
          {notes.length ? (
            <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
              {notes.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <Link href={`/app/notes/${n.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-soft">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                    <span className="min-w-0 flex-1 truncate text-[13.5px]">{n.title || "Untitled"}</span>
                    <span className="font-mono text-[10px] text-ink-3">{relativeTime(n.updated_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-2">
              Every universe begins with a single idea.{" "}
              <Link href="/app/notes" className="underline">
                Create your first note
              </Link>
              .
            </p>
          )}
        </Panel>
      </section>

      <p className="mt-8 flex items-center gap-2 font-mono text-[10px] text-ink-3">
        <Timer className="h-3 w-3" /> All figures come from your own activity in this workspace.
      </p>
    </PageContainer>
  );
}
