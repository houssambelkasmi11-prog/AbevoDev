import { NextResponse } from "next/server";
import { getRepoOrNull } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Lightweight preview payload for the split-panel reader. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRepoOrNull();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const src = await ctx.repo.get("sources", id);
  if (!src) {
    const note = await ctx.repo.get("notes", id);
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id: note.id, title: note.title, kind: "note", fileUrl: null, text: note.plain.slice(0, 150_000), href: `/app/notes/${note.id}` });
  }
  return NextResponse.json({
    id: src.id,
    title: src.title,
    kind: src.kind,
    fileUrl: src.storage_path && (src.kind === "pdf" || src.kind === "image") ? `/api/files?path=${encodeURIComponent(src.storage_path)}` : null,
    text: src.text ? src.text.slice(0, 150_000) : null,
    href: `/app/lessons/${src.id}`,
  });
}
