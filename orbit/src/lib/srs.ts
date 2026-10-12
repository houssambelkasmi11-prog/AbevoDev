/**
 * SM-2 style spaced repetition.
 * grade: 0 = again, 1 = hard, 2 = good, 3 = easy
 */
export interface SrsState {
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
}

export function schedule(state: SrsState, grade: 0 | 1 | 2 | 3, now = new Date()): SrsState & { due_at: string } {
  let { ease, interval_days, reps, lapses } = state;
  if (grade === 0) {
    lapses += 1;
    reps = 0;
    interval_days = 0; // relearn today (10 minutes)
    ease = Math.max(1.3, ease - 0.2);
  } else {
    const q = grade === 1 ? 3 : grade === 2 ? 4 : 5;
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    reps += 1;
    if (reps === 1) interval_days = grade === 3 ? 3 : 1;
    else if (reps === 2) interval_days = grade === 1 ? 3 : grade === 3 ? 8 : 6;
    else interval_days = Math.round(interval_days * (grade === 1 ? 1.2 : grade === 3 ? ease * 1.3 : ease));
    interval_days = Math.min(interval_days, 365);
  }
  const due = new Date(now);
  if (interval_days === 0) due.setMinutes(due.getMinutes() + 10);
  else due.setDate(due.getDate() + interval_days);
  return { ease: Math.round(ease * 100) / 100, interval_days, reps, lapses, due_at: due.toISOString() };
}

export function previewIntervals(state: SrsState): string[] {
  return ([0, 1, 2, 3] as const).map((g) => {
    const s = schedule(state, g);
    return s.interval_days === 0 ? "10m" : s.interval_days < 30 ? `${s.interval_days}d` : `${Math.round(s.interval_days / 30)}mo`;
  });
}
