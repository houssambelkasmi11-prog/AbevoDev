"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const KEY = "orbit-cookie-notice";

/**
 * Informational notice (not a consent wall): ORBIT only uses strictly
 * necessary cookies, which the Dutch Telecommunications Act exempts from
 * consent. Shown once; never blocks the page.
 */
export function CookieNotice() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "1") {
        const id = window.setTimeout(() => setShow(true), 1200);
        return () => window.clearTimeout(id);
      }
    } catch {
      /* storage blocked: stay quiet */
    }
  }, []);

  if (!show || pathname.startsWith("/app/focus")) return null;
  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="region"
      aria-label={t.common.legal.cookies}
      className="fx-cookie fixed inset-x-3 bottom-3 z-[95] mx-auto flex max-w-xl flex-col gap-3 rounded-2xl border border-white/12 bg-[rgba(12,13,15,0.92)] p-4 text-[13px] leading-relaxed text-[#c9cdd1] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:flex-row sm:items-center sm:gap-4 sm:p-4 sm:ps-5 md:bottom-5"
    >
      <p className="flex-1">
        {t.common.cookie.text}{" "}
        <Link href="/cookies" className="whitespace-nowrap text-[#f5f3ef] underline underline-offset-4">
          {t.common.cookie.more}
        </Link>
      </p>
      <button
        onClick={dismiss}
        className="h-9 shrink-0 rounded-full bg-[#f5f3ef] px-5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#070809] transition-transform hover:scale-[1.03]"
      >
        {t.common.cookie.ok}
      </button>
    </div>
  );
}
