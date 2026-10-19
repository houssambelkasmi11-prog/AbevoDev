"use client";

export type ClientStreamEvent =
  | { type: "meta"; [k: string]: unknown }
  | { type: "delta"; text: string }
  | { type: "final"; text: string }
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

  // Token deltas arrive dozens of times per second. Re-rendering (and
  // re-parsing markdown/KaTeX/highlighting) on every one makes the UI stutter,
  // so consecutive deltas are coalesced and delivered at most ~25×/s.
  let pending = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const text = pending;
    pending = "";
    onEvent({ type: "delta", text });
  };
  const emit = (e: ClientStreamEvent) => {
    if (e.type === "delta") {
      pending += e.text;
      if (!timer) timer = setTimeout(flush, 40);
      return;
    }
    flush();
    onEvent(e);
  };

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
        let parsed: ClientStreamEvent | null = null;
        try {
          parsed = JSON.parse(line) as ClientStreamEvent;
        } catch {
          /* skip malformed line */
        }
        if (parsed) emit(parsed);
      }
    }
  } catch (e) {
    if ((e as Error).name !== "AbortError") {
      flush();
      throw e;
    }
  }
  flush();
}
