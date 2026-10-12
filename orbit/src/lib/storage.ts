import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/db/local";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Private object storage. Objects are always namespaced by owner:
 *   <userId>/<key>
 * Supabase Storage policies (see migration) only allow a user to touch
 * objects whose first path segment equals their auth uid.
 */

const FILE_DIR = path.join(DATA_DIR, "files");

function safeKey(key: string): string {
  const clean = key.replace(/\\/g, "/").split("/").filter((s) => s && s !== "." && s !== "..").join("/");
  if (!clean) throw new Error("Invalid storage key");
  return clean;
}

export async function putObject(userId: string, key: string, data: Uint8Array, contentType: string): Promise<string> {
  const k = `${userId}/${safeKey(key)}`;
  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    const { error } = await sb.storage.from(env.storageBucket).upload(k, data, { contentType, upsert: true });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return k;
  }
  const full = path.join(FILE_DIR, ...k.split("/"));
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return k;
}

export async function getObject(userId: string, storagePath: string): Promise<Buffer> {
  if (!storagePath.startsWith(`${userId}/`)) throw new Error("Forbidden");
  const k = safeKey(storagePath);
  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    const { data, error } = await sb.storage.from(env.storageBucket).download(k);
    if (error || !data) throw new Error(`Download failed: ${error?.message ?? "missing object"}`);
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.readFile(path.join(FILE_DIR, ...k.split("/")));
}

export async function removeObject(userId: string, storagePath: string): Promise<void> {
  if (!storagePath.startsWith(`${userId}/`)) return;
  const k = safeKey(storagePath);
  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    await sb.storage.from(env.storageBucket).remove([k]);
    return;
  }
  await fs.rm(path.join(FILE_DIR, ...k.split("/")), { force: true });
}

export async function removeAllObjects(userId: string): Promise<void> {
  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    const bucket = sb.storage.from(env.storageBucket);
    // Walk one level of folders under the user prefix.
    const { data: top } = await bucket.list(userId, { limit: 1000 });
    for (const entry of top ?? []) {
      const prefix = `${userId}/${entry.name}`;
      const { data: inner } = await bucket.list(prefix, { limit: 1000 });
      const files = (inner ?? []).map((f) => `${prefix}/${f.name}`);
      if (files.length) await bucket.remove(files);
      else await bucket.remove([prefix]);
    }
    return;
  }
  await fs.rm(path.join(FILE_DIR, userId), { recursive: true, force: true });
}
