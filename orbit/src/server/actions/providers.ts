"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PROVIDERS } from "@/lib/ai/providers";
import { publicCredential } from "@/lib/ai/resolve";
import { getContext } from "@/lib/bootstrap";
import { encryptionAvailable, encryptSecret, maskKey } from "@/lib/crypto";
import { env } from "@/lib/env";
import { assertPublicUrl } from "@/lib/net";
import type { ModelInfo, PublicCredential } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { run, type ActionResult } from "../result";

const NO_SECRET = "This server has no secret to protect API keys with. Set ORBIT_ENCRYPTION_KEY (run `npm run setup`) and restart.";

const providerEnum = z.enum(["openai", "anthropic", "gemini", "openrouter", "deepseek", "custom"]);

async function probe(provider: z.infer<typeof providerEnum>, apiKey: string, baseUrl: string | null): Promise<{ ok: true; models: ModelInfo[] } | { ok: false; error: string }> {
  try {
    const models = await PROVIDERS[provider].listModels({ kind: provider, apiKey, baseUrl });
    return { ok: true, models };
  } catch (e) {
    return { ok: false, error: errorMessage(e).slice(0, 300) };
  }
}

export async function addCredential(input: { provider: string; label?: string; apiKey: string; baseUrl?: string | null }): Promise<ActionResult<PublicCredential>> {
  return run(async () => {
    if (!encryptionAvailable()) throw new Error(NO_SECRET);
    const { repo, user } = await getContext();
    const data = z
      .object({
        provider: providerEnum,
        label: z.string().trim().max(60).optional(),
        apiKey: z.string().trim().min(8, "That key looks too short.").max(500),
        baseUrl: z.string().trim().url().max(500).nullable().optional(),
      })
      .parse(input);
    let baseUrl: string | null = null;
    if (data.provider === "custom") {
      if (!data.baseUrl) throw new Error("A base URL is required for a custom endpoint (e.g. https://host/v1).");
      await assertPublicUrl(data.baseUrl, { allowPrivate: env.allowPrivateEndpoints });
      baseUrl = data.baseUrl.replace(/\/+$/, "");
    }
    const result = await probe(data.provider, data.apiKey, baseUrl);
    const row = await repo.insert("credentials", {
      provider: data.provider,
      label: data.label || PROVIDERS[data.provider].label,
      base_url: baseUrl,
      key_ciphertext: encryptSecret(data.apiKey, user.id),
      key_hint: maskKey(data.apiKey),
      status: result.ok ? "connected" : "error",
      status_detail: result.ok ? `${result.models.length} models available` : result.error,
      models_cache: result.ok ? result.models : [],
      default_model: result.ok ? pickDefaultModel(data.provider, result.models) : null,
      last_tested_at: new Date().toISOString(),
    });
    revalidatePath("/app/settings/providers");
    return publicCredential(row);
  });
}

export async function testCredential(id: string): Promise<ActionResult<PublicCredential>> {
  return run(async () => {
    const { repo } = await getContext();
    const cred = await repo.get("credentials", id);
    if (!cred) throw new Error("Credential not found");
    const { decryptSecret } = await import("@/lib/crypto");
    const result = await probe(cred.provider, decryptSecret(cred.key_ciphertext, repo.userId), cred.base_url);
    const row = await repo.update("credentials", id, {
      status: result.ok ? "connected" : "error",
      status_detail: result.ok ? `${result.models.length} models available` : result.error,
      models_cache: result.ok ? result.models : cred.models_cache,
      last_tested_at: new Date().toISOString(),
      default_model: result.ok && cred.default_model && !result.models.some((m) => m.id === cred.default_model) ? null : cred.default_model,
    });
    return publicCredential(row);
  });
}

export async function replaceKey(id: string, apiKey: string): Promise<ActionResult<PublicCredential>> {
  return run(async () => {
    if (!encryptionAvailable()) throw new Error(NO_SECRET);
    const { repo, user } = await getContext();
    const key = z.string().trim().min(8).max(500).parse(apiKey);
    const cred = await repo.get("credentials", id);
    if (!cred) throw new Error("Credential not found");
    const result = await probe(cred.provider, key, cred.base_url);
    const row = await repo.update("credentials", id, {
      key_ciphertext: encryptSecret(key, user.id),
      key_hint: maskKey(key),
      status: result.ok ? "connected" : "error",
      status_detail: result.ok ? `${result.models.length} models available` : result.error,
      models_cache: result.ok ? result.models : [],
      last_tested_at: new Date().toISOString(),
    });
    return publicCredential(row);
  });
}

export async function updateCredential(id: string, input: { label?: string; default_model?: string | null }): Promise<ActionResult<PublicCredential>> {
  return run(async () => {
    const { repo } = await getContext();
    const data = z.object({ label: z.string().trim().min(1).max(60).optional(), default_model: z.string().max(200).nullable().optional() }).parse(input);
    const row = await repo.update("credentials", id, data);
    revalidatePath("/app/settings/providers");
    return publicCredential(row);
  });
}

/** Revokes and deletes a stored key; clears every reference to it. */
export async function deleteCredential(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo, settings } = await getContext();
    for (const p of await repo.list("personas", { where: { credential_id: id } })) await repo.update("personas", p.id, { credential_id: null, model: null });
    for (const c of await repo.list("conversations", { where: { credential_id: id } })) await repo.update("conversations", c.id, { credential_id: null, model: null });
    if (settings.embeddings_credential_id === id) await repo.update("settings", settings.id, { embeddings_credential_id: null });
    await repo.remove("credentials", id);
    revalidatePath("/app/settings/providers");
    return null;
  });
}

