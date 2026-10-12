import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/auth-forms";
import { getUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  if (await getUser()) redirect("/app");
  const sp = await searchParams;
  return <SignInForm next={sp.next} initialError={sp.error} />;
}
