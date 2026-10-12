import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "@/lib/env";
import type { Repo } from "@/lib/db/repo";
import { LocalRepo } from "@/lib/db/local";
import { SupabaseRepo } from "@/lib/db/supabase";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/types";
import { resolveSession, SESSION_COOKIE } from "./local-auth";

export const getUser = cache(async (): Promise<SessionUser | null> => {
  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    const meta = data.user.user_metadata as { name?: unknown } | undefined;
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      name: typeof meta?.name === "string" ? meta.name : null,
    };
  }
  const store = await cookies();
  const resolved = await resolveSession(store.get(SESSION_COOKIE)?.value);
  return resolved ? resolved.user : null;
});

export const getLocalSessionId = cache(async (): Promise<string | null> => {
  if (env.backend !== "local") return null;
  const store = await cookies();
  const resolved = await resolveSession(store.get(SESSION_COOKIE)?.value);
  return resolved?.session.id ?? null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}

export const getRepo = cache(async (): Promise<Repo> => {
  const user = await requireUser();
  if (env.backend === "supabase") return new SupabaseRepo(user.id, await supabaseServer());
  return new LocalRepo(user.id);
});

/** For route handlers: returns null instead of redirecting. */
export async function getRepoOrNull(): Promise<{ user: SessionUser; repo: Repo } | null> {
  const user = await getUser();
  if (!user) return null;
  const repo = env.backend === "supabase" ? new SupabaseRepo(user.id, await supabaseServer()) : new LocalRepo(user.id);
  return { user, repo };
}
