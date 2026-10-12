"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteLocalUser, listSessions, localChangePassword, revokeOtherSessions, revokeSession, SESSION_COOKIE, updateLocalProfile } from "@/lib/auth/local-auth";
import { getLocalSessionId } from "@/lib/auth/session";
import { getContext } from "@/lib/bootstrap";
import { purgeLocalUser } from "@/lib/db/local";
import { env } from "@/lib/env";
import { removeAllObjects } from "@/lib/storage";
import { supabaseServer } from "@/lib/supabase/server";
import type { SettingsRow, SubjectRow, TableName, WorkspaceRow } from "@/lib/types";
import { run, type ActionResult } from "../result";

const name = z.string().trim().min(1, "Name is required").max(80);

export async function createWorkspace(input: { name: string; description?: string }): Promise<ActionResult<WorkspaceRow>> {
  return run(async () => {
    const { repo, settings } = await getContext();
    const ws = await repo.insert("workspaces", { name: name.parse(input.name), description: input.description?.slice(0, 280) ?? null });
    await repo.update("settings", settings.id, { active_workspace_id: ws.id });
    revalidatePath("/app", "layout");
    return ws;
  });
}

export async function switchWorkspace(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo, settings } = await getContext();
    const ws = await repo.get("workspaces", id);
    if (!ws) throw new Error("Workspace not found");
    await repo.update("settings", settings.id, { active_workspace_id: ws.id });
    revalidatePath("/app", "layout");
    return null;
  });
}

export async function renameWorkspace(id: string, value: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    await repo.update("workspaces", id, { name: name.parse(value) });
    revalidatePath("/app", "layout");
    return null;
  });
}

export async function deleteWorkspace(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo, workspaces, settings } = await getContext();
    if (workspaces.length <= 1) throw new Error("You need at least one workspace.");
    const tables: TableName[] = ["subjects", "notes", "sources", "conversations", "assignments", "flashcards", "quizzes", "study_sessions", "events", "graph_nodes", "graph_edges"];
    // Child rows that hang off workspace rows.
    const [sources, convs, assignments, quizzes] = await Promise.all([
      repo.list("sources", { where: { workspace_id: id } }),
      repo.list("conversations", { where: { workspace_id: id } }),
      repo.list("assignments", { where: { workspace_id: id } }),
      repo.list("quizzes", { where: { workspace_id: id } }),
    ]);
    for (const s of sources) await repo.removeWhere("source_chunks", { source_id: s.id });
    for (const c of convs) await repo.removeWhere("messages", { conversation_id: c.id });
    for (const a of assignments) await repo.removeWhere("assignment_steps", { assignment_id: a.id });
    for (const q of quizzes) await repo.removeWhere("quiz_attempts", { quiz_id: q.id });
    for (const t of tables) await repo.removeWhere(t as "notes", { workspace_id: id });
    await repo.remove("workspaces", id);
    if (settings.active_workspace_id === id) {
      const next = workspaces.find((w) => w.id !== id);
      await repo.update("settings", settings.id, { active_workspace_id: next?.id ?? null });
    }
    revalidatePath("/app", "layout");
    return null;
  });
}

const settingsSchema = z
  .object({
    display_name: z.string().trim().max(80).nullable(),
    theme: z.enum(["light", "dark", "system"]),
    language: z.string().trim().min(2).max(40),
    daily_goal_minutes: z.number().int().min(10).max(960),
    focus_minutes: z.number().int().min(5).max(180),
    break_minutes: z.number().int().min(1).max(60),
    long_break_minutes: z.number().int().min(5).max(90),
    notifications: z.boolean(),
    default_persona_id: z.string().nullable(),
    embeddings_credential_id: z.string().nullable(),
  })
  .partial();

export async function updateSettings(input: Partial<SettingsRow>): Promise<ActionResult<SettingsRow>> {
  return run(async () => {
    const { repo, settings, user } = await getContext();
    const patch = settingsSchema.parse(input);
    if (patch.embeddings_credential_id) {
      const cred = await repo.get("credentials", patch.embeddings_credential_id);
      if (!cred) throw new Error("Credential not found");
      if (cred.provider !== "openai" && cred.provider !== "gemini") throw new Error("Embeddings are supported with OpenAI or Google Gemini keys.");
    }
    const next = await repo.update("settings", settings.id, patch);
    if (patch.display_name !== undefined && env.backend === "local") await updateLocalProfile(user.id, patch.display_name);
    revalidatePath("/app", "layout");
    return next;
  });
}

