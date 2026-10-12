"use client";

import { Maximize2, Minimize2, Pause, Play, RotateCcw, SkipForward, Trash2, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bars, Ring } from "@/components/app/viz";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { StudySessionRow } from "@/lib/types";
import { cn, formatDuration, formatTime, sameDay } from "@/lib/utils";
import { deleteSession, finishSession, startSession } from "@/server/actions/focus";
import { Ambient, type AmbientKind } from "./ambient";

type Phase = "focus" | "break" | "long";

interface Prefs {
  focus: number;
  short: number;
  long: number;
  goal: number;
  notifications: boolean;
}

export function FocusMode({
  prefs,
  sessions: initialSessions,
  subjects,
  assignments,
}: {
  prefs: Prefs;
  sessions: StudySessionRow[];
  subjects: { id: string; name: string }[];
  assignments: { id: string; title: string; steps: { id: string; title: string; done: boolean }[] }[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [phase, setPhase] = useState<Phase>("focus");
  const [lengths, setLengths] = useState({ focus: prefs.focus, short: prefs.short, long: prefs.long });
  const total = (phase === "focus" ? lengths.focus : phase === "break" ? lengths.short : lengths.long) * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [label, setLabel] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ id: string; seconds: number } | null>(null);
  const [note, setNote] = useState("");
  const [doneSteps, setDoneSteps] = useState<string[]>([]);
  const [ambient, setAmbient] = useState<AmbientKind>("off");
  const [volume, setVolume] = useState(0.35);
  const [fullscreen, setFullscreen] = useState(false);
  const endAt = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const audio = useRef<Ambient | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // New phase or changed interval length → reset the clock (unless mid-session).
  useEffect(() => {
    if (!startedAt.current) setRemaining(total);
  }, [total, phase]);

  useEffect(() => () => audio.current?.dispose(), []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const notify = useCallback(
    (title: string, body: string) => {
      if (!prefs.notifications || !("Notification" in window) || Notification.permission !== "granted") return;
      try {
        new Notification(title, { body, silent: true });
      } catch {
        /* some browsers require a service worker */
      }
    },
    [prefs.notifications],
  );

  const complete = useCallback(
    async (early: boolean) => {
      setRunning(false);
      endAt.current = null;
      const seconds = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
      startedAt.current = null;
      if (phase === "focus") {
        if (sessionId) {
          setSummary({ id: sessionId, seconds });
          if (!early) notify("Focus session complete", "Time for a break.");
        }
        const nextCycles = cycles + (early ? 0 : 1);
        setCycles(nextCycles);
        setPhase(nextCycles > 0 && nextCycles % 4 === 0 ? "long" : "break");
      } else {
        if (sessionId) await finishSession(sessionId, { actual_seconds: seconds });
        if (!early) notify("Break over", "Ready for the next focus session?");
        setPhase("focus");
        setSessionId(null);
      }
    },
    [phase, sessionId, cycles, notify],
  );

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (!endAt.current) return;
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      document.title = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} · ${phase === "focus" ? "Focus" : "Break"} · ORBIT`;
      if (left === 0) void complete(false);
    };
    tick();
    const t = setInterval(tick, 250);
    return () => {
      clearInterval(t);
      document.title = "Focus Mode · ORBIT";
    };
  }, [running, phase, complete]);

  const start = async () => {
    if (!sessionId || phase !== "focus") {
      const r = await startSession({
        label: phase === "focus" ? label || undefined : "Break",
        subject_id: subjectId || null,
        assignment_id: assignmentId || null,
        planned_seconds: Math.max(60, total),
        kind: phase === "focus" ? "focus" : "break",
      });
      if (!r.ok) return toast.error(r.error);
      setSessionId(r.data.id);
    }
    startedAt.current = startedAt.current ?? Date.now() - (total - remaining) * 1000;
    endAt.current = Date.now() + remaining * 1000;
    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
    endAt.current = null;
  };

  const reset = () => {
    pause();
    startedAt.current = null;
    setRemaining(total);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      toast.error("Fullscreen isn't available in this browser.");
    }
  };

  const changeAmbient = async (k: AmbientKind) => {
    setAmbient(k);
    audio.current = audio.current ?? new Ambient();
    audio.current.setVolume(volume);
    await audio.current.play(k);
  };

  // Stats from real sessions.
  const focusSessions = sessions.filter((s) => s.kind === "focus" && s.ended_at);
  const today = new Date();
  const todaySeconds = focusSessions.filter((s) => sameDay(new Date(s.started_at), today)).reduce((n, s) => n + s.actual_seconds, 0);
  const last7 = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
          minutes: Math.round(focusSessions.filter((s) => sameDay(new Date(s.started_at), d)).reduce((n, s) => n + s.actual_seconds, 0) / 60),
        };
      }),
    [focusSessions],
  );

  const progress = 1 - remaining / Math.max(1, total);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const selectedAssignment = assignments.find((a) => a.id === assignmentId);

  return (
    <div ref={rootRef} className={cn("relative flex min-h-[100dvh] flex-col bg-canvas text-ink", fullscreen && "bg-[#070809] text-[#f5f3ef] dark")}>
      <div className="flex items-center justify-between px-5 py-4 md:px-10">
        <div>
          <p className="label text-ink-3">08 / Focus mode</p>
          <p className="mt-1 text-[13px] text-ink-2">
            {phase === "focus" ? "Deep work" : phase === "break" ? "Short break" : "Long break"} · cycle {cycles + (phase === "focus" ? 1 : 0)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Select aria-label="Ambient sound" value={ambient} onChange={(e) => void changeAmbient(e.target.value as AmbientKind)} className="w-36 [&_select]:h-9 [&_select]:text-[12.5px]">
            <option value="off">No sound</option>
            <option value="brown">Brown noise</option>
            <option value="rain">Soft rain</option>
            <option value="space">Deep space</option>
          </Select>
          {ambient !== "off" ? (
            <label className="hidden items-center gap-2 px-2 sm:flex">
              <Volume2 className="h-4 w-4 text-ink-2" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  audio.current?.setVolume(v);
                }}
                className="w-20 accent-[var(--ink)]"
                aria-label="Volume"
              />
            </label>
          ) : null}
          <button onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"} className="rounded-lg p-2 text-ink-2 hover:bg-soft hover:text-ink">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Timer */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-6">
        <div className="relative flex aspect-square w-[min(78vw,440px)] items-center justify-center">
          <OrbitTimerRing progress={progress} running={running} />
          <div className="relative text-center">
            <p className="font-display text-[clamp(4rem,15vw,8rem)] font-bold leading-none tracking-[-0.05em] tabular-nums" aria-live="off">
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </p>
            <p className="label mt-3 text-ink-3">{label || (phase === "focus" ? "Focus" : "Breathe")}</p>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-3">
          <button onClick={reset} aria-label="Reset timer" className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-ink-2 hover:text-ink">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => (running ? pause() : void start())}
            aria-label={running ? "Pause" : "Start"}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-canvas shadow-lift transition-transform active:scale-95"
          >
            {running ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
          </button>
          <button onClick={() => void complete(true)} disabled={!startedAt.current && !running} aria-label="Finish now" className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-ink-2 hover:text-ink disabled:opacity-30">
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {!running && !fullscreen ? (
          <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
            <Field label="What are you working on?">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Chapter 3 problems" />
            </Field>
            <Field label="Assignment">
              <Select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}>
                <option value="">None</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">None</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["focus", "Focus"],
                  ["short", "Break"],
                  ["long", "Long"],
                ] as const
              ).map(([k, l]) => (
                <Field key={k} label={`${l} min`}>
                  <Input type="number" min={1} max={180} value={lengths[k]} onChange={(e) => setLengths((x) => ({ ...x, [k]: Math.max(1, Math.min(180, Number(e.target.value) || 1)) }))} />
                </Field>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Stats */}
      {!fullscreen ? (
        <div className="border-t border-line px-5 py-8 md:px-10">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[auto_1fr_1.2fr]">
            <div className="flex items-center gap-4">
              <Ring value={todaySeconds / 60 / Math.max(1, prefs.goal)} size={84}>
                <span className="font-mono text-[11px]">{Math.round(todaySeconds / 60)}m</span>
              </Ring>
              <div>
                <p className="label text-ink-3">Today</p>
                <p className="text-[13px] text-ink-2">
                  {formatDuration(todaySeconds)} of {prefs.goal}m goal
                </p>
              </div>
            </div>
            <div>
              <p className="label mb-2 text-ink-3">Last 7 days (minutes)</p>
              <Bars values={last7.map((d) => d.minutes)} labels={last7.map((d) => d.label)} />
            </div>
            <div>
              <p className="label mb-2 text-ink-3">Session history</p>
              {focusSessions.length === 0 ? (
                <p className="text-[13px] text-ink-2">Your completed sessions will appear here.</p>
              ) : (
                <ul className="max-h-48 divide-y divide-line overflow-y-auto" data-lenis-prevent>
                  {focusSessions.slice(0, 30).map((s) => (
                    <li key={s.id} className="group flex items-center gap-3 py-2 text-[12.5px]">
                      <span className="font-mono text-[11px] text-ink-3">{formatTime(s.started_at)}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {s.label}
                        {s.completed_note ? <span className="text-ink-2"> — {s.completed_note}</span> : null}
                      </span>
                      <span className="font-mono text-[11px]">{formatDuration(s.actual_seconds)}</span>
                      <button
                        onClick={async () => {
                          const r = await deleteSession(s.id);
                          if (r.ok) setSessions((xs) => xs.filter((x) => x.id !== s.id));
                        }}
                        aria-label="Delete session"
                        className="rounded p-1 text-ink-3 opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={!!summary} onOpenChange={() => undefined} title="Session complete" description={summary ? `${formatDuration(summary.seconds)} of focused work.` : undefined}>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!summary) return;
            const r = await finishSession(summary.id, { actual_seconds: summary.seconds, completed_note: note.trim() || null, completedStepIds: doneSteps });
            if (r.ok) {
              setSessions((xs) => [r.data, ...xs.filter((x) => x.id !== r.data.id)]);
              toast.show("Session saved");
            } else toast.error(r.error);
            setSummary(null);
            setNote("");
            setDoneSteps([]);
            setSessionId(null);
            router.refresh();
          }}
        >
          <Field label="What did you complete?">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Finished problems 1–6, outlined section 2…" className="min-h-[80px]" autoFocus />
          </Field>
          {selectedAssignment?.steps.filter((s) => !s.done).length ? (
            <div>
              <p className="label mb-2 text-ink-3">Mark steps done · {selectedAssignment.title}</p>
              <ul className="space-y-1">
                {selectedAssignment.steps
                  .filter((s) => !s.done)
                  .map((s) => (
                    <li key={s.id}>
                      <label className="flex items-center gap-2 text-[13px]">
                        <input type="checkbox" checked={doneSteps.includes(s.id)} onChange={() => setDoneSteps((d) => (d.includes(s.id) ? d.filter((x) => x !== s.id) : [...d, s.id]))} className="accent-[var(--ink)]" />
                        {s.title}
                      </label>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          <Button type="submit" className="self-end">
            Save & take a break
          </Button>
        </form>
      </Dialog>
    </div>
  );
}

function OrbitTimerRing({ progress, running }: { progress: number; running: boolean }) {
  const size = 440;
  const r = 200;
  const c = 2 * Math.PI * r;
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full" aria-hidden>
      <circle cx={220} cy={220} r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
      <circle cx={220} cy={220} r={r - 22} fill="none" stroke="currentColor" strokeOpacity="0.06" strokeDasharray="1 7" />
      <g style={{ transformOrigin: "220px 220px", animation: running ? "orbit-spin 60s linear infinite" : undefined }}>
        <ellipse cx={220} cy={220} rx={r - 40} ry={(r - 40) * 0.38} transform="rotate(32 220 220)" fill="none" stroke="currentColor" strokeOpacity="0.1" />
        <ellipse cx={220} cy={220} rx={r - 40} ry={(r - 40) * 0.38} transform="rotate(-32 220 220)" fill="none" stroke="currentColor" strokeOpacity="0.07" />
      </g>
      <circle
        cx={220}
        cy={220}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        transform="rotate(-90 220 220)"
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 250ms linear" }}
      />
      <circle cx={220 + Math.cos(angle) * r} cy={220 + Math.sin(angle) * r} r="5" fill="currentColor" />
      <circle cx={220 + Math.cos(angle) * r} cy={220 + Math.sin(angle) * r} r="12" fill="currentColor" opacity="0.08" />
    </svg>
  );
}
