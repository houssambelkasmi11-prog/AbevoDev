import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { getContext } from "@/lib/bootstrap";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: { default: "Workspace", template: "%s · ORBIT" } };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { settings, workspace, workspaces, user } = await getContext();
  return (
    <AppShell
      user={{ email: user.email, name: settings.display_name ?? user.name }}
      theme={settings.theme}
      workspace={workspace}
      workspaces={workspaces}
      backend={env.backend}
    >
      {children}
    </AppShell>
  );
}
