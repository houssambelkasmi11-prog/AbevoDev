import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser().catch(() => null);
  return NextResponse.json({ signedIn: !!user }, { headers: { "Cache-Control": "no-store" } });
}
