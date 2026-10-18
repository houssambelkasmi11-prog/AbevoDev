import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminOverview, requireAdmin } from "@/lib/auth/admin";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireAdmin();
  const data = await getAdminOverview();
  return <AdminDashboard data={data} meEmail={me.email} backend={env.backend} />;
}
