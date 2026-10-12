"use client";

import * as RD from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { BookOpen, FileText, GraduationCap, MessagesSquare, Moon, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OrbitPulse } from "@/components/brand/logo";
import { Kbd } from "@/components/ui/field";
import { useHotkey } from "@/lib/client/hooks";
import { NAV } from "./nav-items";
import { useCreateActions, NewSubjectDialog } from "./create-menu";
import { useTheme } from "./theme";

interface SearchHit {
  id: string;
  type: "note" | "source" | "conversation" | "assignment";
  title: string;
  snippet: string;
  href: string;
}

const TYPE_ICON = { note: FileText, source: BookOpen, conversation: MessagesSquare, assignment: GraduationCap } as const;

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { toggle, resolved } = useTheme();
  const { actions, subjectOpen, setSubjectOpen } = useCreateActions();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useHotkey({ key: "k", mod: true }, (e) => {
    e.preventDefault();
    onOpenChange(!open);
  });

  useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((d: { hits: SearchHit[] }) => setHits(d.hits))
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const term = q.trim().toLowerCase();
  const nav = useMemo(() => NAV.filter((n) => !term || n.label.toLowerCase().includes(term)), [term]);
  const quick = useMemo(
    () =>
      [
        { id: "note", label: "Create note", run: actions.note },
        { id: "subject", label: "Create subject", run: actions.subject },
        { id: "lesson", label: "Add lesson or source", run: actions.lesson },
        { id: "chat", label: "Start AI chat", run: actions.chat },
        { id: "assignment", label: "New assignment", run: actions.assignment },
        { id: "session", label: "Start focus session", run: actions.session },
        { id: "providers", label: "Connect an AI provider", run: () => router.push("/app/settings/providers") },
        { id: "theme", label: resolved === "dark" ? "Switch to light theme" : "Switch to dark theme", run: toggle },
      ].filter((a) => !term || a.label.toLowerCase().includes(term)),
    [term, actions, router, resolved, toggle],
  );

  const go = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  const itemCls = "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] text-ink outline-none data-[selected=true]:bg-soft";

  return (
    <>
      <RD.Root open={open} onOpenChange={onOpenChange}>
        <RD.Portal>
          <RD.Overlay className="fixed inset-0 z-[95] bg-black/30 backdrop-blur-[2px]" />
          <RD.Content className="fixed left-1/2 top-[12vh] z-[96] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-lift focus:outline-none">
            <RD.Title className="sr-only">Command palette</RD.Title>
            <RD.Description className="sr-only">Search your universe or run a command</RD.Description>
            <Command shouldFilter={false} loop label="Command palette">
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search className="h-4 w-4 text-ink-2" />
                <Command.Input
                  value={q}
                  onValueChange={setQ}
                  placeholder="Search notes, lessons, chats, assignments… or type a command"
                  className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
                />
                {loading ? <OrbitPulse className="h-4 w-4 text-ink" /> : <Kbd>Esc</Kbd>}
              </div>
              <Command.List className="max-h-[56vh] overflow-y-auto p-2" data-lenis-prevent>
                <Command.Empty className="px-3 py-10 text-center text-[13px] text-ink-2">Nothing found in your universe.</Command.Empty>
                {hits.length ? (
                  <Command.Group heading="Results" className="[&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-ink-3">
                    {hits.map((h) => {
                      const Icon = TYPE_ICON[h.type];
                      return (
                        <Command.Item key={`${h.type}-${h.id}`} value={`${h.type}-${h.id}`} onSelect={() => go(() => router.push(h.href))} className={itemCls}>
                          <Icon className="h-4 w-4 shrink-0 text-ink-2" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{h.title}</span>
                            {h.snippet ? <span className="block truncate text-[12px] text-ink-2">{h.snippet}</span> : null}
                          </span>
                          <span className="label text-ink-3">{h.type}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ) : null}
                {quick.length ? (
                  <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-ink-3">
                    {quick.map((a) => (
                      <Command.Item key={a.id} value={`action-${a.id}`} onSelect={() => go(a.run)} className={itemCls}>
                        {a.id === "theme" ? resolved === "dark" ? <Sun className="h-4 w-4 text-ink-2" /> : <Moon className="h-4 w-4 text-ink-2" /> : <span className="h-4 w-4 text-center font-mono text-[13px] leading-4 text-ink-2">+</span>}
                        <span>{a.label}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
                {nav.length ? (
                  <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-ink-3">
                    {nav.map((n) => (
                      <Command.Item key={n.href} value={`nav-${n.href}`} onSelect={() => go(() => router.push(n.href))} className={itemCls}>
                        <n.icon className="h-4 w-4 text-ink-2" />
                        <span className="flex-1">{n.label}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
              </Command.List>
            </Command>
          </RD.Content>
        </RD.Portal>
      </RD.Root>
      <NewSubjectDialog open={subjectOpen} onOpenChange={setSubjectOpen} />
    </>
  );
}
