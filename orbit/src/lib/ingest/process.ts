import "server-only";
import { getEmbedder } from "@/lib/ai/embeddings";
import { complete } from "@/lib/ai/providers";
import type { ResolvedModel } from "@/lib/ai/resolve";
import type { Repo } from "@/lib/db/repo";
import { getObject } from "@/lib/storage";
import type { SourceRow } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { chunkUnits, type TextUnit } from "./chunk";
import { extractDocx, extractPdf, extractText, extractUrl, type Extraction } from "./extract";

const MAX_TEXT = 2_000_000;

async function setStatus(repo: Repo, id: string, patch: Partial<Pick<SourceRow, "status" | "status_detail" | "progress">>) {
  await repo.update("sources", id, patch);
}

/** Replaces a source's chunks with freshly extracted ones (and embeddings if configured). */
export async function indexUnits(repo: Repo, source: SourceRow, extraction: Extraction): Promise<void> {
  const chunks = chunkUnits(extraction.units);
  await setStatus(repo, source.id, { progress: 60, status_detail: `Indexing ${chunks.length} passages…` });

  let embeddings: (number[] | null)[] = chunks.map(() => null);
  let embedNote = "";
  try {
    const embedder = await getEmbedder(repo);
    if (embedder && chunks.length) {
      await setStatus(repo, source.id, { progress: 70, status_detail: `Embedding with ${embedder.label}…` });
      embeddings = await embedder.embed(chunks.map((c) => `${c.heading ? c.heading + "\n" : ""}${c.content}`));
    }
  } catch (e) {
    embedNote = ` Semantic embeddings skipped (${errorMessage(e).slice(0, 120)}); keyword search still works.`;
  }

  await repo.removeWhere("source_chunks", { source_id: source.id });
  for (let i = 0; i < chunks.length; i += 200) {
    await repo.insertMany(
      "source_chunks",
      chunks.slice(i, i + 200).map((c, j) => ({
        source_id: source.id,
        ord: i + j,
        content: c.content,
        page: c.page,
        heading: c.heading,
        token_count: c.token_count,
        embedding: embeddings[i + j] ?? null,
      })),
    );
  }

  const fullText = extraction.units
    .map((u) => (u.page !== null ? `--- Page ${u.page} ---\n${u.text}` : u.text))
    .join("\n\n")
    .slice(0, MAX_TEXT);

  await repo.update("sources", source.id, {
    text: fullText,
    outline: extraction.outline,
    page_count: extraction.pageCount,
    status: "ready",
    progress: 100,
    status_detail: chunks.length ? `${chunks.length} passages indexed.${embedNote}` : "No readable text found.",
    ...(extraction.title && source.title.startsWith("http") ? { title: extraction.title } : {}),
  });
}

/**
 * Background ingestion. Never fabricates text: when extraction yields nothing
 * the source is marked `needs_input` with an explanation.
 */
export async function processSource(repo: Repo, sourceId: string): Promise<void> {
  const source = await repo.get("sources", sourceId);
  if (!source) return;
  try {
    await setStatus(repo, source.id, { status: "processing", progress: 10, status_detail: "Extracting text…" });
    let extraction: Extraction | null = null;

    switch (source.kind) {
      case "pdf": {
        if (!source.storage_path) throw new Error("File is missing from storage.");
        extraction = await extractPdf(await getObject(repo.userId, source.storage_path));
        const chars = extraction.units.reduce((n, u) => n + u.text.trim().length, 0);
        if (chars < 40) {
          await repo.update("sources", source.id, {
            status: "needs_input",
            progress: 100,
            page_count: extraction.pageCount,
            status_detail: "This PDF looks scanned (no selectable text). Use “Extract text with AI” to run OCR with a vision-capable model.",
          });
          return;
        }
        break;
      }
      case "docx": {
        if (!source.storage_path) throw new Error("File is missing from storage.");
        extraction = await extractDocx(await getObject(repo.userId, source.storage_path));
        break;
      }
      case "text":
      case "markdown":
      case "summary":
      case "transcript": {
        let text = source.text ?? "";
        if (!text && source.storage_path) text = new TextDecoder().decode(await getObject(repo.userId, source.storage_path));
        extraction = extractText(text);
        break;
      }
      case "url": {
        if (!source.url) throw new Error("No URL to import.");
        extraction = await extractUrl(source.url);
        break;
      }
      case "youtube": {
        if (!source.text?.trim()) {
          await repo.update("sources", source.id, {
            status: "needs_input",
            progress: 100,
            status_detail: "Paste the video's transcript (YouTube → ⋯ → Show transcript) to index this lesson.",
          });
          return;
        }
        extraction = extractText(source.text);
        break;
      }
      case "image": {
        await repo.update("sources", source.id, {
          status: "needs_input",
          progress: 100,
          status_detail: "Images need OCR. Use “Extract text with AI” to read it with a vision-capable model.",
        });
        return;
      }
    }

    if (!extraction || extraction.units.every((u) => !u.text.trim())) {
      await repo.update("sources", source.id, { status: "failed", progress: 100, status_detail: "No readable text could be extracted." });
      return;
    }
    await setStatus(repo, source.id, { progress: 45, status_detail: "Structuring…" });
    await indexUnits(repo, source, extraction);
  } catch (e) {
    await repo
      .update("sources", source.id, { status: "failed", progress: 100, status_detail: errorMessage(e).slice(0, 300) })
      .catch(() => undefined);
  }
}

/** User-initiated OCR / transcription through a vision-capable model. */
export async function extractWithAI(repo: Repo, source: SourceRow, resolved: ResolvedModel): Promise<void> {
  if (!source.storage_path) throw new Error("This source has no stored file.");
  const bytes = await getObject(repo.userId, source.storage_path);
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("File is larger than 15 MB — too large to send for AI extraction.");
  const data = bytes.toString("base64");
  const isPdf = source.kind === "pdf";

  await setStatus(repo, source.id, { status: "processing", progress: 20, status_detail: `Reading with ${resolved.model}…` });
  const text = await complete(resolved.conn, {
    model: resolved.model,
    system:
      "You are a meticulous transcription engine. Transcribe ALL legible text from the provided document exactly as written. Preserve headings as Markdown (#, ##), lists and tables. Write equations in LaTeX. Do not summarise, translate, correct or add anything. If a region is illegible write [illegible]. If the document contains no text at all, reply with exactly: [NO_TEXT]" +
      (isPdf ? " Insert a line `--- Page N ---` before the content of each page." : ""),
    messages: [
      {
        role: "user",
        content: [
          isPdf ? { type: "pdf", data, filename: source.title } : { type: "image", mime: source.mime_type ?? "image/png", data },
          { type: "text", text: "Transcribe this document." },
        ],
      },
    ],
    temperature: 0,
    maxTokens: 8000,
  });

  if (!text.trim() || text.trim() === "[NO_TEXT]") {
    await repo.update("sources", source.id, { status: "needs_input", progress: 100, status_detail: "The model found no readable text in this file." });
    return;
  }

  const units: TextUnit[] = [];
  if (isPdf && /--- Page \d+ ---/.test(text)) {
    const parts = text.split(/--- Page (\d+) ---/);
    for (let i = 1; i < parts.length; i += 2) units.push({ text: parts[i + 1] ?? "", page: Number(parts[i]), heading: null });
  } else units.push(...extractText(text).units);

  await indexUnits(repo, source, { units, outline: extractText(text).outline, pageCount: source.page_count });
  await repo.update("sources", source.id, {
    status_detail: `Text extracted by ${resolved.model} (AI transcription — verify important details against the original).`,
  });
}
