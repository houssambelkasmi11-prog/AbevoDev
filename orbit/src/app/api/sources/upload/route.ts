import { NextResponse, after } from "next/server";
import { getRepoOrNull } from "@/lib/auth/session";
import { ensureBootstrap } from "@/lib/bootstrap";
import { processSource } from "@/lib/ingest/process";
import { putObject } from "@/lib/storage";
import type { SourceKind } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BYTES = 50 * 1024 * 1024;

function kindFor(file: File): { kind: SourceKind; ext: string } | null {
  const name = file.name.toLowerCase();
  const ext = name.split(".").pop() ?? "";
  if (file.type === "application/pdf" || ext === "pdf") return { kind: "pdf", ext: "pdf" };
  if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return { kind: "docx", ext: "docx" };
  if (ext === "md" || ext === "markdown" || file.type === "text/markdown") return { kind: "markdown", ext: "md" };
  if (ext === "txt" || ext === "vtt" || ext === "srt" || file.type === "text/plain") return { kind: ext === "vtt" || ext === "srt" ? "transcript" : "text", ext: "txt" };
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext) || /^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return { kind: "image", ext: ext === "jpeg" ? "jpg" : ext || "png" };
  return null;
}

/** Multipart upload → private storage → background ingestion. */
export async function POST(req: Request) {
  const ctx = await getRepoOrNull();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { repo, user } = ctx;
  const { workspace } = await ensureBootstrap(repo, user);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files received." }, { status: 400 });
  const subjectId = (form.get("subject_id") as string | null) || null;
  const collection = ((form.get("collection") as string | null) ?? "").trim() || null;

  const created: { id: string; title: string }[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files.slice(0, 20)) {
    const k = kindFor(file);
    if (!k) {
      rejected.push({ name: file.name, reason: "Unsupported file type (PDF, DOCX, TXT, MD, VTT/SRT or images)." });
      continue;
    }
    if (file.size > MAX_BYTES) {
      rejected.push({ name: file.name, reason: "Larger than 50 MB." });
      continue;
    }
    const id = crypto.randomUUID();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = k.kind === "image" ? file.type || `image/${k.ext}` : k.kind === "pdf" ? "application/pdf" : file.type || "text/plain";
    const path = await putObject(user.id, `sources/${id}.${k.ext}`, bytes, mime);
    const title = file.name.replace(/\.[^.]+$/, "").slice(0, 200) || "Untitled";
    await repo.insert("sources", {
      id,
      workspace_id: workspace.id,
      subject_id: subjectId,
      collection,
      title,
      kind: k.kind,
      storage_path: path,
      mime_type: mime,
      size_bytes: file.size,
      status: "queued",
      status_detail: "Uploaded — queued for processing",
      progress: 5,
    });
    created.push({ id, title });
  }

  after(async () => {
    for (const c of created) await processSource(repo, c.id);
  });

  return NextResponse.json({ created, rejected });
}
