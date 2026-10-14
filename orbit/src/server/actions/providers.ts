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
    if (!encryptionAvailable()) throw new Error("Secure key storage isn't configured on this server (ORBIT_ENCRYPTION_KEY). Provider connections are disabled.");
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
    if (!encryptionAvailable()) throw new Error("Secure key storage isn't configured.");
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
