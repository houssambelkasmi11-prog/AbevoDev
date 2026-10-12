import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * AES-256-GCM envelope for provider API keys. Ciphertext format:
 *   v1.<iv b64>.<tag b64>.<data b64>
 * The key comes from ORBIT_ENCRYPTION_KEY and never reaches the browser.
 * Additional authenticated data binds each ciphertext to its owner.
 */

export function encryptionAvailable(): boolean {
  try {
    return getKey() !== null;
  } catch {
    return false;
  }
}

function getKey(): Buffer | null {
  const raw = env.encryptionKey;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ORBIT_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  return key;
}

export function encryptSecret(plaintext: string, ownerId: string): string {
  const key = getKey();
  if (!key) throw new Error("Encryption is not configured. Set ORBIT_ENCRYPTION_KEY (run `npm run setup`).");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(ownerId));
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(".");
}

export function decryptSecret(payload: string, ownerId: string): string {
  const key = getKey();
  if (!key) throw new Error("Encryption is not configured.");
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) throw new Error("Unrecognised credential format.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAAD(Buffer.from(ownerId));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

/** "sk-proj-abc…9F2x" → "sk-…9F2x" (never more than the last 4 chars). */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  const prefix = trimmed.match(/^[a-zA-Z]{2,4}-/)?.[0] ?? "";
  return `${prefix}…${trimmed.slice(-4)}`;
}
