"use client";

import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  side = "center",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  side?: "center" | "right";
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-[80] fx-overlay bg-black/40 backdrop-blur-[3px]" />
        <RD.Content
          className={cn(
            "fixed z-[81] flex flex-col border border-line bg-surface text-ink shadow-lift focus:outline-none",
            side === "center" ? "fx-dialog" : "fx-side",
            side === "center" &&
              "bottom-0 left-0 right-0 max-h-[92dvh] rounded-t-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[min(560px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            side === "right" && "bottom-0 right-0 top-0 w-[min(480px,100vw)] border-y-0 border-r-0",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <RD.Title className="font-display text-lg font-bold tracking-tight">{title}</RD.Title>
              {description ? <RD.Description className="mt-0.5 text-[13px] text-ink-2">{description}</RD.Description> : <RD.Description className="sr-only">{title}</RD.Description>}
            </div>
            <RD.Close asChild>
              <button aria-label="Close" className="rounded-lg p-1.5 text-ink-2 hover:bg-soft hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </RD.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5" data-lenis-prevent>
            {children}
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <div className="text-sm leading-relaxed text-ink-2">{body}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