/* ───────────── Subjects ───────────── */

const subjectSchema = z.object({
  name,
  code: z.string().trim().max(24).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  glyph: z.number().int().min(0).max(5).optional(),
});

export async function createSubject(input: z.infer<typeof subjectSchema>): Promise<ActionResult<SubjectRow>> {
  return run(async () => {
    const { repo, workspace } = await getContext();
    const data = subjectSchema.parse(input);
    const count = await repo.count("subjects", { workspace_id: workspace.id });
    const row = await repo.insert("subjects", {
      workspace_id: workspace.id,
      name: data.name,
      code: data.code ?? null,
      description: data.description ?? null,
      glyph: data.glyph ?? count % 6,
    });
    revalidatePath("/app", "layout");
    return row;
  });
}

export async function updateSubject(id: string, input: Partial<z.infer<typeof subjectSchema>>): Promise<ActionResult<SubjectRow>> {
  return run(async () => {
    const { repo } = await getContext();
    const data = subjectSchema.partial().parse(input);
    const row = await repo.update("subjects", id, data);
    revalidatePath("/app", "layout");
    return row;
  });
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    // Detach rather than delete content that belongs to the subject.
    for (const t of ["notes", "sources", "assignments", "flashcards", "quizzes", "events", "study_sessions"] as const) {
      const rows = await repo.list(t, { where: { subject_id: id } });
      for (const r of rows) await repo.update(t, r.id, { subject_id: null });
    }
    await repo.removeWhere("graph_edges", { from_id: id });
    await repo.removeWhere("graph_edges", { to_id: id });
    await repo.remove("subjects", id);
    revalidatePath("/app", "layout");
    return null;
  });
}

/* ───────────── Account & sessions ───────────── */

export async function listMySessions(): Promise<ActionResult<{ id: string; created_at: string; last_seen_at: string; user_agent: string | null; current: boolean }[]>> {
  return run(async () => {
    const { user } = await getContext();
    if (env.backend !== "local") return [];
    const current = await getLocalSessionId();
    return (await listSessions(user.id)).map((s) => ({ ...s, current: s.id === current }));
  });
}

export async function revokeMySession(id: string): Promise<ActionResult> {
  return run(async () => {
    const { user } = await getContext();
    if (env.backend === "local") await revokeSession(user.id, id);
    return null;
  });
}

export async function signOutEverywhereElse(): Promise<ActionResult> {
  return run(async () => {
    const { user } = await getContext();
    if (env.backend === "supabase") {
      const sb = await supabaseServer();
      await sb.auth.signOut({ scope: "others" });
    } else {
      const current = await getLocalSessionId();
      if (current) await revokeOtherSessions(user.id, current);
    }
    return null;
  });
}

export async function changePassword(current: string, next: string): Promise<ActionResult> {
  return run(async () => {
    const { user } = await getContext();
    const pw = z.string().min(8, "Use at least 8 characters.").max(200).parse(next);
    if (env.backend === "supabase") {
      const sb = await supabaseServer();
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw new Error(error.message);
    } else await localChangePassword(user.id, current, pw);
    return null;
  });
}

const ALL_TABLES: TableName[] = [
  "messages",
  "conversations",
  "source_chunks",
  "sources",
  "notes",
  "assignment_steps",
  "assignments",
  "quiz_attempts",
  "quizzes",
  "flashcards",
  "study_sessions",
  "events",
  "graph_edges",
  "graph_nodes",
  "personas",
  "credentials",
  "subjects",
  "settings",
  "workspaces",
];

/** Permanently deletes every row and file owned by the user, then the account. */
export async function deleteAccount(confirm: string): Promise<ActionResult> {
  const res = await run(async () => {
    const { user, repo } = await getContext();
    if (confirm.trim().toLowerCase() !== user.email.toLowerCase()) throw new Error("Type your email address to confirm.");
    await removeAllObjects(user.id);
    if (env.backend === "local") {
      await purgeLocalUser(user.id, ALL_TABLES);
      await deleteLocalUser(user.id);
      (await cookies()).delete(SESSION_COOKIE);
    } else {
      for (const t of ALL_TABLES) {
        const rows = await repo.list(t);
        for (const r of rows) await repo.remove(t, r.id);
      }
      const sb = await supabaseServer();
      // Deleting the auth user itself requires the service role; the
      // `delete_own_account` SQL function (see migration) handles it safely.
      await sb.rpc("delete_own_account");
      await sb.auth.signOut();
    }
    return null;
  });
  if (res.ok) redirect("/");
  return res;
}
