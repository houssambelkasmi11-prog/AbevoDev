"use client";

import Link from "next/link";
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { DIAGRAM_LANGS, ProcessBlock } from "@/components/app/process-diagram";
import type { Citation } from "@/lib/types";
import { cn } from "@/lib/utils";

export const NOT_IN_SOURCES = "[NOT_IN_SOURCES]";

function citationHref(c: Citation): string {
  if (c.kind === "note") return `/app/notes/${c.sourceId}`;
  return `/app/lessons/${c.sourceId}${c.page ? `?page=${c.page}` : ""}#chunk-${c.chunkId}`;
}

/** Turns [S1] / [S1, S2] markers into links the renderer can style as chips. */
function linkCitations(text: string, keys: Set<string>): string {
  return text.replace(/\[((?:S\d+)(?:\s*[,;]\s*S\d+)*)\]/g, (match, group: string) => {
    const parts = group.split(/\s*[,;]\s*/).filter((k) => keys.has(k));
    if (!parts.length) return match;
    return parts.map((k) => `[${k}](#cite-${k})`).join("");
  });
}

export const Markdown = memo(function Markdown({ text, citations = [], className }: { text: string; citations?: Citation[]; className?: string }) {
  const keys = new Set(citations.map((c) => c.key));
  const byKey = new Map(citations.map((c) => [c.key, c]));
  const body = linkCitations(text.replace(NOT_IN_SOURCES, "").trimStart(), keys);
  return (
    <div translate="no" className={cn("orbit-md", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true, plainText: DIAGRAM_LANGS }]]}
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
          a({ href, children }) {
            if (href?.startsWith("#cite-")) {
              const c = byKey.get(href.slice(6));
              if (!c) return <>{children}</>;
              return (
                <Link
                  href={citationHref(c)}
                  title={`${c.sourceTitle}${c.page ? ` · p.${c.page}` : ""}${c.heading ? ` · ${c.heading}` : ""}`}
                  className="mx-0.5 inline-flex h-[18px] -translate-y-px items-center rounded border border-ink/70 px-1 align-middle font-mono text-[9.5px] !no-underline hover:bg-ink hover:text-canvas"
                >
                  {c.key}
                  {c.page ? <span className="ml-1 opacity-60">p.{c.page}</span> : null}
                </Link>
              );
            }
            const external = href?.startsWith("http");
            return (
              <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer nofollow" : undefined}>
                {children}
              </a>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
});

export function NotInSourcesBanner() {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2 text-[12px] leading-relaxed text-ink-2">
      <span className="label mt-0.5 shrink-0 text-ink">Not in sources</span>
      <span>Your selected sources don&apos;t cover this. The answer below comes from the model&apos;s general knowledge — verify it.</span>
    </div>
  );
}
