"use client";

import { Mathematics } from "@tiptap/extension-mathematics";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Link2, MoreHorizontal, Pin, PinOff, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { OrbitPulse } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Badge, Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useDebouncedCallback, useMediaQuery } from "@/lib/client/hooks";
import { markdownToHtml } from "@/lib/md";
import type { EdgeKind, EntityType, NoteRow, SubjectRow } from "@/lib/types";
import { cn, escapeHtml, relativeTime } from "@/lib/utils";
import { deleteNote, linkEntities, restoreNote, saveNote, unlinkEdge, uploadInlineImage } from "@/server/actions/notes";
import { AiPanel, type AiRequest, type PersonaOption, type SelectionInfo } from "./ai-panel";
import { EditorToolbar } from "./editor-toolbar";

export interface NoteLink {
  edgeId: string;
  direction: "out" | "in";
  kind: EdgeKind;
  type: EntityType;
  id: string;
  title: string;
  href: string | null;
  origin: "user" | "ai";
}

export interface Linkable {
  type: EntityType;
  id: string;
  title: string;
}

const KIND_LABEL: Record<EdgeKind, string> = {
  belongs_to: "Belongs to",
  references: "References",
  builds_upon: "Builds upon",
  related: "Related concept",
  prerequisite: "Prerequisite",
};

type SaveState = "saved" | "saving" | "dirty" | "error";

