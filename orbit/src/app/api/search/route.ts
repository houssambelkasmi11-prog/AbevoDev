import { NextResponse, type NextRequest } from "next/server";
import { getRepoOrNull } from "@/lib/auth/session";
import { truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function snippet(text: string | null, q: string): string {
  if (!text) return "";
  const i = text.toLowerCase().indexOf(q);
  if (i === -1) return truncate(text.replace(/\s+/g, " "), 90);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + truncate(text.slice(start).replace(/\s+/g, " "), 100);
}

export async function GET(req: NextRequest) {
  const ctx = await getRepoOrNull();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 120);
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const { repo } = ctx;
  const [settings] = await repo.list("settings", { limit: 1 });
  const ws = settings?.active_workspace_id ?? undefined;
  const where = ws ? { workspace_id: ws } : undefined;
  const [notes, sources, convs, assignments] = await Promise.all([
    repo.list("notes", { where }),
    repo.list("sources", { where }),
    repo.list("conversations", { where }),
    repo.list("assignments", { where }),
  ]);
  const hits = [
    ...notes
      .filter((n) => n.title.toLowerCase().includes(q) || n.plain.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)))
      .map((n) => ({ id: n.id, type: "note" as const, title: n.title || "Untitled", snippet: snippet(n.plain, q), href: `/app/notes/${n.id}` })),
    ...sources
      .filter((s) => s.title.toLowerCase().includes(q) || (s.text ?? "").toLowerCase().includes(q))
      .map((s) => ({ id: s.id, type: "source" as const, title: s.title, snippet: snippet(s.text, q), href: `/app/lessons/${s.id}` })),
    ...convs
      .filter((c) => c.title.toLowerCase().includes(q))
      .map((c) => ({ id: c.id, type: "conversation" as const, title: c.title, snippet: "", href: `/app/ai/${c.id}` })),
    ...assignments
      .filter((a) => a.title.toLowerCase().includes(q) || a.prompt_text.toLowerCase().includes(q))
      .map((a) => ({ id: a.id, type: "assignment" as const, title: a.title, snippet: snippet(a.prompt_text, q), href: `/app/homework/${a.id}` })),
  ].slice(0, 30);
  return NextResponse.json({ hits });
}
