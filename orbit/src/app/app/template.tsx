"use client";

import { motion, useReducedMotion } from "motion/react";

/** Page transition between workspace routes: a soft lift, fade and de-blur. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], filter: { duration: 0.4 } }}
      onAnimationComplete={() => {
        // Leave no filter/transform behind: keeps fixed children and text crisp.
        const el = document.querySelector<HTMLElement>("[data-page-transition]");
        if (el) {
          el.style.filter = "";
          el.style.transform = "";
        }
      }}
      data-page-transition
      className="min-h-full origin-top"
    >
      {children}
    </motion.div>
  );
}
