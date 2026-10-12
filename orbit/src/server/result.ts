import "server-only";
import { ZodError } from "zod";
import { errorMessage } from "@/lib/utils";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" };
  // Never leak secrets or stack traces to the client.
  const msg = errorMessage(error).replace(/(sk|key|token)[-_][A-Za-z0-9_\-]{8,}/gi, "[redacted]");
  return { ok: false, error: msg };
}

/** Wraps a server action body, converting thrown errors into a typed result. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    // redirect()/notFound() throw special errors that must propagate.
    if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: unknown }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_")) throw e;
    if (process.env.NODE_ENV !== "production") console.error("[orbit:action]", errorMessage(e));
    return fail(e);
  }
}
