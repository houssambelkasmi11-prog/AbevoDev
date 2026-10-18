"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { run, type ActionResult } from "../result";

export async function setAdmin(userId: string, make: boolean): Promise<ActionResult<null>> {
  return run(async () => {
    await requireAdmin();
    const id = z.string().uuid().parse(userId);
    if (env.backend !== "supabase") throw new Error("On the local backend, add admins with the ORBIT_ADMIN_EMAILS environment variable.");
    const sb = await supabaseServer();
    const { error } = await sb.rpc("admin_set_admin", { target: id, make });
    if (error) throw new Error(error.message);
    revalidatePath("/app/admin");
    return null;
  });
}
