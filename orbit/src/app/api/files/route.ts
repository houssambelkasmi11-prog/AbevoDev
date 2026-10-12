import { NextResponse, type NextRequest } from "next/server";
import { getRepoOrNull } from "@/lib/auth/session";
import { getObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Serves a private object to its owner only. */
export async function GET(req: NextRequest) {
  const ctx = await getRepoOrNull();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!path.startsWith(`${ctx.user.id}/`)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await getObject(ctx.user.id, path);
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    // Never let user-uploaded content execute as HTML/SVG in our origin.
    const type = TYPES[ext] ?? "application/octet-stream";
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": type === "application/octet-stream" || type.includes("wordprocessingml") ? "attachment" : "inline",
    };
    // Browsers' built-in PDF viewers don't work inside a sandboxed CSP.
    if (type !== "application/pdf") headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox";
    return new NextResponse(new Uint8Array(data), { headers });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
