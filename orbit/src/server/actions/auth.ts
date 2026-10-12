"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSession,
  localResetWithRecovery,
  localSignIn,
  localSignUp,
  revokeSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth/local-auth";
import { getLocalSessionId, getUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/utils";

export interface AuthState {
  error?: string;
  message?: string;
  recovery?: string;
}

const email = z.string().trim().email("Enter a valid email address.").max(254);
const password = z.string().min(8, "Use at least 8 characters.").max(200);

async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/app") && !n.startsWith("//") ? n : "/app";
}

export async function signUpAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ email, password, name: z.string().trim().max(80).optional() })
    .safeParse({ email: form.get("email"), password: form.get("password"), name: form.get("name") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { email: e, password: p, name } = parsed.data;

  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.signUp({
      email: e,
      password: p,
      options: { data: { name: name ?? null }, emailRedirectTo: `${env.siteUrl}/auth/callback?next=/app` },
    });
    if (error) return { error: error.message };
    if (!data.session) return { message: "Check your inbox to confirm your email, then sign in." };
    redirect("/app");
  }

  try {
    const { userId, recovery } = await localSignUp(e, p, name ?? null);
    const ua = (await headers()).get("user-agent");
    await setSessionCookie(await createSession(userId, ua));
    return { recovery };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function signInAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.") }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const next = safeNext(form.get("next"));

  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    if (error) return { error: error.message };
    redirect(next);
  }

  try {
    const userId = await localSignIn(parsed.data.email, parsed.data.password);
    const ua = (await headers()).get("user-agent");
    await setSessionCookie(await createSession(userId, ua));
  } catch (err) {
    return { error: errorMessage(err) };
  }
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  if (env.backend === "supabase") {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  } else {
    const user = await getUser();
    const sid = await getLocalSessionId();
    if (user && sid) await revokeSession(user.id, sid);
    (await cookies()).delete(SESSION_COOKIE);
  }
  redirect("/");
}

export async function resetAction(_: AuthState, form: FormData): Promise<AuthState> {
  if (env.backend === "supabase") {
    const parsed = email.safeParse(form.get("email"));
    if (!parsed.success) return { error: "Enter a valid email address." };
    const sb = await supabaseServer();
    const { error } = await sb.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${env.siteUrl}/auth/callback?next=/reset/update`,
    });
    if (error) return { error: error.message };
    return { message: "If that address has an account, a reset link is on its way." };
  }
  const parsed = z
    .object({ email, code: z.string().trim().min(10, "Enter your recovery code."), password })
    .safeParse({ email: form.get("email"), code: form.get("code"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    const recovery = await localResetWithRecovery(parsed.data.email, parsed.data.code, parsed.data.password);
    return { message: "Password updated. Store your new recovery code safely.", recovery };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

/** Supabase: set a new password after following the email link. */
export async function updatePasswordAction(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = password.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (env.backend !== "supabase") return { error: "Not available in local mode." };
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({ password: parsed.data });
  if (error) return { error: error.message };
  redirect("/app");
}
