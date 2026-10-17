"use client";

import { Globe } from "lucide-react";
import { useTransition } from "react";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_NAMES, LOCALES } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/** Native select (accessible, works everywhere); the choice is stored in a cookie. */
export function LanguageSwitcher({ className, tone = "dark" }: { className?: string; tone?: "dark" | "app" }) {
  const { locale, t } = useI18n();
  const [pending, start] = useTransition();

  return (
    <label
      className={cn(
        "relative inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[12.5px] transition-colors",
        tone === "dark" ? "border-white/15 text-silver hover:border-white/30 hover:text-warm" : "border-line text-ink-2 hover:text-ink",
        pending && "opacity-60",
        className,
      )}
    >
      <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{t.common.language}</span>
      <select
        value={locale}
        onChange={(e) => {
          const next = e.target.value;
          start(async () => {
            await setLocaleAction(next);
            // Full reload so every piece of text (incl. already-translated
            // workspace UI) re-renders cleanly in the new language.
            window.location.reload();
          });
        }}
        className="cursor-pointer appearance-none bg-transparent pe-1 outline-none [&>option]:bg-[#111214] [&>option]:text-[#f5f3ef]"
        aria-label={t.common.language}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