export function NoteEditor({
  note,
  subjects,
  folders,
  personas,
  defaultPersonaId,
  links,
  linkables,
}: {
  note: NoteRow;
  subjects: SubjectRow[];
  folders: string[];
  personas: PersonaOption[];
  defaultPersonaId: string | null;
  links: NoteLink[];
  linkables: Linkable[];
}) {
  const router = useRouter();
  const toast = useToast();
  const wide = useMediaQuery("(min-width: 1280px)", true);
  const [title, setTitle] = useState(note.title === "Untitled" ? "" : note.title);
  const [tags, setTags] = useState<string[]>(note.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [folder, setFolder] = useState(note.folder ?? "");
  const [subjectId, setSubjectId] = useState(note.subject_id ?? "");
  const [pinned, setPinned] = useState(note.pinned);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState(note.updated_at);
  const [panel, setPanel] = useState<"ai" | "links" | null>(null);
  const [aiRequest, setAiRequest] = useState<AiRequest | null>(null);
  const [linkDialog, setLinkDialog] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mathDialog, setMathDialog] = useState<{ block: boolean; latex: string; pos?: number } | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [selBar, setSelBar] = useState<{ top: number; left: number } | null>(null);
  const [, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const htmlRef = useRef(note.content);

  /* ───────── Persistence ───────── */
  const persist = useCallback(
    async (patch: Parameters<typeof saveNote>[1]) => {
      setSaveState("saving");
      const r = await saveNote(note.id, patch);
      if (r.ok) {
        setSaveState("saved");
        setSavedAt(r.data.updated_at);
      } else {
        setSaveState("error");
        toast.error(r.error);
      }
    },
    [note.id, toast],
  );
  const debouncedContent = useDebouncedCallback((html: string) => void persist({ content: html }), 900);
  const debouncedTitle = useDebouncedCallback((t: string) => void persist({ title: t || "Untitled" }), 700);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  /* ───────── Editor ───────── */
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Start writing — type # for a heading, - for a list, [] for a checklist…" }),
      Mathematics.configure({
        inlineOptions: {
          onClick: (node, pos) => setMathDialog({ block: false, latex: String(node.attrs.latex ?? ""), pos }),
        },
        blockOptions: {
          onClick: (node, pos) => setMathDialog({ block: true, latex: String(node.attrs.latex ?? ""), pos }),
        },
        katexOptions: { throwOnError: false },
      }),
    ],
    content: note.content || "",
    editorProps: {
      attributes: { class: "orbit-prose min-h-[50vh] pb-40", "aria-label": "Note body", spellcheck: "true" },
    },
    onUpdate: ({ editor: e }) => {
      htmlRef.current = e.getHTML();
      setSaveState("dirty");
      debouncedContent.run(htmlRef.current);
    },
    onSelectionUpdate: ({ editor: e }) => updateSelectionBar(e),
    onBlur: () => setTimeout(() => setSelBar(null), 150),
  });

  // Flush pending edits when leaving the page.
  useEffect(
    () => () => {
      debouncedContent.cancel();
      debouncedTitle.cancel();
      if (htmlRef.current !== note.content) void saveNote(note.id, { content: htmlRef.current });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function updateSelectionBar(e: Editor) {
    const { from, to, empty } = e.state.selection;
    if (empty) return setSelBar(null);
    const text = e.state.doc.textBetween(from, to, " ");
    if (text.trim().length < 3) return setSelBar(null);
    const start = e.view.coordsAtPos(from);
    const top = start.top - 52 < 64 ? start.bottom + 10 : start.top - 52;
    setSelBar({ top, left: Math.max(8, Math.min(start.left, window.innerWidth - 380)) });
  }

  useEffect(() => {
    const hide = () => setSelBar(null);
    window.addEventListener("scroll", hide, { passive: true });
    return () => window.removeEventListener("scroll", hide);
  }, []);

  const getSelection = useCallback((): SelectionInfo | null => {
    if (!editor) return null;
    const { from, to, empty } = editor.state.selection;
    if (empty) return null;
    return { text: editor.state.doc.textBetween(from, to, "\n"), from, to };
  }, [editor]);

  const getAllText = useCallback(() => editor?.getText({ blockSeparator: "\n\n" }) ?? "", [editor]);

  const onInsert = useCallback(
    (md: string, label: string) => {
      if (!editor) return;
      const sel = editor.state.selection;
      const at = sel.empty ? editor.state.doc.content.size : sel.to;
      const html = `<blockquote><p><em>${escapeHtml(label)}</em></p>${markdownToHtml(md)}</blockquote><p></p>`;
      editor.chain().focus().insertContentAt(at, html).run();
      toast.show("Inserted as a labelled AI block");
    },
    [editor, toast],
  );

  const onReplace = useCallback(
    (range: { from: number; to: number }, md: string) => {
      if (!editor) return;
      editor.chain().focus().insertContentAt(range, markdownToHtml(md)).run();
      toast.show("Selection replaced — Ctrl/⌘ Z to undo");
    },
    [editor, toast],
  );

  const openAi = (req?: AiRequest) => {
    setPanel("ai");
    if (req) setAiRequest(req);
  };

  /* ───────── Meta ───────── */
  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, "").slice(0, 40);
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    void persist({ tags: next });
  };

  const linkedIds = useMemo(() => new Set(links.map((l) => l.id)), [links]);

  const onImagePicked = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const r = await uploadInlineImage(fd);
    if (r.ok) editor?.chain().focus().setImage({ src: r.data.url, alt: file.name }).run();
    else toast.error(r.error);
  };

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved changes" : saveState === "error" ? "Save failed — retrying on next edit" : `Saved ${relativeTime(savedAt)}`;

  const sidePanel =
    panel === "ai" ? (
      <AiPanel
        noteId={note.id}
        noteTitle={title || "Untitled"}
        personas={personas}
        defaultPersonaId={defaultPersonaId}
        getSelection={getSelection}
        getAllText={getAllText}
        onInsert={onInsert}
        onReplace={onReplace}
        onClose={() => setPanel(null)}
        pendingRequest={aiRequest}
        onRequestConsumed={() => setAiRequest(null)}
      />
    ) : panel === "links" ? (
      <LinksPanel links={links} onAdd={() => setLinkDialog(true)} onRemove={(id) => start(async () => { const r = await unlinkEdge(id); if (r.ok) router.refresh(); else toast.error(r.error); })} onClose={() => setPanel(null)} />
    ) : null;

  return (
    <div className="flex min-h-[calc(100dvh-56px)] lg:min-h-[100dvh]">
      <div ref={scrollRef} className="relative min-w-0 flex-1">
        {/* Top bar */}
        <div className="sticky top-14 z-30 border-b border-line bg-canvas/90 backdrop-blur-xl lg:top-0">
          <div className="mx-auto flex h-12 max-w-[860px] items-center gap-2 px-4 md:px-8">
            <Link href="/app/notes" className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12.5px] text-ink-2 hover:bg-soft hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" /> Notes
            </Link>
            <span className="label ml-2 hidden truncate text-ink-3 sm:inline" aria-live="polite">
              {saveState === "saving" ? <OrbitPulse className="mr-1.5 inline-block h-3 w-3 align-[-2px]" /> : null}
              {saveLabel}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button size="sm" variant={panel === "links" ? "secondary" : "ghost"} onClick={() => setPanel(panel === "links" ? null : "links")}>
                <Link2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Links</span>
                <span className="font-mono text-[10px] text-ink-3">{links.length}</span>
              </Button>
              <Button size="sm" variant={panel === "ai" ? "primary" : "outline"} onClick={() => setPanel(panel === "ai" ? null : "ai")}>
                <Sparkles className="h-3.5 w-3.5" /> Ask ORBIT
              </Button>
              <DM.Root>
                <DM.Trigger asChild>
                  <button aria-label="More note actions" className="rounded-lg p-2 text-ink-2 hover:bg-soft hover:text-ink">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DM.Trigger>
                <DM.Portal>
                  <DM.Content align="end" sideOffset={6} className="z-[90] min-w-[190px] rounded-xl border border-line bg-surface p-1.5 text-ink shadow-lift">
                    <DM.Item
                      onSelect={() => {
                        setPinned(!pinned);
                        void persist({ pinned: !pinned });
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-soft"
                    >
                      {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} {pinned ? "Unpin" : "Pin note"}
                    </DM.Item>
                    <DM.Item onSelect={() => setDeleteOpen(true)} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-danger outline-none data-[highlighted]:bg-soft">
                      <Trash2 className="h-3.5 w-3.5" /> Delete note
                    </DM.Item>
                  </DM.Content>
                </DM.Portal>
              </DM.Root>
            </div>
          </div>
          {editor ? (
            <div className="mx-auto max-w-[860px] border-t border-line px-3 py-1 md:px-7">
              <EditorToolbar
                editor={editor}
                onLink={() => setLinkUrl(editor.getAttributes("link").href ?? "")}
                onImage={() => fileInput.current?.click()}
                onMath={(block) => setMathDialog({ block, latex: block ? "\\int_0^1 x^2\\,dx = \\tfrac{1}{3}" : "E = mc^2" })}
              />
            </div>
          ) : null}
        </div>

        <article className="mx-auto max-w-[860px] px-5 pt-10 md:px-10">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label="Subject" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); void persist({ subject_id: e.target.value || null }); }} className="[&_select]:h-8 [&_select]:rounded-full [&_select]:text-[12px]">
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <input
              list="note-folders"
              aria-label="Folder"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              onBlur={() => folder !== (note.folder ?? "") && void persist({ folder: folder.trim() || null })}
              placeholder="Folder"
              className="h-8 w-32 rounded-full border border-line bg-surface px-3 text-[12px] focus:border-ink focus:outline-none"
            />
            <datalist id="note-folders">
              {folders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            {pinned ? <Badge tone="solid">Pinned</Badge> : null}
            {tags.map((t) => (
              <span key={t} className="inline-flex h-7 items-center gap-1 rounded-full bg-soft pl-2.5 pr-1 text-[12px]">
                #{t}
                <button
                  aria-label={`Remove tag ${t}`}
                  onClick={() => {
                    const next = tags.filter((x) => x !== t);
                    setTags(next);
                    void persist({ tags: next });
                  }}
                  className="rounded-full p-0.5 text-ink-3 hover:text-ink"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              aria-label="Add tag"
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagDraft);
                  setTagDraft("");
                }
              }}
              placeholder="+ tag"
              className="h-7 w-20 bg-transparent text-[12px] placeholder:text-ink-3 focus:outline-none"
            />
          </div>

          <textarea
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaveState("dirty");
              debouncedTitle.run(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor?.commands.focus("start");
              }
            }}
            rows={1}
            placeholder="Untitled"
            aria-label="Note title"
            className="mt-6 w-full resize-none overflow-hidden bg-transparent font-display text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.04em] placeholder:text-ink-3 focus:outline-none [field-sizing:content]"
          />

          <div className="relative mt-6">
            <EditorContent editor={editor} />
            {selBar && editor ? (
              <div
                role="toolbar"
                aria-label="AI actions for selection"
                className="fixed z-40 flex items-center gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-lift animate-rise"
                style={{ top: selBar.top, left: selBar.left }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Sparkles className="mx-1.5 h-3.5 w-3.5" />
                {(
                  [
                    ["explain", "Explain"],
                    ["simplify", "Simplify"],
                    ["summarize", "Summarize"],
                    ["improve", "Improve"],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} onClick={() => openAi({ action: k })} className="rounded-lg px-2.5 py-1.5 text-[12px] hover:bg-soft">
                    {l}
                  </button>
                ))}
                <button onClick={() => openAi()} className="rounded-lg px-2.5 py-1.5 text-[12px] hover:bg-soft">
                  Ask…
                </button>
              </div>
            ) : null}
          </div>
        </article>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImagePicked(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Side panel: docked on wide screens, drawer otherwise */}
      {wide ? (
        sidePanel ? (
          <aside className="sticky top-0 h-[100dvh] w-[380px] shrink-0 border-l border-line bg-surface">{sidePanel}</aside>
        ) : null
      ) : (
        <Dialog open={!!sidePanel} onOpenChange={(o) => !o && setPanel(null)} title={panel === "ai" ? "Ask ORBIT" : "Links"} side="right" className="[&>div:last-child]:p-0">
          <div className="h-[calc(100dvh-74px)]">{sidePanel}</div>
        </Dialog>
      )}

      {/* Dialogs */}
      <Dialog open={linkUrl !== null} onOpenChange={(o) => !o && setLinkUrl(null)} title="Link">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const url = (linkUrl ?? "").trim();
            if (!editor) return;
            if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
            else if (/^(https?:\/\/|mailto:|\/)/i.test(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: `https://${url}` }).run();
            setLinkUrl(null);
          }}
        >
          <Input value={linkUrl ?? ""} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" aria-label="URL" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setLinkUrl("")} type="submit">
              Remove link
            </Button>
            <Button type="submit">Apply</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!mathDialog} onOpenChange={(o) => !o && setMathDialog(null)} title={mathDialog?.block ? "Math block" : "Inline math"} description="LaTeX, rendered with KaTeX.">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editor || !mathDialog) return;
            const latex = mathDialog.latex.trim();
            if (mathDialog.pos !== undefined) {
              if (mathDialog.block) editor.chain().updateBlockMath({ latex, pos: mathDialog.pos }).focus().run();
              else editor.chain().updateInlineMath({ latex, pos: mathDialog.pos }).focus().run();
            } else if (mathDialog.block) editor.chain().focus().insertBlockMath({ latex }).run();
            else editor.chain().focus().insertInlineMath({ latex }).run();
            setMathDialog(null);
          }}
        >
          <Input value={mathDialog?.latex ?? ""} onChange={(e) => setMathDialog((m) => (m ? { ...m, latex: e.target.value } : m))} className="font-mono" aria-label="LaTeX" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMathDialog(null)}>
              Cancel
            </Button>
            <Button type="submit">{mathDialog?.pos !== undefined ? "Update" : "Insert"}</Button>
          </div>
        </form>
      </Dialog>

      <AddLinkDialog
        open={linkDialog}
        onOpenChange={setLinkDialog}
        linkables={linkables.filter((l) => !linkedIds.has(l.id) && l.id !== note.id)}
        onLink={(target, kind) =>
          start(async () => {
            const r = await linkEntities({ from_type: "note", from_id: note.id, to_type: target.type, to_id: target.id, kind });
            if (r.ok) {
              toast.show(`Linked to “${target.title}”`);
              setLinkDialog(false);
              router.refresh();
            } else toast.error(r.error);
          })
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this note?"
        body="The note and its links will be removed. You can undo right after."
        confirmLabel="Delete"
        destructive
        onConfirm={() =>
          start(async () => {
            debouncedContent.cancel();
            const r = await deleteNote(note.id);
            setDeleteOpen(false);
            if (!r.ok) return toast.error(r.error);
            htmlRef.current = note.content; // prevent flush-on-unmount
            const snapshot = r.data;
            router.push("/app/notes");
            toast.show(`Deleted “${note.title}”`, {
              action: {
                label: "Undo",
                onClick: async () => {
                  const u = await restoreNote(snapshot);
                  if (u.ok) router.push(`/app/notes/${u.data.id}`);
                },
              },
            });
          })
        }
      />
    </div>
  );
}

