export interface TextUnit {
  text: string;
  page: number | null;
  heading: string | null;
}

export interface Chunk {
  content: string;
  page: number | null;
  heading: string | null;
  token_count: number;
}

const TARGET = 1100; // characters (~250–300 tokens)
const OVERLAP = 180;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Splits page/section units into overlapping chunks while preserving the page
 * number and nearest heading for every chunk — required for citations.
 */
export function chunkUnits(units: TextUnit[]): Chunk[] {
  const out: Chunk[] = [];
  for (const unit of units) {
    const paras = unit.text
      .replace(/\r/g, "")
      .split(/\n{2,}/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    let buf = "";
    const flush = () => {
      const content = buf.trim();
      if (content.length > 20) out.push({ content, page: unit.page, heading: unit.heading, token_count: estimateTokens(content) });
      buf = content.length > OVERLAP ? content.slice(-OVERLAP).replace(/^\S*\s/, "") : "";
    };
    for (const p of paras) {
      if (p.length > TARGET * 1.5) {
        // Hard-split very long paragraphs on sentence boundaries.
        const sentences = p.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [p];
        for (const s of sentences) {
          if ((buf + " " + s).length > TARGET) flush();
          buf += (buf ? " " : "") + s.trim();
        }
        continue;
      }
      if ((buf + "\n\n" + p).length > TARGET && buf.length > 0) flush();
      buf += (buf ? "\n\n" : "") + p;
    }
    if (buf.trim().length > 20) out.push({ content: buf.trim(), page: unit.page, heading: unit.heading, token_count: estimateTokens(buf) });
  }
  return out;
}

/** Splits plain text with markdown-style headings into units. */
export function unitsFromMarkdown(text: string): TextUnit[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const units: TextUnit[] = [];
  let heading: string | null = null;
  let buf: string[] = [];
  const push = () => {
    const t = buf.join("\n").trim();
    if (t) units.push({ text: t, page: null, heading });
    buf = [];
  };
  for (const line of lines) {
    const m = line.match(/^(#{1,4})\s+(.+)$/);
    if (m) {
      push();
      heading = m[2].trim();
    } else buf.push(line);
  }
  push();
  return units.length ? units : [{ text, page: null, heading: null }];
}
