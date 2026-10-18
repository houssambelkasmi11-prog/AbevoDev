import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintDocument } from "@/components/homework/print-document";
import { getContext } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { repo } = await getContext();
  const a = await repo.get("assignments", id).catch(() => null);
  return { title: a?.title ?? "Assignment", robots: { index: false } };
}

export default async function PrintHomework({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ auto?: string }> }) {
  const { id } = await params;
  const { auto } = await searchParams;
  const { repo, settings, user } = await getContext();
  const a = await repo.get("assignments", id);
  if (!a || !a.ai_output?.trim()) notFound();
  const subject = a.subject_id ? await repo.get("subjects", a.subject_id).catch(() => null) : null;
  const name = settings.display_name ?? user.name ?? null;
  return (
    <PrintDocument
      id={a.id}
      title={a.title}
      subject={subject?.name ?? a.requirements?.subject ?? null}
      name={name}
      markdown={a.ai_output}
      autoPrint={auto === "1"}
    />
  );
}
