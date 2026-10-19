import "server-only";

export interface ExportSection {
  label: string; // e.g. "YOUR WORK"
  note?: string; // provenance line
  markdown: string;
}

export function toMarkdown(title: string, sections: ExportSection[]): string {
  return [`# ${title}`, ...sections.map((s) => [s.label ? `## ${s.label}` : "", s.note ? `_${s.note}_` : "", s.markdown.trim()].filter(Boolean).join("\n\n"))].join("\n\n") + "\n";
}

export function toPlainText(md: string): string {
  return md
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 ($2)");
}

export async function toDocx(title: string, sections: ExportSection[]): Promise<Uint8Array> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const children: InstanceType<typeof Paragraph>[] = [new Paragraph({ text: title, heading: HeadingLevel.TITLE })];
  const inline = (line: string) => {
    const runs: InstanceType<typeof TextRun>[] = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      if (m.index > last) runs.push(new TextRun(line.slice(last, m.index)));
      const tok = m[0];
      if (tok.startsWith("**")) runs.push(new TextRun({ text: tok.slice(2, -2), bold: true }));
      else if (tok.startsWith("`")) runs.push(new TextRun({ text: tok.slice(1, -1), font: "Consolas" }));
      else runs.push(new TextRun({ text: tok.slice(1, -1), italics: true }));
      last = m.index + tok.length;
    }
    if (last < line.length) runs.push(new TextRun(line.slice(last)));
    return runs;
  };
  for (const s of sections) {
    if (s.label) children.push(new Paragraph({ text: s.label, heading: HeadingLevel.HEADING_1 }));
    if (s.note) children.push(new Paragraph({ children: [new TextRun({ text: s.note, italics: true, color: "777B80" })] }));
    let inCode = false;
    let inDiagram = false;
    for (const raw of s.markdown.split(/\r?\n/)) {
      if (/^```(bpmn|process|flow)\b/.test(raw)) {
        inDiagram = true;
        children.push(new Paragraph({ children: [new TextRun({ text: "[Diagram: included in the PDF version]", italics: true, color: "777B80" })] }));
        continue;
      }
      if (inDiagram) {
        if (raw.startsWith("```")) inDiagram = false;
        continue;
      }
      if (raw.startsWith("```")) {
        inCode = !inCode;
        continue;
      }
      if (inCode) {
        children.push(new Paragraph({ children: [new TextRun({ text: raw, font: "Consolas", size: 18 })] }));
        continue;
      }
      const h = raw.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        const level = h[1].length === 1 ? HeadingLevel.HEADING_2 : h[1].length === 2 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4;
        children.push(new Paragraph({ text: h[2], heading: level }));
      } else if (/^\s*[-*]\s+/.test(raw)) children.push(new Paragraph({ children: inline(raw.replace(/^\s*[-*]\s+/, "")), bullet: { level: 0 } }));
      else if (/^\s*\d+[.)]\s+/.test(raw)) children.push(new Paragraph({ children: inline(raw) }));
      else if (raw.trim()) children.push(new Paragraph({ children: inline(raw), spacing: { after: 120 } }));
    }
  }
  const doc = new Document({ creator: "ORBIT", title, sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}

export async function toPdf(title: string, sections: ExportSection[]): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setCreator("ORBIT");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const W = 595.28;
  const H = 841.89;
  const M = 56;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  // WinAnsi-safe text (standard fonts can't encode arbitrary Unicode).
  const safe = (t: string) =>
    t
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/…/g, "...")
      .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");

  const write = (text: string, font: typeof regular, size: number, color = rgb(0.07, 0.07, 0.08), indent = 0) => {
    const maxW = W - M * 2 - indent;
    const words = safe(text).split(/\s+/);
    let line = "";
    const flush = () => {
      if (y < M + size) {
        page = pdf.addPage([W, H]);
        y = H - M;
      }
      page.drawText(line, { x: M + indent, y, size, font, color });
      y -= size * 1.45;
      line = "";
    };
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > maxW && line) flush();
      line = line ? `${line} ${w}` : w;
    }
    if (line) flush();
  };

  write(title, bold, 20);
  y -= 8;
  for (const s of sections) {
    y -= 10;
    if (s.label) write(s.label, bold, 11, rgb(0.07, 0.07, 0.08));
    if (s.note) write(s.note, italic, 9, rgb(0.47, 0.48, 0.5));
    y -= 4;
    let inCode = false;
    for (const raw of s.markdown.split(/\r?\n/)) {
      if (raw.startsWith("```")) {
        inCode = !inCode;
        continue;
      }
      if (!raw.trim()) {
        y -= 6;
        continue;
      }
      if (inCode) {
        write(raw, mono, 9, rgb(0.15, 0.15, 0.16), 10);
        continue;
      }
      const h = raw.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        y -= 4;
        write(h[2], bold, h[1].length === 1 ? 14 : 12);
      } else if (/^\s*[-*]\s+/.test(raw)) write(`-  ${toPlainText(raw.replace(/^\s*[-*]\s+/, ""))}`, regular, 10.5, undefined, 8);
      else write(toPlainText(raw), regular, 10.5);
    }
  }
  return pdf.save();
}
