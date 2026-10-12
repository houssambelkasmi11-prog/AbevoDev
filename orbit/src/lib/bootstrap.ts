import "server-only";
import { cache } from "react";
import { BUILTIN_PERSONAS, personaSeedToRow } from "@/lib/ai/personas";
import { getRepo, requireUser } from "@/lib/auth/session";
import type { Repo } from "@/lib/db/repo";
import type { SettingsRow, WorkspaceRow } from "@/lib/types";

/**
 * Ensures each user has settings, a workspace and the built-in personas.
 * Idempotent; cached per request.
 */
export const getContext = cache(async (): Promise<{
  repo: Repo;
  settings: SettingsRow;
  workspace: WorkspaceRow;
  workspaces: WorkspaceRow[];
  user: { id: string; email: string; name: string | null };
}> => {
  const user = await requireUser();
  const repo = await getRepo();
  return ensureBootstrap(repo, user);
});

export async function ensureBootstrap(repo: Repo, user: { id: string; email: string; name: string | null }) {
  let [settings] = await repo.list("settings", { limit: 1 });
  let workspaces = await repo.list("workspaces", { order: { column: "created_at" } });
  if (workspaces.length === 0) {
    workspaces = [await repo.insert("workspaces", { name: "My Universe", description: "Your personal learning universe." })];
  }
  if (!settings) {
    settings = await repo.insert("settings", {
      display_name: user.name,
      active_workspace_id: workspaces[0].id,
    });
  }
  let workspace = workspaces.find((w) => w.id === settings.active_workspace_id);
  if (!workspace) {
    workspace = workspaces[0];
    settings = await repo.update("settings", settings.id, { active_workspace_id: workspace.id });
  }
  const personas = await repo.list("personas");
  const missing = BUILTIN_PERSONAS.filter((p) => !personas.some((x) => x.builtin && x.slug === p.slug));
  if (missing.length) await repo.insertMany("personas", missing.map((m) => ({ ...personaSeedToRow(m), language: settings.language })));
  return { repo, settings, workspace, workspaces, user };
}
