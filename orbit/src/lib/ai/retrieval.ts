import "server-only";
import type { Repo } from "@/lib/db/repo";
import { SupabaseRepo } from "@/lib/db/supabase";
import { chunkUnits, unitsFromMarkdown } from "@/lib/ingest/chunk";
import type { ChatScope, Citation } from "@/lib/types";
import { truncate } from "@/lib/utils";
import { cosine, getEmbedder } from "./embeddings";
import type { GroundingBlock } from "./prompts";

const STOP = new Set(
  "a an the and or but if then of in on at to for from by with about as is are was were be been being this that these those it its into than so such not no do does did can could should would will may might must have has had i you he she we they them his her our your their what which who whom how why when where there here also very more most other some any each few all both just only over under again further once".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

interface Candidate {
  id: string;
  sourceId: string;
  sourceTitle: string;
  kind: "source" | "note";
  content: string;
  page: number | null;
  heading: string | null;
  embedding: number[] | null;
}

function bm25(query: string[], docs: string[][]): number[] {
  const N = docs.length || 1;
  const avg = docs.reduce((s, d) => s + d.length, 0) / N || 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const k1 = 1.2;
  const b = 0.75;
  const q = [...new Set(query)];
  return docs.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avg)));
    }
    return score;
  });
}

export interface RetrievalResult {
  blocks: GroundingBlock[];
  citations: Citation[];
  method: "hybrid" | "keyword" | "none";
}

/**
 * Retrieves the most relevant chunks from the user's authorised scope.
 * Empty scope = the whole active workspace.
 */
export async function retrieve(repo: Repo, workspaceId: string, query: string, scope: ChatScope, k = 8): Promise<RetrievalResult> {
  const [sources, notes] = await Promise.all([
    repo.list("sources", { where: { workspace_id: workspaceId } }),
    repo.list("notes", { where: { workspace_id: workspaceId } }),
  ]);
  const wide = scope.subjectIds.length + scope.sourceIds.length + scope.noteIds.length + scope.collections.length === 0;

  const inScopeSources = sources.filter(
    (s) =>
      s.status === "ready" &&
      (wide ||
        scope.sourceIds.includes(s.id) ||
        (s.subject_id !== null && scope.subjectIds.includes(s.subject_id)) ||
        (s.collection !== null && scope.collections.includes(s.collection))),
  );
  const inScopeNotes = notes.filter(
    (n) => n.plain.trim().length > 0 && (wide || scope.noteIds.includes(n.id) || (n.subject_id !== null && scope.subjectIds.includes(n.subject_id))),
  );

  const sourceById = new Map(inScopeSources.map((s) => [s.id, s]));
  const chunks = inScopeSources.length
    ? await repo.list("source_chunks", { whereIn: { column: "source_id", values: inScopeSources.map((s) => s.id) } })
    : [];

  const candidates: Candidate[] = chunks.map((c) => ({
    id: c.id,
    sourceId: c.source_id,
    sourceTitle: sourceById.get(c.source_id)?.title ?? "Source",
    kind: "source",
    content: c.content,
    page: c.page,
    heading: c.heading,
    embedding: c.embedding,
  }));
  for (const n of inScopeNotes) {
    chunkUnits(unitsFromMarkdown(n.plain)).forEach((c, i) =>
      candidates.push({ id: `${n.id}:${i}`, sourceId: n.id, sourceTitle: n.title, kind: "note", content: c.content, page: null, heading: c.heading, embedding: null }),
    );
  }
  if (candidates.length === 0) return { blocks: [], citations: [], method: "none" };

  // Keyword ranking (always available).
  const qTokens = tokenize(query);
  const scores = bm25(qTokens, candidates.map((c) => tokenize(`${c.heading ?? ""} ${c.content}`)));
  const keywordRank = candidates.map((c, i) => ({ c, s: scores[i] })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);

  // Semantic ranking when the user configured embeddings.
  let semanticRank: { c: Candidate; s: number }[] = [];
  let method: RetrievalResult["method"] = "keyword";
  try {
    const embedder = await getEmbedder(repo);
    if (embedder && candidates.some((c) => c.embedding)) {
      const [qv] = await embedder.embed([query]);
      if (repo instanceof SupabaseRepo) {
        const ids = inScopeSources.map((s) => s.id);
        const matches = await repo.matchChunks(qv, ids, 24);
        const byId = new Map(candidates.map((c) => [c.id, c]));
        semanticRank = matches.map((m) => ({ c: byId.get(m.id), s: m.similarity })).filter((x): x is { c: Candidate; s: number } => !!x.c);
      } else {
        semanticRank = candidates
          .filter((c) => c.embedding)
          .map((c) => ({ c, s: cosine(qv, c.embedding as number[]) }))
          .sort((a, b) => b.s - a.s)
          .slice(0, 24);
      }
      method = "hybrid";
    }
  } catch (e) {
    console.warn("[orbit:retrieval] semantic search unavailable, using keyword ranking:", e instanceof Error ? e.message : e);
  }

  // Reciprocal-rank fusion.
  const fused = new Map<string, { c: Candidate; s: number }>();
  const add = (list: { c: Candidate }[], weight: number) =>
    list.forEach((x, rank) => {
      const prev = fused.get(x.c.id);
      const s = weight / (60 + rank);
      fused.set(x.c.id, { c: x.c, s: (prev?.s ?? 0) + s });
    });
  add(keywordRank.slice(0, 40), 1);
  add(semanticRank, 1.1);

  const ranked = [...fused.values()].sort((a, b) => b.s - a.s);
  const perSource = new Map<string, number>();
  const picked: Candidate[] = [];
  for (const { c } of ranked) {
    const n = perSource.get(c.sourceId) ?? 0;
    if (n >= 3) continue;
    perSource.set(c.sourceId, n + 1);
    picked.push(c);
    if (picked.length >= k) break;
  }

  const blocks: GroundingBlock[] = [];
  const citations: Citation[] = [];
  picked.forEach((c, i) => {
    const key = `S${i + 1}`;
    blocks.push({ key, title: c.sourceTitle, page: c.page, heading: c.heading, content: c.content });
    citations.push({
      key,
      sourceId: c.sourceId,
      sourceTitle: c.sourceTitle,
      chunkId: c.id,
      page: c.page,
      heading: c.heading,
      excerpt: truncate(c.content, 280),
      kind: c.kind,
    });
  });
  return { blocks, citations, method: picked.length ? method : "none" };
}
