"use client";

import { CalendarPlus, ChevronLeft, ChevronRight, MapPin, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { NoProviderNotice } from "@/components/app/no-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { EventRow } from "@/lib/types";
import { addDays, cn, formatTime, sameDay, startOfDay } from "@/lib/utils";
import { acceptPlan, createEvent, deleteEvent, proposeWeekPlan, updateEvent, type ProposedEvent } from "@/server/actions/calendar";
import { addFeed, removeFeed, syncFeed, syncStaleFeeds, type FeedInfo } from "@/server/actions/feeds";

type Ev = Pick<EventRow, "id" | "title" | "kind" | "starts_at" | "ends_at" | "done" | "origin" | "assignment_id" | "subject_id"> & { focus?: boolean; feed_id?: string | null; location?: string | null };

const KIND_STYLE: Record<string, string> = {
  deadline: "bg-ink text-canvas",
  exam: "border border-ink text-ink",
  study: "bg-soft text-ink",
  other: "bg-soft text-ink-2",
  class: "bg-[#7fa9cc]/20 text-ink",
  focus: "border border-dashed border-line-strong text-ink-2",
};

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ago(iso: string | null): string {
  if (!iso) return "not synced yet";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "synced just now";
  if (m < 60) return `synced ${m} min ago`;
  if (m < 1440) return `synced ${Math.round(m / 60)} h ago`;
  return `synced ${Math.round(m / 1440)} d ago`;
}

export function CalendarView({ events: initial, subjects, hasProvider, feeds: initialFeeds = [] }: { events: Ev[]; subjects: { id: string; name: string }[]; hasProvider: boolean; feeds?: FeedInfo[] }) {
  const router = useRouter();
  const toast = useToast();
  const [events, setEvents] = useState(initial);
  const [feeds, setFeeds] = useState(initialFeeds);
  const [subOpen, setSubOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedName, setFeedName] = useState("");
  const [feedBusy, setFeedBusy] = useState<string | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  useEffect(() => setEvents(initial), [initial]);
  useEffect(() => setFeeds(initialFeeds), [initialFeeds]);
  // keep subscribed timetables fresh: re-sync quietly when the calendar opens
  useEffect(() => {
    if (!initialFeeds.length) return;
    let alive = true;
    void syncStaleFeeds().then((r) => {
      if (alive && r.ok && r.data > 0) router.refresh();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const feedName_ = (id?: string | null) => feeds.find((f) => f.id === id)?.name ?? "Timetable";
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = useState(startOfDay(new Date()));
  const [creating, setCreating] = useState<Date | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [proposals, setProposals] = useState<(ProposedEvent & { keep: boolean })[] | null>(null);
  const [hours, setHours] = useState(2);
  const [startHour, setStartHour] = useState(16);
  const [pending, start] = useTransition();

  const grid = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const gridStart = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor]);

  const eventsOn = (d: Date) => events.filter((e) => sameDay(new Date(e.starts_at), d)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const dayEvents = eventsOn(selected);
  const today = new Date();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border border-line bg-surface shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))} aria-label="Previous month" className="rounded-lg p-2 hover:bg-soft">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="min-w-[160px] text-center font-display text-[17px] font-bold tracking-tight">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
            <button onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))} aria-label="Next month" className="rounded-lg p-2 hover:bg-soft">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setCursor(d); setSelected(startOfDay(new Date())); }}>
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSubOpen(true)}>
              <CalendarPlus className="h-3.5 w-3.5" /> Timetable{feeds.length ? ` · ${feeds.length}` : ""}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPlanOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Plan my week
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-line">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="label px-2 py-2 text-center text-ink-3">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((d, i) => {
            const evs = eventsOn(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isSel = sameDay(d, selected);
            return (
              <button
                key={i}
                onClick={() => setSelected(startOfDay(d))}
                onDoubleClick={() => setCreating(d)}
                aria-label={`${d.toDateString()}, ${evs.length} events`}
                aria-pressed={isSel}
                className={cn("min-h-[64px] border-b border-r border-line p-1.5 text-left align-top transition-colors md:min-h-[96px]", !inMonth && "bg-canvas/50 text-ink-3", isSel && "bg-soft")}
              >
                <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px]", sameDay(d, today) && "bg-ink text-canvas")}>{d.getDate()}</span>
                <span className="mt-1 hidden flex-col gap-0.5 md:flex">
                  {evs.slice(0, 3).map((e) => (
                    <span key={e.id} className={cn("truncate rounded px-1.5 py-0.5 text-[10.5px]", KIND_STYLE[e.focus ? "focus" : e.kind], e.done && "line-through opacity-50")}>
                      {e.title}
                    </span>
                  ))}
                  {evs.length > 3 ? <span className="px-1 text-[10px] text-ink-3">+{evs.length - 3} more</span> : null}
                </span>
                {evs.length ? <span className="mt-1 flex gap-0.5 md:hidden">{evs.slice(0, 4).map((e) => <span key={e.id} className="h-1 w-1 rounded-full bg-ink" />)}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="label text-ink-3">{selected.toLocaleDateString(undefined, { weekday: "long" })}</p>
            <h3 className="font-display text-[20px] font-bold">{selected.toLocaleDateString(undefined, { month: "long", day: "numeric" })}</h3>
          </div>
          <Button size="sm" onClick={() => setCreating(selected)}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <ul className="mt-5 space-y-2">
          {dayEvents.length === 0 ? <li className="text-[13px] text-ink-2">Nothing scheduled.</li> : null}
          {dayEvents.map((e) => (
            <li key={e.id} className="group flex items-start gap-3 rounded-xl border border-line p-3">
              {!e.focus ? (
                <input
                  type="checkbox"
                  checked={e.done}
                  onChange={(ev) => {
                    const done = ev.target.checked;
                    setEvents((xs) => xs.map((x) => (x.id === e.id ? { ...x, done } : x)));
                    start(async () => void (await updateEvent(e.id, { done })));
                  }}
                  className="mt-1 accent-[var(--ink)]"
                  aria-label={`Mark ${e.title} done`}
                />
              ) : (
                <span className="mt-1.5 h-2 w-2 rounded-full border border-ink-2" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13.5px]", e.done && "text-ink-3 line-through")}>{e.title}</p>
                <p className="text-[11.5px] text-ink-2">
                  {formatTime(e.starts_at)}
                  {e.ends_at ? `–${formatTime(e.ends_at)}` : ""} · {e.focus ? "focus session" : e.feed_id ? feedName_(e.feed_id) : e.kind}
                  {e.assignment_id ? (
                    <>
                      {" · "}
                      <Link href={`/app/homework/${e.assignment_id}`} className="underline-offset-2 hover:underline">
                        assignment
                      </Link>
                    </>
                  ) : null}
                </p>
                {e.location ? (
                  <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-2">
                    <MapPin className="h-3 w-3" /> {e.location}
                  </p>
                ) : null}
              </div>
              {e.origin === "ai" ? <Badge tone="ai">AI</Badge> : null}
              {!e.focus && !e.feed_id ? (
                <button
                  onClick={() =>
                    start(async () => {
                      const r = await deleteEvent(e.id);
                      if (r.ok) setEvents((xs) => xs.filter((x) => x.id !== e.id));
                    })
                  }
                  aria-label={`Delete ${e.title}`}
                  className="rounded p-1 text-ink-3 opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </aside>

      <Dialog open={!!creating} onOpenChange={(o) => !o && setCreating(null)} title="New event">
        {creating ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const startAt = new Date(String(fd.get("start")));
              const mins = Number(fd.get("minutes") || 0);
              start(async () => {
                const r = await createEvent({
                  title: String(fd.get("title")),
                  kind: String(fd.get("kind")) as "study" | "deadline" | "exam" | "other",
                  starts_at: startAt.toISOString(),
                  ends_at: mins ? new Date(startAt.getTime() + mins * 60000).toISOString() : null,
                  subject_id: String(fd.get("subject") || "") || null,
                });
                if (r.ok) {
                  setEvents((xs) => [...xs, r.data]);
                  setCreating(null);
                } else toast.error(r.error);
              });
            }}
          >
            <Field label="Title">
              <Input name="title" required autoFocus placeholder="Study session — organic chemistry" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <Input name="start" type="datetime-local" defaultValue={toLocalInput(new Date(creating.getFullYear(), creating.getMonth(), creating.getDate(), 16, 0))} required />
              </Field>
              <Field label="Duration (min)">
                <Input name="minutes" type="number" min={0} max={720} defaultValue={50} />
              </Field>
              <Field label="Type">
                <Select name="kind" defaultValue="study">
                  <option value="study">Study session</option>
                  <option value="deadline">Deadline</option>
                  <option value="exam">Exam</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Subject">
                <Select name="subject" defaultValue="">
                  <option value="">None</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" loading={pending} className="self-end">
              Add event
            </Button>
          </form>
        ) : null}
      </Dialog>

      <Dialog open={subOpen} onOpenChange={(o) => { setSubOpen(o); if (!o) setFeedError(null); }} title="Timetable & calendars" description="Paste an iCal link from MyTimetable, Google Calendar, Outlook or Canvas. ORBIT keeps your classes and exams in sync.">
        <div className="flex flex-col gap-5">
          {feeds.length ? (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {feeds.map((f) => (
                <li key={f.id} className="flex items-start gap-3 p-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#7fa9cc]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{f.name}</p>
                    <p className="text-[11.5px] text-ink-2">
                      {f.host} · {f.event_count} events · {ago(f.last_synced_at)}
                    </p>
                    {f.last_error ? <p className="mt-1 text-[11.5px] text-danger">{f.last_error}</p> : null}
                  </div>
                  <button
                    disabled={!!feedBusy}
                    onClick={async () => {
                      setFeedBusy(`sync-${f.id}`);
                      const r = await syncFeed(f.id);
                      setFeedBusy(null);
                      if (r.ok) {
                        toast.show(`${r.data} events synced`);
                        setFeeds((xs) => xs.map((x) => (x.id === f.id ? { ...x, event_count: r.data, last_synced_at: new Date().toISOString(), last_error: null } : x)));
                        router.refresh();
                      } else toast.error(r.error);
                    }}
                    aria-label={`Sync ${f.name}`}
                    className="rounded-lg p-2 text-ink-2 hover:bg-soft hover:text-ink disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", feedBusy === `sync-${f.id}` && "animate-spin")} />
                  </button>
                  <button
                    disabled={!!feedBusy}
                    onClick={async () => {
                      setFeedBusy(`rm-${f.id}`);
                      const r = await removeFeed(f.id);
                      setFeedBusy(null);
                      if (r.ok) {
                        setFeeds((xs) => xs.filter((x) => x.id !== f.id));
                        setEvents((xs) => xs.filter((x) => x.feed_id !== f.id));
                        router.refresh();
                      } else toast.error(r.error);
                    }}
                    aria-label={`Remove ${f.name}`}
                    className="rounded-lg p-2 text-ink-3 hover:bg-soft hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!feedUrl.trim()) return;
              setFeedBusy("add");
              setFeedError(null);
              const r = await addFeed({ url: feedUrl, name: feedName || undefined });
              setFeedBusy(null);
              if (r.ok) {
                setFeeds((xs) => [...xs, r.data]);
                setFeedUrl("");
                setFeedName("");
                toast.show(`${r.data.name} added · ${r.data.event_count} events`);
                router.refresh();
              } else setFeedError(r.error);
            }}
          >
            <Field label="Calendar link (iCal)">
              <Input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="https://mytimetable.hhs.nl/ical?…" inputMode="url" autoComplete="off" spellCheck={false} />
            </Field>
            <Field label="Name (optional)">
              <Input value={feedName} onChange={(e) => setFeedName(e.target.value)} placeholder="e.g. HHS timetable" />
            </Field>
            {feedError ? <p role="alert" className="rounded-lg border border-danger/40 px-3 py-2 text-[12.5px] text-danger">{feedError}</p> : null}
            <Button type="submit" loading={feedBusy === "add"} disabled={!feedUrl.trim()} className="self-end">
              <CalendarPlus className="h-4 w-4" /> Add calendar
            </Button>
          </form>
          <details className="rounded-xl bg-soft/60 px-4 py-3 text-[12.5px] text-ink-2">
            <summary className="cursor-pointer font-medium text-ink">Where do I find my link?</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                <b>MyTimetable</b> (HHS and others): open your schedule, choose <i>Export</i> / <i>Calendar link</i>, and copy the iCal link.
              </li>
              <li>
                <b>Google Calendar</b>: Settings → your calendar → <i>Secret address in iCal format</i>.
              </li>
              <li>
                <b>Outlook</b>: Settings → Calendar → Shared calendars → <i>Publish a calendar</i> → copy the ICS link.
              </li>
            </ul>
            <p className="mt-2">The link is private, so ORBIT stores it encrypted and never shows it again. Calendars refresh automatically every few hours.</p>
          </details>
        </div>
      </Dialog>

      <Dialog open={planOpen} onOpenChange={(o) => { setPlanOpen(o); if (!o) setProposals(null); }} title="Plan my week" description="PULSE proposes study sessions around your deadlines and existing events. Nothing is saved until you accept.">
        {!hasProvider ? (
          <NoProviderNotice compact />
        ) : proposals ? (
          <div>
            <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto rounded-xl border border-line" data-lenis-prevent>
              {proposals.length === 0 ? <li className="p-4 text-[13px] text-ink-2">No sessions proposed — nothing urgent on your plate.</li> : null}
              {proposals.map((p, i) => (
                <li key={i} className="flex gap-3 p-3">
                  <input type="checkbox" checked={p.keep} onChange={(e) => setProposals((ps) => ps?.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)) ?? null)} className="mt-1 accent-[var(--ink)]" aria-label={`Keep ${p.title}`} />
                  <div className="min-w-0 text-[12.5px]">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-ink-2">
                      {new Date(p.starts_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {p.minutes} min
                    </p>
                    {p.reason ? <p className="mt-0.5 text-ink-3">{p.reason}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setProposals(null)}>
                Back
              </Button>
              <Button
                loading={pending}
                disabled={!proposals.some((p) => p.keep)}
                onClick={() =>
                  start(async () => {
                    const r = await acceptPlan(proposals.filter((p) => p.keep));
                    if (r.ok) {
                      toast.show(`${r.data} sessions added`);
                      setPlanOpen(false);
                      setProposals(null);
                      router.refresh();
                    } else toast.error(r.error);
                  })
                }
              >
                Accept {proposals.filter((p) => p.keep).length}
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await proposeWeekPlan({ hoursPerDay: hours, startHour, timezoneOffsetMinutes: new Date().getTimezoneOffset() });
                if (r.ok) setProposals(r.data.map((p) => ({ ...p, keep: true })));
                else toast.error(r.error);
              });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hours per day">
                <Input type="number" min={0.5} max={10} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
              </Field>
              <Field label="Earliest start (hour)">
                <Input type="number" min={5} max={22} value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} />
              </Field>
            </div>
            <Button type="submit" loading={pending} className="self-end">
              <Sparkles className="h-4 w-4" /> Propose plan
            </Button>
          </form>
        )}
      </Dialog>
    </div>
  );
}
