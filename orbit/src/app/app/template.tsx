"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCalm } from "@/components/fx/motion-kit";
import { travel } from "@/components/fx/route-order";

/** Last workspace route, kept across template remounts. */
let lastPath: string | null = null;

/**
 * Page transition between workspace routes. Pages arrive from where they live:
 * a section lower in the sidebar rises from below, a higher one settles from
 * above, and going deeper into a section (a note, a lesson, a settings tab)
 * slides in from the right — back out slides in from the left.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const calm = useCalm();
  const [move] = useState(() => travel(lastPath, pathname));
  useEffect(() => {
    lastPath = pathname;
  }, [pathname]);

  const dist = calm ? 0 : move.dir === 0 ? 12 : 22;
  const from = move.axis === "x" ? { x: dist * (move.dir || 1), y: 0 } : { x: 0, y: dist * (move.dir || 1) };

  return (
    <motion.div
      initial={{ opacity: 0, ...from, filter: calm ? "blur(0px)" : "blur(4px)" }}
      animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      transition={{ duration: calm ? 0.15 : 0.55, ease: [0.16, 1, 0.3, 1], filter: { duration: 0.4 } }}
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