function LinksPanel({ links, onAdd, onRemove, onClose }: { links: NoteLink[]; onAdd: () => void; onRemove: (edgeId: string) => void; onClose: () => void }) {
  const out = links.filter((l) => l.direction === "out");
  const back = links.filter((l) => l.direction === "in");
  const Row = ({ l }: { l: NoteLink }) => (
    <li className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-soft">
      <span className="label w-20 shrink-0 text-ink-3">{l.type}</span>
      {l.href ? (
        <Link href={l.href} className="min-w-0 flex-1 truncate text-[13px] hover:underline">
          {l.title}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate text-[13px]">{l.title}</span>
      )}
      <span className="hidden text-[11px] text-ink-2 sm:inline">{KIND_LABEL[l.kind]}</span>
      <button onClick={() => onRemove(l.edgeId)} aria-label={`Remove link to ${l.title}`} className="rounded p-1 text-ink-3 opacity-0 hover:text-danger group-hover:opacity-100 focus:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="label text-ink">Connected knowledge</span>
        <button onClick={onClose} aria-label="Close links" className="rounded-md p-1 text-ink-2 hover:bg-soft">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3" data-lenis-prevent>
        <Button size="sm" variant="outline" className="w-full" onClick={onAdd}>
          <Link2 className="h-3.5 w-3.5" /> Link to lesson, note, subject…
        </Button>
        <p className="label mt-5 px-2 text-ink-3">Links from this note · {out.length}</p>
        <ul className="mt-1">{out.length ? out.map((l) => <Row key={l.edgeId} l={l} />) : <li className="px-2 py-2 text-[12.5px] text-ink-2">No outgoing links yet.</li>}</ul>
        <p className="label mt-5 px-2 text-ink-3">Backlinks · {back.length}</p>
        <ul className="mt-1">{back.length ? back.map((l) => <Row key={l.edgeId} l={l} />) : <li className="px-2 py-2 text-[12.5px] text-ink-2">Nothing links here yet.</li>}</ul>
      </div>
    </div>
  );
}

