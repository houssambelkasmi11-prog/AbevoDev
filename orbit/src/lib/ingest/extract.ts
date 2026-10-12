import "server-only";
import type { SourceOutlineItem } from "@/lib/types";
import { safeFetch } from "@/lib/net";
import { stripHtml } from "@/lib/utils";
import { unitsFromMarkdown, type TextUnit } from "./chunk";

export interface Extraction {
  units: TextUnit[];
  outline: SourceOutlineItem[];
  pageCount: number | null;
  title?: string;
}

/* ─────────────────────────────── PDF ─────────────────────────────── */

interface OutlineNode {
  title: string;
  dest: unknown;
  items?: OutlineNode[];
}

export async function extractPdf(data: Uint8Array): Promise<Extraction> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const units: TextUnit[] = pages.map((t, i) => ({ text: t, page: i + 1, heading: null }));

  // Best-effort outline with page numbers.
  const outline: SourceOutlineItem[] = [];
  try {
    const raw = (await pdf.getOutline()) as OutlineNode[] | null;
    const walk = async (nodes: OutlineNode[], level: number) => {
      for (const n of nodes.slice(0, 200)) {
        let page: number | null = null;
        try {
          const dest = typeof n.dest === "string" ? await pdf.getDestination(n.dest) : n.dest;
          if (Array.isArray(dest) && dest[0]) page = (await pdf.getPageIndex(dest[0] as Parameters<typeof pdf.getPageIndex>[0])) + 1;
        } catch {
          page = null;
        }
        outline.push({ title: n.title, page, level });
        if (n.items?.length && level < 3) await walk(n.items, level + 1);
      }
    };
    if (raw) await walk(raw, 1);
  } catch {
    /* outline is optional */
  }

  // Attach nearest outline heading to each page unit.
  if (outline.length) {
    const sorted = outline.filter((o) => o.page !== null).sort((a, b) => (a.page ?? 0) - (b.page ?? 0));
    for (const u of units) {
      const h = [...sorted].reverse().find((o) => (o.page ?? 0) <= (u.page ?? 0));
      u.heading = h?.title ?? null;
    }
  }
  return { units, outline, pageCount: totalPages };
}

/* ─────────────────────────────── DOCX ─────────────────────────────── */

export async function extractDocx(data: Uint8Array): Promise<Extraction> {
  const mammoth = await import("mammoth");
  const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(data) });
  const units: TextUnit[] = [];
  const outline: SourceOutlineItem[] = [];
  const parts = html.split(/(<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>)/i);
  let heading: string | null = null;
  for (const part of parts) {
    const hm = part.match(/^<h([1-3])[^>]*>([\s\S]*?)<\/h[1-3]>$/i);
    if (hm) {
      heading = stripHtml(hm[2]);
      outline.push({ title: heading, page: null, level: Number(hm[1]) });
      continue;
    }
    const text = stripHtml(part);
    if (text) units.push({ text, page: null, heading });
  }
  return { units, outline, pageCount: null };
}

/* ─────────────────────────── Text / Markdown ─────────────────────────── */

export function extractText(text: string): Extraction {
  const units = unitsFromMarkdown(text);
  const outline = text
    .split(/\r?\n/)
    .map((l) => l.match(/^(#{1,3})\s+(.+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ title: m[2].trim(), page: null, level: m[1].length }));
  return { units, outline, pageCount: null };
}

/* ─────────────────────────────── URL ─────────────────────────────── */

export async function extractUrl(url: string): Promise<Extraction> {
  const { res, body } = await safeFetch(url, {
    headers: { "User-Agent": "ORBIT-Study/1.0 (+source import)", Accept: "text/html,application/xhtml+xml,text/plain;q=0.9" },
  });
  if (!res.ok) throw new Error(`The page responded with HTTP ${res.status}.`);
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/pdf")) return extractPdf(body);
  const raw = new TextDecoder().decode(body);
  if (!type.includes("html")) return { ...extractText(raw), title: undefined };

  const title = stripHtml(raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").slice(0, 200) || undefined;
  // Prefer <article>/<main>; drop chrome.
  let main = raw.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? raw.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? raw.match(/<body[\s\S]*?<\/body>/i)?.[0] ?? raw;
  main = main.replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const outline: SourceOutlineItem[] = [];
  const units: TextUnit[] = [];
  let heading: string | null = null;
  for (const part of main.split(/(<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>)/i)) {
    const hm = part.match(/^<h([1-3])[^>]*>([\s\S]*?)<\/h[1-3]>$/i);
    if (hm) {
      heading = stripHtml(hm[2]).slice(0, 200);
      if (heading) outline.push({ title: heading, page: null, level: Number(hm[1]) });
      continue;
    }
    const t = stripHtml(part);
    if (t.length > 40) units.push({ text: t, page: null, heading });
  }
  return { units, outline, pageCount: null, title };
}

/* ─────────────────────────────── YouTube ─────────────────────────────── */

export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/** Fetches public video metadata via oEmbed (no API key needed). */
export async function youtubeTitle(url: string): Promise<string | null> {
  try {
    const { res, body } = await safeFetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { timeoutMs: 8000, maxBytes: 64 * 1024 });
    if (!res.ok) return null;
    const j = JSON.parse(new TextDecoder().decode(body)) as { title?: string };
    return j.title ?? null;
  } catch {
    return null;
  }
}
