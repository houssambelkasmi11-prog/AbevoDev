import "server-only";
import type { Repo } from "@/lib/db/repo";
import { PROVIDERS } from "./providers";
import { connectionFor } from "./resolve";

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
  label: string;
}

/** Returns an embedder when the user chose an embedding-capable provider. */
export async function getEmbedder(repo: Repo): Promise<Embedder | null> {
  const [settings] = await repo.list("settings", { limit: 1 });
  const id = settings?.embeddings_credential_id;
  if (!id) return null;
  const cred = await repo.get("credentials", id);
  if (!cred) return null;
  const adapter = PROVIDERS[cred.provider];
  if (!adapter.supportsEmbeddings || !adapter.embed) return null;
  const conn = connectionFor(cred, repo.userId);
  const embed = adapter.embed.bind(adapter);
  return {
    label: `${adapter.label} · ${adapter.defaultEmbeddingModel ?? "default"}`,
    async embed(texts) {
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += 64) {
        const batch = texts.slice(i, i + 64).map((t) => t.slice(0, 8000));
        out.push(...(await embed(conn, batch, adapter.defaultEmbeddingModel)));
      }
      return out;
    },
  };
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
