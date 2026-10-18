"use client";

/**
 * ORBIT motion kit — one shared vocabulary so every animation means something:
 *  • Tabs sit on a track; the "orbit pill" glides to the one you pick.
 *  • Content arrives from the direction you travelled (next → from the right,
 *    previous → from the left; deeper in the sidebar → from below).
 *  • On touch screens you can swipe between neighbouring tabs.
 * Everything respects prefers-reduced-motion and the Motion setting (off).
 */
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export const ORBIT_EASE = [0.16, 1, 0.3, 1] as const;
export const PILL_SPRING: Transition = { type: "spring", stiffness: 520, damping: 42, mass: 0.8 };

/** True when the user (OS) or ORBIT's Motion setting asks for less movement. */
export function useCalm(): boolean {
  const reduced = useReducedMotion();
  if (reduced) return true;
  if (typeof document !== "undefined" && document.documentElement.dataset.fx === "off") return true;
  return false;
}

/** The highlight behind the selected tab. Give every tablist its own `id`. */
export function TabPill({ id, className }: { id: string; className?: string }) {
  return (
    <motion.span
      layoutId={id}
      aria-hidden
      transition={PILL_SPRING}
      className={cn("pointer-events-none absolute inset-0 z-0 rounded-lg bg-surface shadow-soft", className)}
    />
  );
}

/** A thin underline that glides between link-style tabs. */
export function TabUnderline({ id, className }: { id: string; className?: string }) {
  return <motion.span layoutId={id} aria-hidden transition={PILL_SPRING} className={cn("pointer-events-none absolute -bottom-px h-px bg-ink", className)} />;
}

/** Remembers the previous index so we know which way the user is travelling (+1 / −1). */
export function useDirection(index: number): number {
  const prev = useRef(index);
  const dir = useRef(0);
  if (prev.current !== index) {
    dir.current = index > prev.current ? 1 : -1;
    prev.current = index;
  }
  return dir.current;
}

/**
 * Wraps the content of a tab. When `tabKey` changes the old panel drifts out
 * and the new one glides in from the side the user moved towards.
 */
export function TabPanels({ tabKey, index, children, className, distance = 28 }: { tabKey: string; index: number; children: React.ReactNode; className?: string; distance?: number }) {
  const dir = useDirection(index);
  const calm = useCalm();
  const d = calm ? 0 : distance;
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={tabKey}
          custom={dir}
          variants={{
            enter: (k: number) => ({ opacity: 0, x: k * d }),
            center: { opacity: 1, x: 0 },
            exit: (k: number) => ({ opacity: 0, x: k * -d * 0.6 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: calm ? 0.12 : 0.36, ease: ORBIT_EASE, opacity: { duration: calm ? 0.12 : 0.26 } }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const NO_SWIPE = 'input, textarea, select, [contenteditable="true"], .ProseMirror, [data-no-swipe], canvas, pre, .katex, [role="slider"]';

/** Marks a native event as already handled by an inner swipe area. */
export function markSwiped(e: React.SyntheticEvent) {
  (e.nativeEvent as Event & { __orbitSwiped?: boolean }).__orbitSwiped = true;
}
export function wasSwiped(e: React.SyntheticEvent) {
  return Boolean((e.nativeEvent as Event & { __orbitSwiped?: boolean }).__orbitSwiped);
}

/**
 * Horizontal swipe detection for touch screens only. Vertical scrolling,
 * text fields, editors, canvases and horizontally scrollable strips are left alone.
 */
export function useSwipe({ onLeft, onRight, threshold = 64 }: { onLeft?: () => void; onRight?: () => void; threshold?: number }) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return (start.current = null), undefined;
    const el = e.target as HTMLElement;
    if (el.closest(NO_SWIPE)) return (start.current = null), undefined;
    // Ignore strips that scroll sideways themselves.
    for (let n: HTMLElement | null = el; n && n !== e.currentTarget; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 2 && getComputedStyle(n).overflowX !== "visible") return (start.current = null), undefined;
    }
    const p = e.touches[0];
    start.current = { x: p.clientX, y: p.clientY, t: performance.now() };
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || wasSwiped(e)) return;
      const p = e.changedTouches[0];
      const dx = p.clientX - s.x;
      const dy = p.clientY - s.y;
      if (performance.now() - s.t > 650 || Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.7) return;
      if (window.getSelection()?.toString()) return;
      if (dx < 0 && onLeft) {
        markSwiped(e);
        onLeft();
      } else if (dx > 0 && onRight) {
        markSwiped(e);
        onRight();
      }
    },
    [onLeft, onRight, threshold],
  );
  return { onTouchStart, onTouchEnd };
}

/** Swipe between neighbouring tabs of a tablist. */
export function useTabSwipe<T extends string>(keys: readonly T[], current: T, set: (k: T) => void) {
  const i = keys.indexOf(current);
  return useSwipe({
    onLeft: i < keys.length - 1 ? () => set(keys[i + 1]) : undefined,
    onRight: i > 0 ? () => set(keys[i - 1]) : undefined,
  });
}
