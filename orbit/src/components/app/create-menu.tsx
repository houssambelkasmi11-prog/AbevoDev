"use client";

import * as DM from "@radix-ui/react-dropdown-menu";
import { BookOpen, CalendarPlus, FileText, FolderPlus, GraduationCap, MessagesSquare, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createAssignment } from "@/server/actions/homework";
import { createNote } from "@/server/actions/notes";
import { createSubject } from "@/server/actions/workspace";

export function useCreateActions() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [subjectOpen, setSubjectOpen] = useState(false);

  const actions = {
    note: () =>
      start(async () => {
        const r = await createNote({});
        if (r.ok) router.push(`/app/notes/${r.data.id}`);
        else toast.error(r.error);
      }),
    subject: () => setSubjectOpen(true),
    lesson: () => router.push("/app/lessons?add=1"),
    chat: () => router.push("/app/ai?new=1"),
    assignment: () =>
      start(async () => {
        const r = await createAssignment({ title: "Untitled assignment" });
        if (r.ok) router.push(`/app/homework/${r.data.id}`);
        else toast.error(r.error);
      }),
    session: () => router.push("/app/focus"),
  };
  return { actions, pending, subjectOpen, setSubjectOpen };
}

export function NewSubjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New subject" description="Subjects become orbital clusters in your universe.">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await createSubject({ name, code: code || null });
            if (r.ok) {
              toast.show(`Subject “${r.data.name}” created`);
              setName("");
              setCode("");
              onOpenChange(false);
              router.refresh();
            } else toast.error(r.error);
          });
        }}
      >
        <Field label="Name" htmlFor="subj-name">
          <Input id="subj-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organic Chemistry" autoFocus required />
        </Field>
        <Field label="Course code (optional)" htmlFor="subj-code">
          <Input id="subj-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CHEM 201" />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Create subject
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const ITEMS = [
  { key: "note", label: "New note", icon: FileText, kbd: "N" },
  { key: "subject", label: "New subject", icon: FolderPlus, kbd: "S" },
  { key: "lesson", label: "New lesson", icon: BookOpen, kbd: "L" },
  { key: "chat", label: "New AI chat", icon: MessagesSquare, kbd: "A" },
  { key: "assignment", label: "New assignment", icon: GraduationCap, kbd: "H" },
  { key: "session", label: "New study session", icon: CalendarPlus, kbd: "F" },
] as const;

export function CreateMenu({ compact, className }: { compact?: boolean; className?: string }) {
  const { actions, pending, subjectOpen, setSubjectOpen } = useCreateActions();
  return (
    <>
      <DM.Root>
        <DM.Trigger asChild>
          <button
            aria-label="Create"
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-ink shadow-soft transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]",
              compact ? "h-9 w-9" : "h-9 w-full px-3 text-[13px] font-medium",
              pending && "opacity-60",
              className,
            )}
          >
            <Plus className="h-4 w-4" />
            {compact ? null : <span>Create</span>}
          </button>
        </DM.Trigger>
        <DM.Portal>
          <DM.Content
            sideOffset={8}
            align="start"
            className="z-[90] min-w-[220px] rounded-xl border border-line bg-surface p-1.5 text-ink shadow-lift data-[state=open]:animate-[rise_.18s_ease-out]"
          >
            {ITEMS.map((it) => (
              <DM.Item
                key={it.key}
                onSelect={() => actions[it.key]()}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-soft"
              >
                <it.icon className="h-4 w-4 text-ink-2" />
                <span className="flex-1">{it.label}</span>
                <span className="font-mono text-[10px] text-ink-3">{it.kbd}</span>
              </DM.Item>
            ))}
          </DM.Content>
        </DM.Portal>
      </DM.Root>
      <NewSubjectDialog open={subjectOpen} onOpenChange={setSubjectOpen} />
    </>
  );
}
