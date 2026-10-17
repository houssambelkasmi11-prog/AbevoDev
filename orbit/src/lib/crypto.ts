import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

/**
 * AES-256-GCM envelope for provider API keys. Ciphertext format:
 *   v1.<iv b64>.<tag b64>.<data b64>
 * Additional authenticated data binds each ciphertext to its owner.
 *
 * Zero-config key management — users only ever paste an API key:
 *   1. ORBIT_ENCRYPTION_KEY (explicit, 32 bytes base64) when set;
 *   2. otherwise a key derived (HKDF-SHA256) from a server-only secret that the
 *      deployment already has (Supabase JWT secret / service role key, or the
 *      local session secret);
 *   3. local mode only: a random key generated once into .orbit-data/.
 * Encryption uses the first available key; decryption tries all of them, so
 * adding ORBIT_ENCRYPTION_KEY later never breaks keys saved before.
 */

const DERIVE_FROM = ["SUPABASE_JWT_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "ORBIT_SESSION_SECRET"] as const;

let cached: Buffer[] | null = null;

function derive(secret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "orbit-credentials", "orbit/provider-keys/v1", 32));
}

function localKeyFile(): Buffer | null {
  if (env.backend !== "local") return null;
  try {
    const dir = path.join(process.cwd(), ".orbit-data");
    const file = path.join(dir, "encryption.key");
    if (fs.existsSync(file)) {
      const k = Buffer.from(fs.readFileSync(file, "utf8").trim(), "base64");
      if (k.length === 32) return k;
    }
    fs.mkdirSync(dir, { recursive: true });
    const k = randomBytes(32);
    fs.writeFileSync(file, k.toString("base64"), { mode: 0o600 });
    return k;
  } catch {
    return null; // read-only filesystem etc.
  }
}

function keys(): Buffer[] {
  if (cached) return cached;
  const out: Buffer[] = [];
  const raw = env.encryptionKey;
  if (raw) {
    const k = Buffer.from(raw, "base64");
    if (k.length === 32) out.push(k);
    else console.warn("[orbit] ORBIT_ENCRYPTION_KEY is not 32 bytes base64 — ignoring it.");
  }
  for (const name of DERIVE_FROM) {
    const v = process.env[name]?.trim();
    if (v && v.length >= 16) out.push(derive(v));
  }
  const local = localKeyFile();
  if (local) out.push(local);
  cached = out;
  return out;
}

export function encryptionAvailable(): boolean {
  return keys().length > 0;
}

export function encryptSecret(plaintext: string, ownerId: string): string {
  const key = keys()[0];
  if (!key) throw new Error("This server has no secret to protect API keys with. Set ORBIT_ENCRYPTION_KEY (run `npm run setup`).");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(ownerId));
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(".");
}

export function decryptSecret(payload: string, ownerId: string): string {
  const candidates = keys();
  if (!candidates.length) throw new Error("Encryption is not configured.");
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) throw new Error("Unrecognised credential format.");
  for (const key of candidates) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
      decipher.setAAD(Buffer.from(ownerId));
      decipher.setAuthTag(Buffer.from(tagB64, "base64"));
      return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
    } catch {
      /* try the next key */
    }
  }
  throw new Error("This saved API key can't be unlocked any more (the server secret changed). Paste the key again.");
}

/** "sk-proj-abc…9F2x" → "sk-…9F2x" (never more than the last 4 chars). */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  const prefix = trimmed.match(/^[a-zA-Z]{2,4}-/)?.[0] ?? "";
  return `${prefix}…${trimmed.slice(-4)}`;
}
