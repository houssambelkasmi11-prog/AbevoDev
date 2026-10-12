import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { env } from "@/lib/env";

/** Blocks requests to loopback, link-local, and private networks (SSRF guard). */
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
}

export async function assertPublicUrl(raw: string, opts: { allowPrivate?: boolean } = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http(s) URLs are supported.");
  if (url.username || url.password) throw new Error("URLs with credentials are not allowed.");
  const allowPrivate = opts.allowPrivate ?? false;
  if (allowPrivate) return url;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) throw new Error("Private network addresses are not allowed.");
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("Private network addresses are not allowed.");
  return url;
}

export function customEndpointsMayBePrivate(): boolean {
  return env.allowPrivateEndpoints;
}

/** fetch with timeout and response-size cap; follows redirects manually to re-check each hop. */
export async function safeFetch(raw: string, init: RequestInit & { timeoutMs?: number; maxBytes?: number; allowPrivate?: boolean } = {}): Promise<{ res: Response; body: Uint8Array; finalUrl: string }> {
  const { timeoutMs = 15000, maxBytes = 8 * 1024 * 1024, allowPrivate, ...rest } = init;
  let current = raw;
  for (let hop = 0; hop < 5; hop++) {
    const url = await assertPublicUrl(current, { allowPrivate });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, redirect: "manual", signal: ctrl.signal });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location") as string, url).toString();
        continue;
      }
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > maxBytes) {
            await reader.cancel();
            throw new Error("The page is too large to import.");
          }
          chunks.push(value);
        }
      }
      const body = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        body.set(c, off);
        off += c.byteLength;
      }
      return { res, body, finalUrl: url.toString() };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects.");
}
