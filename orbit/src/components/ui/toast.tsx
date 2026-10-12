"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  message: string;
  tone: "neutral" | "error" | "success";
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show: (message: string, opts?: { tone?: Toast["tone"]; action?: Toast["action"]; duration?: number }) => void;
  error: (message: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback<ToastApi["show"]>(
    (message, opts) => {
      const id = ++counter.current;
      setToasts((t) => [...t.slice(-3), { id, message, tone: opts?.tone ?? "neutral", action: opts?.action }]);
      window.setTimeout(() => dismiss(id), opts?.duration ?? (opts?.action ? 7000 : 4000));
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ show, error: (m) => show(m, { tone: "error", duration: 6000 }) }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className={cn(
                "pointer-events-auto flex max-w-[min(520px,100%)] items-center gap-4 rounded-xl border px-4 py-2.5 text-[13px] shadow-lift",
                "border-line bg-ink text-canvas",
                t.tone === "error" && "border-danger",
              )}
            >
              {t.tone === "error" ? <span className="label text-[9px] opacity-60">Error</span> : null}
              <span className="min-w-0 flex-1">{t.message}</span>
              {t.action ? (
                <button
                  className="label shrink-0 underline underline-offset-4"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
