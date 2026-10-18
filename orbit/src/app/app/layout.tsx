import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { getContext } from "@/lib/bootstrap";
import { encryptionAvailable } from "@/lib/crypto";
import { env } from "@/lib/env";
import { isAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: { default: "Workspace", template: "%s · ORBIT" } };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { settings, workspace, workspaces, user, repo } = await getContext();
  const creds = await repo.list("credentials", { order: { column: "created_at" } }).catch(() => []);
  const live = creds.find((c) => c.status === "connected") ?? null;
  const admin = await isAdmin(user).catch(() => false);
  const ai = {
    connected: !!live,
    label: live?.label ?? null,
    model: live?.default_model ?? live?.models_cache[0]?.id ?? null,
    canStore: encryptionAvailable(),
  };
  return (
    <AppShell
      user={{ email: user.email, name: settings.display_name ?? user.name }}
      theme={settings.theme}
      workspace={workspace}
      workspaces={workspaces}
      backend={env.backend}
      ai={ai}
      admin={admin}
    >
      {children}
    </AppShell>
  );
}
