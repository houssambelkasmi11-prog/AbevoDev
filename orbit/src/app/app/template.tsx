"use client";

import { motion, useReducedMotion } from "motion/react";

/** Soft page transition between workspace routes. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-full"
    >
      {children}
    </motion.div>
  );
}
