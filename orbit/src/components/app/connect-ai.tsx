"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { OrbitPulse } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { PublicCredential } from "@/lib/types";
import { cn } from "@/lib/utils";
import { connectKey } from "@/server/actions/providers";

export interface AIState {
  connected: boolean;
  label: string | null;
  model: string | null;
  canStore: boolean;
}

/** Client-side guess shown while typing (the server re-detects and verifies). */
export function guessProvider(key: string): string | null {
  const k = key.trim();
  if (k.length < 6) return null;
  if (k.startsWith("sk-ant-")) return "Anthropic";
  if (k.startsWith("sk-or-")) return "OpenRouter";
  if (k.startsWith("AIza")) return "Google Gemini";
  if (/^sk-(proj|svcacct|admin)-/.test(k)) return "OpenAI";
  if (/^sk-[a-f0-9]{32}$/.test(k)) return "DeepSeek";
  if (k.startsWith("sk-")) return "OpenAI or DeepSeek";
  return null;
}

const Ctx = createContext<{ state: AIState; open: () => void; setState: (s: AIState) => void } | null>(null);

export function useConnectAI() {
  return useContext(Ctx);
}

export function ConnectAIProvider({ initial, children }: { initial: AIState; children: React.ReactNode }) {
  const [state, setState] = useState(initial);
  const [open, setOpen] = useState(false);
  useEffect(() => setState(initial), [initial.connected, initial.label, initial.model, initial.canStore]); // eslint-disable-line react-hooks/exhaustive-deps

  // First visit without AI: invite once (after the entry transition has played).
  useEffect(() => {
    if (initial.connected) return;
    let seen = false;
    try {
      seen = localStorage.getItem("orbit-ai-invited") === "1";
      localStorage.setItem("orbit-ai-invited", "1");
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = window.setTimeout(() => setOpen(true), 1600);
    return () => window.clearTimeout(t);
  }, [initial.connected]);

  const value = useMemo(() => ({ state, open: () => setOpen(true), setState }), [state]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen} title="Connect your AI" description="Paste one API key. ORBIT figures out the provider, tests it and picks a model for you.">
        <QuickConnect autoFocus onConnected={() => window.setTimeout(() => setOpen(false), 900)} />
      </Dialog>
    </Ctx.Provider>
  );
}

/** The whole setup: one field. Works inside or outside the provider. */
export function QuickConnect({ autoFocus, onConnected, className }: { autoFocus?: boolean; onConnected?: (c: PublicCredential) => void; className?: string }) {
  const ctx = useConnectAI();
  const router = useRouter();
  const toast = useToast();
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PublicCredential | null>(null);
  const guess = guessProvider(key);

  const submit = useCallback(async () => {
    if (!key.trim() || pending) return;
    setPending(true);
    setError(null);
    const r = await connectKey({ apiKey: key });
    setPending(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setDone(r.data);
    setKey("");
    ctx?.setState({ connected: true, label: r.data.label, model: r.data.default_model, canStore: true });
    toast.show(`${r.data.label} connected${r.data.default_model ? ` · ${r.data.default_model}` : ""}`);
    onConnected?.(r.data);
    router.refresh();
  }, [key, pending, ctx, toast, onConnected, router]);

  if (ctx && !ctx.state.canStore) {
    return (
      <div role="alert" className={cn("rounded-xl border border-danger/40 p-4 text-[13px] leading-relaxed", className)}>
        This server has no secret to protect API keys with. Set <code className="rounded bg-soft px-1 font-mono text-[12px]">ORBIT_ENCRYPTION_KEY</code> (or run{" "}
        <code className="rounded bg-soft px-1 font-mono text-[12px]">npm run setup</code>) and restart.
      </div>
    );
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 rounded-xl border border-ok/40 bg-ok/5 p-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ok/15 text-ok">
              <Check className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium">{done.label} is connected</p>
              <p className="truncate text-[12px] text-ink-2">
                Using {done.default_model ?? "the provider default"} · {done.status_detail}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div
              className={cn(
                "group flex items-center gap-2 rounded-xl border bg-canvas px-3 transition-[border-color,box-shadow] duration-300",
                error ? "border-danger/60" : "border-line focus-within:border-ink/40 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-ink)_8%,transparent)]",
              )}
            >
              <KeyRound className="h-4 w-4 shrink-0 text-ink-3" />
              <input
                autoFocus={autoFocus}
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError(null);
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text").trim();
                  if (text.length > 15) {
                    e.preventDefault();
                    setKey(text);
                    setError(null);
                  }
                }}
                placeholder="Paste your API key (sk-…, sk-ant-…, AIza…)"
                autoComplete="off"
                spellCheck={false}
                aria-label="API key"
                className="h-12 min-w-0 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:font-sans placeholder:text-ink-3"
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide key" : "Show key"} className="rounded-md p-1.5 text-ink-3 hover:text-ink">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-3 flex min-h-9 items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-[12px] text-ink-2">
                {pending ? (
                  <>
                    <OrbitPulse className="h-4 w-4 text-ink" /> Testing your key…
                  </>
                ) : guess ? (
                  <motion.span key={guess} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Looks like {guess}
                  </motion.span>
                ) : (
                  "OpenAI · Anthropic · Gemini · OpenRouter · DeepSeek"
                )}
              </span>
              <Button type="submit" loading={pending} disabled={!key.trim()}>
                Connect
              </Button>
            </div>
            <AnimatePresence>
              {error ? (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden text-[12.5px] leading-relaxed text-danger"
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">Encrypted on the server (AES-256-GCM) and never sent back to your browser.</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Sidebar status: green dot when connected, a call to action when not. */
export function AIStatusButton({ collapsed }: { collapsed: boolean }) {
  const ctx = useConnectAI();
  const router = useRouter();
  if (!ctx) return null;
  const { state, open } = ctx;
  return (
    <button
      onClick={() => (state.connected ? router.push("/app/settings/providers") : open())}
      title={state.connected ? `${state.label} · ${state.model ?? ""}` : "Connect your AI"}
      className={cn(
        "relative flex h-9 w-full items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-left text-[12.5px] transition-colors",
        state.connected ? "text-ink-2 hover:bg-soft hover:text-ink" : "border border-dashed border-line-strong text-ink hover:bg-soft",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {!state.connected ? <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" /> : null}
        <span className={cn("relative h-2 w-2 rounded-full", state.connected ? "bg-ok" : "bg-accent")} />
      </span>
      {collapsed ? null : (
        <span className="min-w-0 flex-1 truncate">{state.connected ? `${state.label}${state.model ? ` · ${state.model}` : ""}` : "Connect your AI"}</span>
      )}
    </button>
  );
}
