"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { QuickConnect } from "./connect-ai";

/** Shown whenever AI is requested without a provider: connect right here, one field. */
export function NoProviderNotice({ message, compact }: { message?: string; compact?: boolean }) {
  return (
    <div className={compact ? "rounded-xl border border-dashed border-line-strong p-4" : "rounded-2xl border border-dashed border-line-strong p-6"}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soft">
          <KeyRound className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="label text-ink-3">One step left</p>
          <p className="mt-1 text-[13.5px] font-medium">Paste an API key to switch on the AI.</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
            {message && !/settings|no ai provider/i.test(message) ? message : "Any OpenAI, Anthropic, Gemini, OpenRouter or DeepSeek key works — ORBIT detects which one it is."}
          </p>
          <QuickConnect className="mt-4" />
          <Link href="/app/settings/providers" className="mt-2 inline-block text-[11.5px] text-ink-3 underline-offset-4 hover:text-ink hover:underline">
            Advanced: custom endpoints & multiple keys
          </Link>
        </div>
      </div>
    </div>
  );
}
