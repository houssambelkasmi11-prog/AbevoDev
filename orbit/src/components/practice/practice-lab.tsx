"use client";

import { BookOpen, Layers, ListChecks, Plus, Sparkles, Timer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Markdown } from "@/components/app/markdown";
import { NoProviderNotice } from "@/components/app/no-provider";
import { Bars, Ring, Sparkline } from "@/components/app/viz";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { previewIntervals } from "@/lib/srs";
import type { FlashcardRow, QuestionType, QuizAttemptRow, QuizRow, SourceRef } from "@/lib/types";
import { cn, formatDate, relativeTime } from "@/lib/utils";
import {
  createFlashcard,
  createQuizFromContent,
  deleteFlashcard,
  deleteQuiz,
  generateFlashcardsFromText,
  reviewFlashcard,
  saveFlashcards,
  type DraftCard,
} from "@/server/actions/practice";
import { QuizRunner } from "./quiz-runner";
import { SourcePicker, type PickItem } from "./source-picker";
import { TabPanels, TabPill, useCalm, useTabSwipe } from "@/components/fx/motion-kit";
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";

type Tab = "review" | "cards" | "quizzes" | "progress";
const PRACTICE_TABS: readonly Tab[] = ["review", "cards", "quizzes", "progress"];

function SourceLink({ s }: { s: SourceRef | null }) {
  if (!s) return null;
  const href = s.type === "note" ? `/app/notes/${s.id}` : `/app/lessons/${s.id}${s.page ? `?page=${s.page}` : ""}`;
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-2 underline-offset-2 hover:text-ink hover:underline" title={s.excerpt ?? undefined}>
      <BookOpen className="h-3 w-3" /> {s.title}
      {s.page ? ` · p.${s.page}` : ""}
    </Link>
  );
}

