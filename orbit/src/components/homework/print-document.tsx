"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { DIAGRAM_LANGS, ProcessBlock } from "@/components/app/process-diagram";

/** A4 hand-in document. "Save as PDF" in the print dialog produces a vector PDF with real text and typeset maths. */
export function PrintDocument({ id, title, subject, name, markdown, autoPrint }: { id: string; title: string; subject: string | null; name: string | null; markdown: string; autoPrint: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    let cancelled = false;
    void document.fonts.ready.then(() => setTimeout(() => !cancelled && window.print(), 350));
    return () => {
      cancelled = true;
    };
  }, [autoPrint]);

  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  // Drop a leading H1 when it repeats the title, so the title block isn't doubled.
  const body = markdown.replace(/^\s*#\s+(.+)\n/, (m, h: string) => (h.trim().toLowerCase() === title.trim().toLowerCase() ? "" : m));

  return (
    <div className="hw-print">
      <style>{CSS}</style>
      <div className="hw-bar">
        <Link href={`/app/homework/${id}`} className="hw-btn ghost">
          <ArrowLeft size={15} /> Back
        </Link>
        <span className="hw-hint">Choose “Save as PDF” as the destination.</span>
        <button className="hw-btn" onClick={() => window.print()}>
          <Printer size={15} /> Save as PDF
        </button>
      </div>
      <article className="hw-page">
        <header className="hw-head">
          <h1>{title}</h1>
          <p>{[subject, name, date].filter(Boolean).join("  ·  ")}</p>
        </header>
        <div className="hw-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              pre({ children, ...rest }) {
                const child = Array.isArray(children) ? children[0] : children;
                const cls = (child as { props?: { className?: string } } | null)?.props?.className ?? "";
                if (DIAGRAM_LANGS.some((l) => cls.includes(`language-${l}`))) return <>{children}</>;
                return <pre {...rest}>{children}</pre>;
              },
              code({ className, children, ...rest }) {
                const lang = /language-(\w+)/.exec(className ?? "")?.[1];
                if (lang && DIAGRAM_LANGS.includes(lang)) return <ProcessBlock source={String(children).trim()} />;
                return (
                  <code className={className} {...rest}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
}

const CSS = `
@page { size: A4; margin: 22mm 20mm 22mm 20mm; @bottom-center { content: counter(page) " / " counter(pages); font: 9pt "Inter", sans-serif; color: #8a8d92; } }
html, body { background: #e9e7e2 !important; }
.hw-print { min-height: 100vh; padding: 72px 16px 48px; color: #141517; }
.hw-bar { position: fixed; inset: 0 0 auto 0; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px; background: rgba(246,245,242,.92); backdrop-filter: blur(10px); border-bottom: 1px solid #dddcd7; z-index: 10; font: 13px "Inter", sans-serif; }
.hw-hint { margin-left: auto; color: #6f7378; }
.hw-btn { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px; border-radius: 10px; background: #111214; color: #f6f5f2; font: 500 13px "Inter", sans-serif; border: 0; cursor: pointer; text-decoration: none; }
.hw-btn.ghost { background: transparent; color: #111214; border: 1px solid #dddcd7; }
.hw-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 22mm 20mm; box-shadow: 0 30px 60px -30px rgba(0,0,0,.35); }
.hw-head { border-bottom: 1px solid #d7d5cf; padding-bottom: 14pt; margin-bottom: 18pt; }
.hw-head h1 { font: 700 22pt/1.15 "Inter Display", "Inter", sans-serif; letter-spacing: -.02em; margin: 0; }
.hw-head p { margin: 8pt 0 0; font: 9.5pt "Inter", sans-serif; color: #6f7378; letter-spacing: .01em; }
.hw-body { font: 11pt/1.6 "Charter", "Iowan Old Style", "Georgia", "Times New Roman", serif; }
.hw-body h1, .hw-body h2, .hw-body h3, .hw-body h4 { font-family: "Inter Display", "Inter", sans-serif; letter-spacing: -.01em; line-height: 1.25; break-after: avoid; page-break-after: avoid; }
.hw-body h1 { font-size: 16pt; margin: 20pt 0 8pt; }
.hw-body h2 { font-size: 13.5pt; margin: 18pt 0 6pt; }
.hw-body h3 { font-size: 11.5pt; margin: 14pt 0 4pt; }
.hw-body p { margin: 0 0 9pt; text-align: justify; hyphens: auto; orphans: 3; widows: 3; }
.hw-body ul, .hw-body ol { margin: 0 0 9pt; padding-left: 18pt; }
.hw-body li { margin: 2pt 0; }
.hw-body strong { font-weight: 700; }
.hw-body blockquote { margin: 0 0 9pt; padding-left: 12pt; border-left: 2px solid #d7d5cf; color: #44474b; }
.hw-body table { width: 100%; border-collapse: collapse; margin: 6pt 0 12pt; font-size: 10pt; break-inside: avoid; }
.hw-body th, .hw-body td { border: 1px solid #d7d5cf; padding: 5pt 7pt; text-align: left; vertical-align: top; }
.hw-body th { background: #f4f3f0; font-family: "Inter", sans-serif; font-weight: 600; }
.hw-body code { font: 9.5pt "JetBrains Mono", "DejaVu Sans Mono", monospace; background: #f4f3f0; padding: 0 3pt; border-radius: 3px; }
.hw-body pre { background: #f6f5f2; border: 1px solid #e4e2dc; border-radius: 6px; padding: 8pt 10pt; overflow: hidden; white-space: pre-wrap; break-inside: avoid; }
.hw-body pre code { background: none; padding: 0; }
.hw-body .katex-display { margin: 8pt 0 10pt; overflow-x: auto; overflow-y: hidden; break-inside: avoid; }
.hw-body .katex { font-size: 1.05em; }
.hw-body hr { border: 0; border-top: 1px solid #e0ded8; margin: 14pt 0; }
@media print {
  html, body { background: #fff !important; }
  .hw-bar { display: none !important; }
  .hw-print { padding: 0; min-height: 0; }
  .hw-page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
}
@media (max-width: 860px) { .hw-page { width: 100%; padding: 28px 22px; min-height: 0; } .hw-hint { display: none; } }
`;
