import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { DATA_DIR } from "@/lib/db/local";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/types";
import { getUser } from "./session";

/** Owner accounts that are always admins on the local backend. On Supabase the
 *  public.admins table is the source of truth (see migration 0003_admin). */
const OWNER_EMAILS = ["houssambelkasmi11@gmail.com"];

function localAdminEmails(): string[] {
  const extra = (process.env.ORBIT_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return [...OWNER_EMAILS, ...extra];
}

export async function isAdmin(user: SessionUser | null): Promise<boolean> {
  if (!user) return false;
  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    const { data, error } = await sb.rpc("is_admin");
    return !error && data === true;
  }
  return localAdminEmails().includes(user.email.toLowerCase());
}

/** Use at the top of admin pages and actions. Non-admins get a 404, so the page's existence isn't revealed. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getUser();
  if (!user || !(await isAdmin(user))) notFound();
  return user;
}

export interface AdminUserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  admin: boolean;
  notes: number;
  sources: number;
  assignments: number;
  messages: number;
}
export interface AdminOverview {
  totals: { users: number; active7: number; notes: number; sources: number; assignments: number; conversations: number; messages: number; flashcards: number; focus_minutes: number };
  signups: { day: string; n: number }[];
  users: AdminUserRow[];
}

async function readTable(name: string): Promise<Record<string, unknown>[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, "tables", `${name}.json`), "utf8"));
  } catch {
    return [];
  }
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await requireAdmin();
  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    const { data, error } = await sb.rpc("admin_overview");
    if (error) throw new Error(error.message);
    return data as AdminOverview;
  }
  // local backend: read the JSON stores directly
  let users: { id: string; email: string; created_at?: string }[] = [];
  try {
    users = JSON.parse(await fs.readFile(path.join(DATA_DIR, "auth.json"), "utf8")).users ?? [];
  } catch {
    users = [];
  }
  const [notes, sources, assignments, conversations, messages, flashcards, sessions] = await Promise.all(
    ["notes", "sources", "assignments", "conversations", "messages", "flashcards", "study_sessions"].map(readTable),
  );
  const count = (rows: Record<string, unknown>[], uid: string) => rows.filter((r) => r.user_id === uid).length;
  const admins = localAdminEmails();
  const since = Date.now() - 30 * 864e5;
  const days = new Map<string, number>();
  for (const u of users) {
    if (u.created_at && Date.parse(u.created_at) > since) {
      const d = u.created_at.slice(0, 10);
      days.set(d, (days.get(d) ?? 0) + 1);
    }
  }
  return {
    totals: {
      users: users.length,
      active7: users.length,
      notes: notes.length,
      sources: sources.length,
      assignments: assignments.length,
      conversations: conversations.length,
      messages: messages.length,
      flashcards: flashcards.length,
      focus_minutes: Math.round(sessions.filter((s) => s.kind === "focus").reduce((a, s) => a + Number(s.actual_seconds ?? 0), 0) / 60),
    },
    signups: [...days].sort().map(([day, n]) => ({ day, n })),
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at ?? "",
      last_sign_in_at: null,
      admin: admins.includes(u.email.toLowerCase()),
      notes: count(notes, u.id),
      sources: count(sources, u.id),
      assignments: count(assignments, u.id),
      messages: count(messages, u.id),
    })),
  };
}
