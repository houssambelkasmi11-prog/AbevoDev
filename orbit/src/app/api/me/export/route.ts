import { NextResponse } from "next/server";
import { getContext } from "@/lib/bootstrap";
import type { TableName } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Everything the user owns, in one portable JSON file (GDPR art. 15 & 20). */
const TABLES: TableName[] = [
  "settings",
  "workspaces",
  "subjects",
  "notes",
  "sources",
  "conversations",
  "messages",
  "personas",
  "credentials",
  "assignments",
  "assignment_steps",
  "flashcards",
  "quizzes",
  "quiz_attempts",
  "study_sessions",
  "events",
  "graph_nodes",
  "graph_edges",
];

export async function GET() {
  let ctx;
  try {
    ctx = await getContext();
  } catch {
    return NextResponse.json({ error: "Sign in to export your data." }, { status: 401 });
  }
  const { repo, user } = ctx;
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const rows = (await repo.list(t)) as unknown as Record<string, unknown>[];
    // Never export secrets: API keys stay encrypted and are left out entirely.
    data[t] = t === "credentials" ? rows.map(({ key_ciphertext: _omit, ...rest }) => rest) : rows;
  }
  const body = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email, name: user.name ?? null },
      note: "Source files you uploaded are not embedded; their extracted text is included under 'sources'. API keys are omitted for security.",
      data,
    },
    null,
    2,
  );
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="orbit-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
