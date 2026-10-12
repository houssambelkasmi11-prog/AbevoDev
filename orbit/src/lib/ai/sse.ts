import "server-only";

/** Parses a text/event-stream body into `data:` payloads. */
export async function* readSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<{ event: string | null; data: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event: string | null = null;
  let data: string[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.search(/\r?\n/)) !== -1) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + (buffer[idx] === "\r" ? 2 : 1));
        if (line === "") {
          if (data.length) yield { event, data: data.join("\n") };
          event = null;
          data = [];
          continue;
        }
        if (line.startsWith(":")) continue;
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        const val = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") event = val;
        else if (field === "data") data.push(val);
      }
    }
    if (data.length) yield { event, data: data.join("\n") };
  } finally {
    reader.releaseLock();
  }
}
