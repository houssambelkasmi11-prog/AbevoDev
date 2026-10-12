import Link from "next/link";
import { KeyRound } from "lucide-react";

/** Clearly labelled setup state shown whenever AI is requested without a provider. */
export function NoProviderNotice({ message, compact }: { message?: string; compact?: boolean }) {
  return (
    <div className={compact ? "rounded-xl border border-dashed border-line-strong p-4" : "rounded-2xl border border-dashed border-line-strong p-6"}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soft">
          <KeyRound className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="label text-ink-3">Setup required</p>
          <p className="mt-1 text-[13.5px] font-medium">Connect an AI provider to use this.</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
            {message ?? "ORBIT never fakes AI responses. Add your own OpenAI, Anthropic, Gemini, OpenRouter or compatible key — it's encrypted on the server."}
          </p>
          <Link href="/app/settings/providers" className="mt-3 inline-flex h-8 items-center rounded-lg bg-accent px-3 text-[12.5px] font-medium text-accent-ink">
            Connect a provider
          </Link>
        </div>
      </div>
    </div>
  );
}