export function PracticeLab({
  cards: initialCards,
  quizzes,
  attempts,
  material,
  subjects,
  hasProvider,
}: {
  cards: FlashcardRow[];
  quizzes: QuizRow[];
  attempts: QuizAttemptRow[];
  material: PickItem[];
  subjects: { id: string; name: string }[];
  hasProvider: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const quizParam = params.get("quiz");
  const [tab, setTab] = useState<Tab>(quizParam ? "quizzes" : "review");
  const [cards, setCards] = useState(initialCards);
  const swipe = useTabSwipe(PRACTICE_TABS, tab, setTab);
  useEffect(() => setCards(initialCards), [initialCards]);

  const now = Date.now();
  const due = useMemo(() => cards.filter((c) => new Date(c.due_at).getTime() <= now).sort((a, b) => a.due_at.localeCompare(b.due_at)), [cards, now]);
  const activeQuiz = quizParam ? quizzes.find((q) => q.id === quizParam) ?? null : null;

  if (activeQuiz) {
    return (
      <QuizRunner
        quiz={activeQuiz}
        hasProvider={hasProvider}
        previous={attempts.filter((a) => a.quiz_id === activeQuiz.id)}
        onExit={() => router.push("/app/practice")}
      />
    );
  }

  const tabBtn = (k: Tab, label: string, icon: React.ReactNode, count?: number) => (
    <button
      role="tab"
      aria-selected={tab === k}
      onClick={() => setTab(k)}
      className={cn("relative isolate flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] transition-colors", tab === k ? "font-medium text-ink" : "text-ink-2 hover:text-ink")}
    >
      {tab === k ? <TabPill id="practice-tabs" /> : null}
      <span className="relative z-[1] flex items-center gap-2">
        {icon}
        {label}
        {count !== undefined ? <span className="font-mono text-[10px] text-ink-3">{count}</span> : null}
      </span>
    </button>
  );

  return (
    <div>
      <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto rounded-xl bg-soft p-1" role="tablist">
        {tabBtn("review", "Review", <Layers className="h-3.5 w-3.5" />, due.length)}
        {tabBtn("cards", "Flashcards", <Sparkles className="h-3.5 w-3.5" />, cards.length)}
        {tabBtn("quizzes", "Quizzes & exams", <ListChecks className="h-3.5 w-3.5" />, quizzes.length)}
        {tabBtn("progress", "Progress", <Timer className="h-3.5 w-3.5" />)}
      </div>
      <TabPanels tabKey={tab} index={PRACTICE_TABS.indexOf(tab)} className="mt-8">
        <div {...swipe}>
        {tab === "review" ? <ReviewQueue due={due} total={cards.length} onReviewed={(c) => setCards((cs) => cs.map((x) => (x.id === c.id ? c : x)))} onGoCards={() => setTab("cards")} /> : null}
        {tab === "cards" ? <CardsManager cards={cards} setCards={setCards} material={material} subjects={subjects} hasProvider={hasProvider} /> : null}
        {tab === "quizzes" ? <QuizList quizzes={quizzes} attempts={attempts} material={material} hasProvider={hasProvider} /> : null}
        {tab === "progress" ? <Progress cards={cards} quizzes={quizzes} attempts={attempts} subjects={subjects} /> : null}
        </div>
      </TabPanels>
    </div>
  );
}

/* ───────────────────────── Review queue ───────────────────────── */

function ReviewQueue({ due, total, onReviewed, onGoCards }: { due: FlashcardRow[]; total: number; onReviewed: (c: FlashcardRow) => void; onGoCards: () => void }) {
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [queue] = useState(due);
  const card = queue[index];
  const exitDir = useRef(1);

  const grade = useCallback(
    async (g: 0 | 1 | 2 | 3) => {
      if (!card) return;
      const r = await reviewFlashcard(card.id, g);
      if (!r.ok) return toast.error(r.error);
      onReviewed(r.data);
      exitDir.current = g <= 1 ? -1 : 1;
      setDone((d) => d + 1);
      setFlipped(false);
      setIndex((i) => i + 1);
    },
    [card, onReviewed, toast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) void grade((Number(e.key) - 1) as 0 | 1 | 2 | 3);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, grade]);

  if (total === 0)
    return (
      <EmptyState
        title="No flashcards yet."
        body="Generate cards from your notes or lessons, or write your own. ORBIT schedules reviews with spaced repetition."
        action={<Button onClick={onGoCards}>Create flashcards</Button>}
      />
    );
  if (!card)
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Ring value={1} size={96}>
          <span className="font-mono text-[13px]">{done}</span>
        </Ring>
        <h3 className="mt-6 font-display text-2xl font-bold tracking-tight">{done ? "Queue cleared." : "Nothing due right now."}</h3>
        <p className="mt-2 text-[13.5px] text-ink-2">{done ? `You reviewed ${done} card${done > 1 ? "s" : ""}. Come back when the next ones are due.` : "Your next reviews will appear here when they're due."}</p>
      </div>
    );

  const intervals = previewIntervals(card);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between font-mono text-[11px] text-ink-2">
        <span>
          {index + 1} / {queue.length} · {card.deck}
        </span>
        <span className="h-1 w-40 overflow-hidden rounded-full bg-soft">
          <span className="block h-full bg-ink transition-[width]" style={{ width: `${(index / queue.length) * 100}%` }} />
        </span>
      </div>
      <AnimatePresence mode="wait" initial={false} custom={exitDir.current}>
      <SwipeCard key={card.id} enabled={flipped} onSwipe={(d) => void grade(d < 0 ? 0 : 2)}>
      {(dragged) => (
      <div className="flip-scene">
        <button
          onClick={() => {
            if (dragged()) return;
            setFlipped((f) => !f);
          }}
          aria-label={flipped ? "Show question" : "Reveal answer"}
          data-flipped={flipped}
          className="flip-card relative block h-[340px] w-full text-left"
        >
          <div className="flip-face absolute inset-0 flex flex-col rounded-3xl border border-line bg-surface p-8 shadow-lift">
            <span className="label text-ink-3">Question</span>
            <div className="flex flex-1 items-center justify-center text-center">
              <Markdown text={card.front} className="text-[clamp(1.1rem,2.4vw,1.5rem)] font-medium leading-snug" />
            </div>
            <span className="label text-center text-ink-3">Space to flip</span>
          </div>
          <div className="flip-face flip-back absolute inset-0 flex flex-col rounded-3xl border border-ink bg-ink p-8 text-canvas shadow-lift">
            <span className="label opacity-60">Answer</span>
            <div className="flex flex-1 items-center justify-center overflow-y-auto text-center">
              <Markdown text={card.back} className="text-[1.05rem] leading-relaxed" />
            </div>
          </div>
        </button>
      </div>
      )}
      </SwipeCard>
      </AnimatePresence>
      <div className="mt-3 flex justify-center">
        <SourceLink s={card.source_ref} />
      </div>
      {flipped ? <p className="label mt-3 text-center text-ink-3 [@media(pointer:fine)]:hidden">Swipe ← again · good →</p> : null}
      <div className={cn("mt-6 grid grid-cols-4 gap-2 transition-opacity", flipped ? "opacity-100" : "pointer-events-none opacity-30")} aria-hidden={!flipped}>
        {(["Again", "Hard", "Good", "Easy"] as const).map((l, i) => (
          <button key={l} onClick={() => void grade(i as 0 | 1 | 2 | 3)} className={cn("flex flex-col items-center rounded-xl border py-3 transition-colors", i === 2 ? "border-ink bg-ink text-canvas" : "border-line bg-surface hover:border-ink")}>
            <span className="text-[13px] font-medium">{l}</span>
            <span className="font-mono text-[10px] opacity-60">
              {i + 1} · {intervals[i]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}


/**
 * A review card you can fling: right means you knew it (Good), left means
 * try again (Again). It leaves in that direction and the next card rises
 * into place. Keyboard and buttons keep working exactly as before.
 */
function SwipeCard({ enabled, onSwipe, children }: { enabled: boolean; onSwipe: (dir: -1 | 1) => void; children: (dragged: () => boolean) => React.ReactNode }) {
  const calm = useCalm();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-10, 10]);
  const again = useTransform(x, [-140, -30], [1, 0]);
  const good = useTransform(x, [30, 140], [0, 1]);
  const moved = useRef(0);
  return (
    <motion.div
      data-no-swipe
      className="relative touch-pan-y"
      style={{ x, rotate }}
      drag={enabled && !calm ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.85}
      dragConstraints={{ left: 0, right: 0 }}
      onDragStart={() => (moved.current = Date.now())}
      onDragEnd={(_, info) => {
        moved.current = Date.now();
        const go = info.offset.x > 120 || info.velocity.x > 700 ? 1 : info.offset.x < -120 || info.velocity.x < -700 ? -1 : 0;
        if (go) {
          animate(x, go * 700, { duration: 0.28, ease: [0.4, 0, 0.2, 1] });
          onSwipe(go as -1 | 1);
        }
      }}
      variants={{
        enter: { opacity: 0, scale: calm ? 1 : 0.94, y: calm ? 0 : 14 },
        center: { opacity: 1, scale: 1, y: 0 },
        exit: (d: number) => (calm ? { opacity: 0 } : { opacity: 0, x: d * 640, rotate: d * 12 }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      {children(() => Date.now() - moved.current < 250)}
      <motion.span style={{ opacity: again }} className="pointer-events-none absolute left-6 top-6 z-10 rounded-full border border-danger px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-danger">
        Again
      </motion.span>
      <motion.span style={{ opacity: good }} className="pointer-events-none absolute right-6 top-6 z-10 rounded-full border border-ok px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ok">
        Good
      </motion.span>
    </motion.div>
  );
}

/* ───────────────────────── Cards manager ───────────────────────── */

function CardsManager({ cards, setCards, material, subjects, hasProvider }: { cards: FlashcardRow[]; setCards: React.Dispatch<React.SetStateAction<FlashcardRow[]>>; material: PickItem[]; subjects: { id: string; name: string }[]; hasProvider: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deck, setDeck] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [draft, setDraft] = useState({ front: "", back: "", deck: "General", subjectId: "" });
  const [picked, setPicked] = useState<string[]>([]);
  const [genDeck, setGenDeck] = useState("");
  const [generated, setGenerated] = useState<(DraftCard & { keep: boolean })[] | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const decks = useMemo(() => {
    const m = new Map<string, number>();
    cards.forEach((c) => m.set(c.deck, (m.get(c.deck) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [cards]);
  const shown = deck ? cards.filter((c) => c.deck === deck) : cards;

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="flex flex-col gap-4">
        <Button onClick={() => setGenOpen(true)}>
          <Sparkles className="h-4 w-4" /> Generate with AI
        </Button>
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Write a card
        </Button>
        <div>
          <p className="label mb-2 text-ink-3">Decks</p>
          <ul className="flex flex-col gap-0.5">
            <li>
              <button onClick={() => setDeck(null)} className={cn("w-full rounded-lg px-2.5 py-1.5 text-left text-[13px]", !deck ? "bg-surface font-medium shadow-soft" : "text-ink-2 hover:bg-soft")}>
                All cards <span className="font-mono text-[10px] text-ink-3">{cards.length}</span>
              </button>
            </li>
            {decks.map(([d, n]) => (
              <li key={d}>
                <button onClick={() => setDeck(d)} className={cn("w-full truncate rounded-lg px-2.5 py-1.5 text-left text-[13px]", deck === d ? "bg-surface font-medium shadow-soft" : "text-ink-2 hover:bg-soft")}>
                  {d} <span className="font-mono text-[10px] text-ink-3">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div>
        {shown.length === 0 ? (
          <EmptyState compact title="No cards in this deck." body="Write one, or let ORBIT draft cards from your material for you to review." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((c) => (
              <li key={c.id} className="group rounded-2xl border border-line bg-surface p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="label text-ink-3">{c.deck}</span>
                  <span className="font-mono text-[10px] text-ink-3">due {relativeTime(c.due_at)}</span>
                </div>
                <div className="mt-2 text-[14px] font-medium">
                  <Markdown text={c.front} />
                </div>
                <div className="mt-2 border-t border-line pt-2 text-[13px] text-ink-2">
                  <Markdown text={c.back} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <SourceLink s={c.source_ref} />
                  <button
                    onClick={() =>
                      start(async () => {
                        const r = await deleteFlashcard(c.id);
                        if (r.ok) setCards((cs) => cs.filter((x) => x.id !== c.id));
                        else toast.error(r.error);
                      })
                    }
                    aria-label="Delete card"
                    className="rounded p-1 text-ink-3 opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={adding} onOpenChange={setAdding} title="New flashcard">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await createFlashcard({ front: draft.front, back: draft.back, deck: draft.deck, subjectId: draft.subjectId || null });
              if (r.ok) {
                setCards((cs) => [r.data, ...cs]);
                setDraft({ ...draft, front: "", back: "" });
                toast.show("Card added");
              } else toast.error(r.error);
            });
          }}
        >
          <Field label="Front">
            <Textarea value={draft.front} onChange={(e) => setDraft({ ...draft, front: e.target.value })} required className="min-h-[72px]" />
          </Field>
          <Field label="Back">
            <Textarea value={draft.back} onChange={(e) => setDraft({ ...draft, back: e.target.value })} required className="min-h-[72px]" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Deck">
              <Input value={draft.deck} onChange={(e) => setDraft({ ...draft, deck: e.target.value })} list="decks" required />
              <datalist id="decks">
                {decks.map(([d]) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>
            <Field label="Subject">
              <Select value={draft.subjectId} onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}>
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
            Add card
          </Button>
        </form>
      </Dialog>

      <Dialog open={genOpen} onOpenChange={(o) => { setGenOpen(o); if (!o) { setGenerated(null); setGenError(null); } }} title="Generate flashcards" description="Pick the material. You'll review every card before it's saved.">
        {!hasProvider ? (
          <NoProviderNotice compact />
        ) : generated ? (
          <div>
            <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto rounded-xl border border-line" data-lenis-prevent>
              {generated.map((c, i) => (
                <li key={i} className="flex gap-3 p-3">
                  <input type="checkbox" checked={c.keep} onChange={(e) => setGenerated((g) => g?.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)) ?? null)} className="mt-1 accent-[var(--ink)]" aria-label={`Keep card ${i + 1}`} />
                  <div className="min-w-0 text-[12.5px]">
                    <p className="font-medium">{c.front}</p>
                    <p className="mt-0.5 text-ink-2">{c.back}</p>
                    <SourceLink s={c.source} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-end gap-3">
              <Field label="Deck" className="flex-1">
                <Input value={genDeck} onChange={(e) => setGenDeck(e.target.value)} placeholder="Deck name" />
              </Field>
              <Button
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const r = await saveFlashcards({ cards: generated.filter((c) => c.keep), deck: genDeck || "Generated" });
                    if (r.ok) {
                      toast.show(`${r.data} cards saved`);
                      setGenOpen(false);
                      setGenerated(null);
                      router.refresh();
                    } else toast.error(r.error);
                  })
                }
              >
                Save {generated.filter((c) => c.keep).length}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <SourcePicker items={material} selected={picked} onChange={setPicked} />
            {genError ? <p className="text-[12.5px] text-danger">{genError}</p> : null}
            <Button
              loading={pending}
              disabled={!picked.length}
              className="self-end"
              onClick={() =>
                start(async () => {
                  setGenError(null);
                  const notes = picked.filter((id) => material.find((m) => m.id === id)?.type === "note");
                  const sources = picked.filter((id) => material.find((m) => m.id === id)?.type === "source");
                  const texts: DraftCard[] = [];
                  for (const n of notes) {
                    const r = await generateFlashcardsFromText({ noteId: n, count: 10 });
                    if (r.ok) texts.push(...r.data);
                    else return setGenError(r.error);
                  }
                  if (sources.length) {
                    const r = await generateFlashcardsFromText({ sourceIds: sources, count: 12 });
                    if (r.ok) texts.push(...r.data);
                    else return setGenError(r.error);
                  }
                  setGenerated(texts.map((t) => ({ ...t, keep: true })));
                  setGenDeck(material.find((m) => m.id === picked[0])?.title ?? "Generated");
                })
              }
            >
              <Sparkles className="h-4 w-4" /> Generate
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}

/* ───────────────────────── Quizzes ───────────────────────── */

function QuizList({ quizzes, attempts, material, hasProvider }: { quizzes: QuizRow[]; attempts: QuizAttemptRow[]; material: PickItem[]; hasProvider: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [count, setCount] = useState(8);
  const [types, setTypes] = useState<QuestionType[]>(["mcq", "short"]);
  const [exam, setExam] = useState(false);
  const [minutes, setMinutes] = useState(20);
  const [title, setTitle] = useState("");
  const [toDelete, setToDelete] = useState<QuizRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] text-ink-2">Quizzes are generated from your own notes and lessons, and every question links back to its source.</p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New quiz
        </Button>
      </div>
      {quizzes.length === 0 ? (
        <EmptyState compact title="No quizzes yet." body="Create a quiz or a timed practice exam from any combination of notes and sources." className="mt-6" />
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
          {quizzes.map((q) => {
            const mine = attempts.filter((a) => a.quiz_id === q.id);
            const best = mine.length ? Math.max(...mine.map((a) => a.score)) : null;
            return (
              <li key={q.id} className="group flex items-center gap-4 px-5 py-4">
                <Link href={`/app/practice?quiz=${q.id}`} className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium group-hover:underline">{q.title}</span>
                    {q.exam ? <Badge tone="solid">Exam</Badge> : null}
                  </span>
                  <span className="text-[12px] text-ink-2">
                    {q.questions.length} questions · {mine.length} attempt{mine.length === 1 ? "" : "s"} · {formatDate(q.created_at)}
                  </span>
                </Link>
                {best !== null ? (
                  <Ring value={best} size={44}>
                    <span className="font-mono text-[10px]">{Math.round(best * 100)}</span>
                  </Ring>
                ) : (
                  <span className="label text-ink-3">New</span>
                )}
                <button onClick={() => setToDelete(q)} aria-label={`Delete ${q.title}`} className="rounded p-1.5 text-ink-3 opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen} title="New quiz" description="Choose the material and format.">
        {!hasProvider ? (
          <NoProviderNotice compact />
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              start(async () => {
                const r = await createQuizFromContent({
                  noteIds: picked.filter((id) => material.find((m) => m.id === id)?.type === "note"),
                  sourceIds: picked.filter((id) => material.find((m) => m.id === id)?.type === "source"),
                  count,
                  types,
                  exam,
                  timeLimitMinutes: exam ? minutes : null,
                  title: title || undefined,
                });
                if (r.ok) {
                  setOpen(false);
                  router.push(`/app/practice?quiz=${r.data.id}`);
                } else setErr(r.error);
              });
            }}
          >
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 4 review" />
            </Field>
            <SourcePicker items={material} selected={picked} onChange={setPicked} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Questions">
                <Input type="number" min={3} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} />
              </Field>
              <Field label="Types">
                <div className="flex h-10 items-center gap-3 text-[12.5px]">
                  {(["mcq", "short", "open"] as QuestionType[]).map((t) => (
                    <label key={t} className="flex items-center gap-1.5">
                      <input type="checkbox" checked={types.includes(t)} onChange={() => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]))} className="accent-[var(--ink)]" />
                      {t === "mcq" ? "Multiple choice" : t === "short" ? "Short" : "Open"}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
            <label className="flex items-center gap-3 text-[13px]">
              <input type="checkbox" checked={exam} onChange={(e) => setExam(e.target.checked)} className="accent-[var(--ink)]" />
              Practice exam (timed)
              {exam ? <Input type="number" min={5} max={240} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="h-8 w-20" aria-label="Minutes" /> : null}
              {exam ? <span className="text-ink-2">minutes</span> : null}
            </label>
            {err ? <p className="text-[12.5px] text-danger">{err}</p> : null}
            <Button type="submit" loading={pending} disabled={!picked.length || !types.length} className="self-end">
              <Sparkles className="h-4 w-4" /> Generate quiz
            </Button>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete quiz?"
        body="The quiz and its attempt history will be removed."
        destructive
        confirmLabel="Delete"
        onConfirm={() =>
          start(async () => {
            if (!toDelete) return;
            const r = await deleteQuiz(toDelete.id);
            setToDelete(null);
            if (r.ok) router.refresh();
            else toast.error(r.error);
          })
        }
      />
    </div>
  );
}

/* ───────────────────────── Progress ───────────────────────── */

function Progress({ cards, quizzes, attempts, subjects }: { cards: FlashcardRow[]; quizzes: QuizRow[]; attempts: QuizAttemptRow[]; subjects: { id: string; name: string }[] }) {
  const sorted = [...attempts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });
  const forecast = days.map((d, i) => {
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    return cards.filter((c) => {
      const t = new Date(c.due_at).getTime();
      return i === 0 ? t < end.getTime() : t >= d.getTime() && t < end.getTime();
    }).length;
  });
  const reviewedLast7 = cards.filter((c) => c.last_reviewed_at && Date.now() - new Date(c.last_reviewed_at).getTime() < 7 * 86400000).length;
  const mature = cards.filter((c) => c.interval_days >= 21).length;

  const bySubject = subjects
    .map((s) => {
      const qs = new Set(quizzes.filter((q) => q.subject_id === s.id).map((q) => q.id));
      const at = attempts.filter((a) => qs.has(a.quiz_id));
      const avg = at.length ? at.reduce((n, a) => n + a.score, 0) / at.length : null;
      const lapses = cards.filter((c) => c.subject_id === s.id).reduce((n, c) => n + c.lapses, 0);
      return { s, avg, lapses, attempts: at.length };
    })
    .filter((x) => x.attempts || x.lapses)
    .sort((a, b) => (a.avg ?? 1) - (b.avg ?? 1) || b.lapses - a.lapses);

  if (!cards.length && !attempts.length) return <EmptyState compact title="No practice history yet." body="Review flashcards or take a quiz — your real progress will appear here." />;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <p className="label text-ink-3">Quiz scores over time</p>
        <p className="mt-3 font-display text-3xl font-bold">{sorted.length ? `${Math.round(sorted[sorted.length - 1].score * 100)}%` : "—"}</p>
        <Sparkline values={sorted.map((a) => a.score * 100)} max={100} className="mt-3 h-10 w-full text-ink" />
        <p className="mt-2 text-[12px] text-ink-2">{sorted.length} attempts</p>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <p className="label text-ink-3">Reviews due · next 7 days</p>
        <Bars values={forecast} labels={days.map((d) => d.toLocaleDateString(undefined, { weekday: "narrow" }))} className="mt-4" />
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <p className="label text-ink-3">Retention</p>
        <div className="mt-3 flex items-center gap-4">
          <Ring value={cards.length ? mature / cards.length : 0} size={72}>
            <span className="font-mono text-[11px]">{cards.length ? Math.round((mature / cards.length) * 100) : 0}%</span>
          </Ring>
          <div className="text-[12.5px] text-ink-2">
            <p>
              <span className="text-ink">{mature}</span> mature cards (21d+)
            </p>
            <p>
              <span className="text-ink">{reviewedLast7}</span> reviewed this week
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft md:col-span-3">
        <p className="label text-ink-3">Subjects requiring review</p>
        {bySubject.length ? (
          <ul className="mt-3 divide-y divide-line">
            {bySubject.map(({ s, avg, lapses, attempts: n }) => (
              <li key={s.id} className="flex items-center gap-4 py-2.5 text-[13px]">
                <span className="flex-1">{s.name}</span>
                <span className="text-ink-2">{avg !== null ? `${Math.round(avg * 100)}% avg over ${n} quiz${n > 1 ? "zes" : ""}` : "No quizzes"}</span>
                <span className="font-mono text-[11px] text-ink-3">{lapses} lapses</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] text-ink-2">Assign subjects to notes and lessons to see per-subject progress.</p>
        )}
      </div>
    </div>
  );
}
