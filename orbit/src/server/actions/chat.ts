"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/bootstrap";
import { run, type ActionResult } from "../result";

export async function deleteConversation(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    await repo.removeWhere("messages", { conversation_id: id });
    await repo.removeWhere("graph_edges", { from_id: id });
    await repo.removeWhere("graph_edges", { to_id: id });
    await repo.remove("conversations", id);
    revalidatePath("/app/ai");
    return null;
  });
}

export async function renameConversation(id: string, title: string): Promise<ActionResult> {
  return run(async () => {
    const { repo } = await getContext();
    await repo.update("conversations", id, { title: z.string().trim().min(1).max(120).parse(title) });
    revalidatePath("/app/ai");
    return null;
  });
}
