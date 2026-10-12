import "server-only";
import { errorMessage } from "@/lib/utils";
import { NoProviderError, ProviderError } from "./types";

export type StreamEvent =
  | { type: "meta"; [k: string]: unknown }
  | { type: "delta"; text: string }
  | { type: "done"; [k: string]: unknown }
  | { type: "error"; message: string; code?: string };

/**
 * Wraps an async producer into an NDJSON streaming Response. The producer
 * receives `emit` and the request's abort signal (client pressed Stop).
 */
export function ndjsonStream(req: Request, producer: (emit: (e: StreamEvent) => void, signal: AbortSignal) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const ctrl = new AbortController();
  req.signal.addEventListener("abort", () => ctrl.abort());
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (e: StreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          closed = true;
        }
      };
      try {
        await producer(emit, ctrl.signal);
      } catch (e) {
        if (!ctrl.signal.aborted) {
          const code = e instanceof NoProviderError ? "no_provider" : e instanceof ProviderError ? e.code : "error";
          emit({ type: "error", message: errorMessage(e), code });
        }
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      ctrl.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
