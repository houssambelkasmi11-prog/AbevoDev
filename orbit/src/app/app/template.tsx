"use client";

import { motion, useReducedMotion } from "motion/react";

/** Seamless page transition between workspace routes: a soft lift + fade. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10, scale: 0.996 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-full origin-top"
    >
      {children}
    </motion.div>
  );
}
