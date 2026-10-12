import type { Metadata } from "next";
import { PersonasManager } from "@/components/settings/personas-manager";
import { getContext } from "@/lib/bootstrap";
import { credentialLite } from "@/server/loaders/chat";

export const metadata: Metadata = { title: "Personalities" };

export default async function PersonalitiesPage() {
  const { repo, settings, workspace } = await getContext();
  const [personas, creds, sources] = await Promise.all([
    repo.list("personas", { order: { column: "created_at" } }),
    repo.list("credentials", { order: { column: "created_at" } }),
    repo.list("sources", { where: { workspace_id: workspace.id } }),
  ]);
  const collections = [...new Set(sources.map((s) => s.collection).filter((c): c is string => !!c))];
  return <PersonasManager personas={personas} credentials={creds.map(credentialLite)} defaultPersonaId={settings.default_persona_id} collections={collections} />;
}
