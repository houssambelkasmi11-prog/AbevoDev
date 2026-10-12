"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  Braces,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Redo2,
  Sigma,
  SquareFunction,
  Strikethrough,
  Table2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function Btn({ onClick, active, label, children, disabled }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-soft hover:text-ink disabled:opacity-30", active && "bg-soft text-ink")}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />;

export function EditorToolbar({ editor, onLink, onImage, onMath }: { editor: Editor; onLink: () => void; onImage: () => void; onMath: (block: boolean) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const i = "h-4 w-4";
  return (
    <div role="toolbar" aria-label="Formatting" className="scrollbar-none flex items-center gap-0.5 overflow-x-auto">
      <Btn label="Heading 1" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}>
        <Heading1 className={i} />
      </Btn>
      <Btn label="Heading 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <Heading2 className={i} />
      </Btn>
      <Btn label="Heading 3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <Heading3 className={i} />
      </Btn>
      <Sep />
      <Btn label="Bold (Ctrl B)" active={s.bold} onClick={() => c().toggleBold().run()}>
        <Bold className={i} />
      </Btn>
      <Btn label="Italic (Ctrl I)" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <Italic className={i} />
      </Btn>
      <Btn label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}>
        <Strikethrough className={i} />
      </Btn>
      <Btn label="Inline code" active={s.code} onClick={() => c().toggleCode().run()}>
        <Code className={i} />
      </Btn>
      <Btn label="Link" active={s.link} onClick={onLink}>
        <Link2 className={i} />
      </Btn>
      <Sep />
      <Btn label="Bulleted list" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <List className={i} />
      </Btn>
      <Btn label="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered className={i} />
      </Btn>
      <Btn label="Checklist" active={s.task} onClick={() => c().toggleTaskList().run()}>
        <ListChecks className={i} />
      </Btn>
      <Btn label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <Quote className={i} />
      </Btn>
      <Btn label="Code block" active={s.codeBlock} onClick={() => c().toggleCodeBlock().run()}>
        <Braces className={i} />
      </Btn>
      <Sep />
      <Btn label="Insert table" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <Table2 className={i} />
      </Btn>
      <Btn label="Insert image" onClick={onImage}>
        <ImagePlus className={i} />
      </Btn>
      <Btn label="Inline math" onClick={() => onMath(false)}>
        <Sigma className={i} />
      </Btn>
      <Btn label="Math block" onClick={() => onMath(true)}>
        <SquareFunction className={i} />
      </Btn>
      <Sep />
      <Btn label="Undo (Ctrl Z)" disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <Undo2 className={i} />
      </Btn>
      <Btn label="Redo (Ctrl Shift Z)" disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <Redo2 className={i} />
      </Btn>
    </div>
  );
}
