import type { SourceKind, SourceStatus } from "@/lib/types";

export const KIND_LABEL: Record<SourceKind, string> = {
  pdf: "PDF",
  docx: "DOCX",
  text: "Text",
  markdown: "Markdown",
  image: "Image",
  url: "Web page",
  youtube: "YouTube",
  transcript: "Transcript",
  summary: "Summary",
};

export const STATUS_LABEL: Record<SourceStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  ready: "Indexed",
  failed: "Failed",
  needs_input: "Needs input",
};

export function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
