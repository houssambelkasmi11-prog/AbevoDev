import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonView } from "@/components/lessons/lesson-view";
import { getContext } from "@/lib/bootstrap";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { repo } = await getContext();
  const s = await repo.get("sources", id);
  return { title: s?.title ?? "Source" };
}

export default async function LessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { repo, workspace } = await getContext();
  const source = await repo.get("sources", id);
  if (!source || source.workspace_id !== workspace.id) notFound();
  const [chunks, subjects, credCount] = await Promise.all([
    repo.list("source_chunks", { where: { source_id: id }, order: { column: "ord" } }),
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
    repo.count("credentials"),
  ]);
  const { text, ...rest } = source;
  const page = sp.page ? Number(sp.page) : null;
  return (
    <LessonView
      source={{ ...rest, textPreview: text ? text.slice(0, 200_000) : null }}
      chunks={chunks.map((c) => ({ id: c.id, ord: c.ord, content: c.content, page: c.page, heading: c.heading }))}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
      fileUrl={source.storage_path ? `/api/files?path=${encodeURIComponent(source.storage_path)}` : null}
      initialPage={page && Number.isFinite(page) ? page : null}
      hasProvider={credCount > 0}
    />
  );
}
