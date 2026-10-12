"use client";

export type ClientStreamEvent =
  | { type: "meta"; [k: string]: unknown }
  | { type: "delta"; text: string }
  | { type: "done"; [k: string]: unknown }
  | { type: "error"; message: string; code?: string };

/** POSTs JSON and reads an NDJSON event stream. */
export async function streamJson(url: string, body: unknown, onEvent: (e: ClientStreamEvent) => void, signal?: AbortSignal): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      /* ignore */
    }
    onEvent({ type: "error", message });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          onEvent(JSON.parse(line) as ClientStreamEvent);
        } catch {
          /* skip malformed line */
        }
      }
    }
  } catch (e) {
    if ((e as Error).name !== "AbortError") throw e;
  }
}