function AddLinkDialog({ open, onOpenChange, linkables, onLink }: { open: boolean; onOpenChange: (o: boolean) => void; linkables: Linkable[]; onLink: (target: Linkable, kind: EdgeKind) => void }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<EdgeKind>("related");
  const filtered = linkables.filter((l) => l.title.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Link knowledge" description="Relationships appear in My Universe and as backlinks.">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, lessons, subjects…" aria-label="Search linkable items" autoFocus />
          <Select value={kind} onChange={(e) => setKind(e.target.value as EdgeKind)} aria-label="Relationship">
            {(Object.keys(KIND_LABEL) as EdgeKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto rounded-xl border border-line" data-lenis-prevent>
          {filtered.length === 0 ? <li className="px-4 py-6 text-center text-[13px] text-ink-2">Nothing to link yet.</li> : null}
          {filtered.map((l) => (
            <li key={`${l.type}-${l.id}`}>
              <button onClick={() => onLink(l, kind)} className={cn("flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left last:border-0 hover:bg-soft")}>
                <span className="label w-24 shrink-0 text-ink-3">{l.type}</span>
                <span className="truncate text-[13px]">{l.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <Field label="Tip" hint="Use “Prerequisite” for things you must understand first and “Builds upon” for follow-ups.">
          <span />
        </Field>
      </div>
    </Dialog>
  );
}
