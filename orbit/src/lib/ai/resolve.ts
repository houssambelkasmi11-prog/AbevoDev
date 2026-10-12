import "server-only";
import { decryptSecret } from "@/lib/crypto";
import type { Repo } from "@/lib/db/repo";
import type { CredentialRow, PersonaRow, PublicCredential } from "@/lib/types";
import { NoProviderError, type ProviderConnection } from "./types";

export interface ResolvedModel {
  conn: ProviderConnection;
  model: string;
  credential: CredentialRow;
}

export function connectionFor(cred: CredentialRow, ownerId: string): ProviderConnection {
  return { kind: cred.provider, apiKey: decryptSecret(cred.key_ciphertext, ownerId), baseUrl: cred.base_url };
}

export function publicCredential(c: CredentialRow): PublicCredential {
  // Explicitly drop the ciphertext; never spread unknown fields to the client.
  return {
    id: c.id,
    user_id: c.user_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
    provider: c.provider,
    label: c.label,
    base_url: c.base_url,
    key_hint: c.key_hint,
    status: c.status,
    status_detail: c.status_detail,
    default_model: c.default_model,
    models_cache: c.models_cache,
    last_tested_at: c.last_tested_at,
  };
}

/**
 * Picks credential + model: explicit override → persona preference →
 * first connected credential's default. Throws NoProviderError when nothing
 * usable is configured (the UI turns that into a setup prompt).
 */
export async function resolveModel(
  repo: Repo,
  opts: { credentialId?: string | null; model?: string | null; persona?: PersonaRow | null },
): Promise<ResolvedModel> {
  const creds = await repo.list("credentials", { order: { column: "created_at" } });
  if (creds.length === 0) throw new NoProviderError();

  const pick = (id: string | null | undefined) => (id ? creds.find((c) => c.id === id) ?? null : null);
  const credential =
    pick(opts.credentialId) ??
    pick(opts.persona?.credential_id) ??
    creds.find((c) => c.status === "connected") ??
    creds[0];

  const sameCred = (id: string | null | undefined) => !!id && id === credential.id;
  let model: string | null = null;
  if (opts.model && (!opts.credentialId || sameCred(opts.credentialId))) model = opts.model;
  if (!model && opts.persona?.model && sameCred(opts.persona.credential_id)) model = opts.persona.model;
  if (!model) model = credential.default_model ?? credential.models_cache[0]?.id ?? null;

  if (!model) throw new NoProviderError(`Choose a default model for ${credential.label || credential.provider} in Settings → AI Providers.`);
  return { conn: connectionFor(credential, repo.userId), model, credential };
}
