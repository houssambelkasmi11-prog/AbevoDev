"use client";

import { motion, type TargetAndTransition } from "motion/react";
import { useCalm } from "@/components/fx/motion-kit";

/**
 * Each section's icon makes one small gesture when you arrive there —
 * the orbit turns, the sparkles twinkle, the timer ticks, the cog clicks.
 */
const GESTURE: Record<string, TargetAndTransition> = {
  "/app": { scale: [1, 0.82, 1.08, 1], transition: { duration: 0.5 } },
  "/app/universe": { rotate: [0, 360], transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] } },
  "/app/notes": { y: [0, -2.5, 0], rotate: [0, -6, 0], transition: { duration: 0.45 } },
  "/app/lessons": { scaleX: [1, 0.7, 1], transition: { duration: 0.45 } },
  "/app/ai": { scale: [1, 1.28, 1], rotate: [0, 18, 0], transition: { duration: 0.55 } },
  "/app/homework": { rotate: [0, -14, 8, 0], y: [0, -2, 0], transition: { duration: 0.6 } },
  "/app/practice": { y: [0, -3, 1, 0], transition: { duration: 0.5 } },
  "/app/focus": { rotate: [0, 25, 0], transition: { duration: 0.5 } },
  "/app/calendar": { y: [0, -2.5, 0], scale: [1, 1.08, 1], transition: { duration: 0.45 } },
  "/app/settings": { rotate: [0, 90], transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export function NavIcon({ href, active, children, className }: { href: string; active: boolean; children: React.ReactNode; className?: string }) {
  const calm = useCalm();
  return (
    <motion.span
      key={active ? "on" : "off"}
      className={className ?? "relative inline-flex"}
      animate={active && !calm ? GESTURE[href] ?? { scale: [1, 1.12, 1] } : undefined}
      style={{ display: "inline-flex" }}
    >
      {children}
    </motion.span>
  );
}
