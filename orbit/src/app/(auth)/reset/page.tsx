import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/auth-forms";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPage() {
  return <ResetForm mode={env.backend} />;
}
