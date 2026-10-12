import type { Metadata } from "next";
import { GeneralSettings } from "@/components/settings/general-settings";
import { getContext } from "@/lib/bootstrap";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { repo, settings, user, workspace, workspaces } = await getContext();
  const [subjects, personas] = await Promise.all([
    repo.list("subjects", { where: { workspace_id: workspace.id }, order: { column: "name" } }),
    repo.list("personas", { order: { column: "created_at" } }),
  ]);
  return (
    <GeneralSettings
      settings={settings}
      email={user.email}
      workspace={workspace}
      workspaceCount={workspaces.length}
      subjects={subjects}
      backend={env.backend}
      personas={personas.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
