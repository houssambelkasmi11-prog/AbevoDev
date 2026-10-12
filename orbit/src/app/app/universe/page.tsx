import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UniverseGraph } from "@/components/universe/universe-graph";
import { EmptyState } from "@/components/ui/empty-state";
import { getContext } from "@/lib/bootstrap";
import { loadGraph } from "@/lib/graph";

export const metadata: Metadata = { title: "My Universe" };

export default async function UniversePage() {
  const { repo, workspace } = await getContext();
  const [graph, subjects, creds] = await Promise.all([
    loadGraph(repo, workspace.id),
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
    repo.count("credentials"),
  ]);
  if (graph.nodes.length === 0) {
    return (
      <div className="px-5 py-16">
        <EmptyState
          body="Your universe forms as you learn. Create subjects, write notes and add lessons — each becomes a star, and relationships become constellations."
          action={
            <Link href="/app/notes" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm text-accent-ink">
              Create your first note
            </Link>
          }
        />
      </div>
    );
  }
  return (
    <Suspense>
      <UniverseGraph nodes={graph.nodes} edges={graph.edges} subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} hasProvider={creds > 0} />
    </Suspense>
  );
}