export async function listCredentials(): Promise<ActionResult<PublicCredential[]>> {
  return run(async () => {
    const { repo } = await getContext();
    return (await repo.list("credentials", { order: { column: "created_at" } })).map(publicCredential);
  });
}

/* ───────────────────────── one-field connect ───────────────────────── */

type Kind = z.infer<typeof providerEnum>;

/** Best guess(es) from the key's shape, most likely first. */
function detectProviders(key: string): Kind[] {
  if (/^sk-ant-/.test(key)) return ["anthropic"];
  if (/^sk-or-/.test(key)) return ["openrouter"];
  if (/^AIza[\w-]{20,}$/.test(key)) return ["gemini"];
  if (/^sk-(proj|svcacct|admin)-/.test(key)) return ["openai"];
  if (/^sk-[a-f0-9]{32}$/.test(key)) return ["deepseek", "openai"];
  if (/^sk-/.test(key)) return ["openai", "deepseek", "openrouter"];
  return ["openai", "anthropic", "gemini", "deepseek", "openrouter"];
}

/** Preferred chat models per provider, most capable-and-sensible first. */
const PREFERRED: Record<Kind, RegExp[]> = {
  openai: [/^gpt-5(\.\d+)?$/, /^gpt-5(\.\d+)?-mini$/, /^gpt-4\.1$/, /^gpt-4o$/, /^gpt-4o-mini$/, /^gpt-/],
  anthropic: [/sonnet/, /opus/, /haiku/, /claude/],
  gemini: [/gemini-[\d.]+-pro$/, /gemini-[\d.]+-flash$/, /gemini-[\d.]+-pro/, /gemini-[\d.]+-flash/, /gemini/],
  openrouter: [/^anthropic\/claude.*sonnet/, /^openai\/gpt-5/, /^google\/gemini.*pro/, /^deepseek\//],
  deepseek: [/deepseek-v\d.*pro/, /deepseek-chat/, /deepseek-flash/, /deepseek/],
  custom: [],
};

function pickDefaultModel(kind: Kind, models: ModelInfo[]): string | null {
  if (!models.length) return null;
  const usable = models.filter((m) => !/(embed|whisper|tts|audio|image|dall-e|moderation|realtime|transcribe|search|preview-\d{2}-\d{2}$)/i.test(m.id));
  const pool = usable.length ? usable : models;
  for (const re of PREFERRED[kind]) {
    const hit = pool.filter((m) => re.test(m.id)).sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))[0];
    if (hit) return hit.id;
  }
  return pool[0].id;
}

/**
 * Paste a key, get a working AI. Detects the provider, verifies the key,
 * picks a sensible default model and turns on semantic search when possible.
 */
export async function connectKey(input: { apiKey: string }): Promise<ActionResult<PublicCredential>> {
  return run(async () => {
    if (!encryptionAvailable()) throw new Error(NO_SECRET);
    const { repo, user, settings } = await getContext();
    const apiKey = z
      .string()
      .trim()
      .min(8, "That key looks too short.")
      .max(500)
      .refine((k) => !/\s/.test(k), "API keys don't contain spaces — check you copied the whole key.")
      .parse(input.apiKey);

    const existing = await repo.list("credentials", { order: { column: "created_at" } });
    if (existing.some((c) => c.key_hint === maskKey(apiKey))) {
      for (const c of existing.filter((c) => c.key_hint === maskKey(apiKey))) {
        try {
          const { decryptSecret } = await import("@/lib/crypto");
          if (decryptSecret(c.key_ciphertext, repo.userId) === apiKey) return publicCredential(c);
        } catch {
          /* undecryptable old row — fall through and save fresh */
        }
      }
    }

    let found: { kind: Kind; models: ModelInfo[] } | null = null;
    let lastError = "";
    for (const kind of detectProviders(apiKey)) {
      const r = await probe(kind, apiKey, null);
      if (r.ok) {
        found = { kind, models: r.models };
        break;
      }
      lastError = r.error;
    }
    if (!found) {
      const guess = detectProviders(apiKey)[0];
      throw new Error(`That key didn't work with ${PROVIDERS[guess].label}${detectProviders(apiKey).length > 1 ? " or the other providers we tried" : ""}: ${lastError || "unknown error"}`);
    }

    const row = await repo.insert("credentials", {
      provider: found.kind,
      label: PROVIDERS[found.kind].label,
      base_url: null,
      key_ciphertext: encryptSecret(apiKey, user.id),
      key_hint: maskKey(apiKey),
      status: "connected",
      status_detail: `${found.models.length} models available`,
      models_cache: found.models,
      default_model: pickDefaultModel(found.kind, found.models),
      last_tested_at: new Date().toISOString(),
    });

    // Semantic retrieval comes for free with an OpenAI / Gemini key.
    if (!settings.embeddings_credential_id && (found.kind === "openai" || found.kind === "gemini")) {
      await repo.update("settings", settings.id, { embeddings_credential_id: row.id });
    }
    revalidatePath("/app", "layout");
    return publicCredential(row);
  });
}

/** Lightweight status for the shell's AI indicator. */
export async function aiStatus(): Promise<ActionResult<{ connected: boolean; label: string | null; model: string | null; canStore: boolean }>> {
  return run(async () => {
    const { repo } = await getContext();
    const creds = await repo.list("credentials", { order: { column: "created_at" } });
    const c = creds.find((x) => x.status === "connected") ?? null;
    return { connected: !!c, label: c?.label ?? null, model: c?.default_model ?? c?.models_cache[0]?.id ?? null, canStore: encryptionAvailable() };
  });
}
