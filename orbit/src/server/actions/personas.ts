"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BUILTIN_PERSONAS, personaSeedToRow } from "@/lib/ai/personas";
import { getContext } from "@/lib/bootstrap";
import type { PersonaRow } from "@/lib/types";
import { run, type ActionResult } from "../result";

const personaSchema = z.object({
  name: z.string().trim().min(1).max(40),
  role: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(120).default(""),
  teaching_style: z.string().trim().max(300).default(""),
  instructions: z.string().trim().max(6000).default(""),
  credential_id: z.string().nullable().default(null),
  model: z.string().max(200).nullable().default(null),
  temperature: z.number().min(0).max(2).nullable().default(null),
  depth: z.enum(["brief", "standard", "deep"]).default("standard"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  language: z.string().trim().min(2).max(40).default("English"),
  source_collections: z.array(z.string().max(80)).max(20).default([]),
  glyph: z.number().int().min(0).max(5).default(0),
});

async function checkCredential(credentialId: string | null | undefined, model: string | null | undefined) {
  if (!credentialId) return;
  const { repo } = await getContext();
  const cred = await repo.get("credentials", credentialId);
  if (!cred) throw new Error("Selected provider is no longer connected.");
  if (model && cred.models_cache.length && !cred.models_cache.some((m) => m.id === model)) throw new Error("That model isn't available for the selected provider.");
}

export async function createPersona(input: Partial<z.input<typeof personaSchema>>): Promise<ActionResult<PersonaRow>> {
  return run(async () => {
    const { repo } = await getContext();
    const data = personaSchema.parse(input);
    await checkCredential(data.credential_id, data.model);
    const slug = `custom-${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${Math.random().toString(36).slice(2, 6)}`;
    const row = await repo.insert("personas", { ...data, slug, builtin: false });
    revalidatePath("/app/settings/personalities");
    revalidatePath("/app/ai");
    return row;
  });
}

export async function updatePersona(id: string, input: Partial<z.input<typeof personaSchema>>): Promise<ActionResult<PersonaRow>> {
  return run(async () => {
    const { repo } = await getContext();
    const data = personaSchema.partial().parse(input);
    const existing = await repo.get("personas", id);
    if (!existing) throw new Error("Persona not found");
    await checkCredential(data.credential_id ?? existing.credential_id, data.model ?? existing.model);
    const row = await repo.update("personas", id, data);
    revalidatePath("/app/settings/personalities");
    return row;
  });
}

export async function resetPersona(id: string): Promise<ActionResult<PersonaRow>> {
  return run(async () => {
    const { repo } = await getContext();
    const p = await repo.get("personas", id);
    if (!p?.builtin) throw new Error("Only built-in personalities can be reset.");
    const seed = BUILTIN_PERSONAS.find((b) => b.slug === p.slug);
    if (!seed) throw new Error("Unknown built-in personality");
    const row = await repo.update("personas", id, personaSeedToRow(seed));
    revalidatePath("/app/settings/personalities");
    return row;
  });
}

export async function deletePersona(id: string): Promise<ActionResult> {
  return run(async () => {
    const { repo, settings } = await getContext();
    const p = await repo.get("personas", id);
    if (!p) return null;
    if (p.builtin) throw new Error("Built-in personalities can't be deleted — reset them instead.");
    for (const c of await repo.list("conversations", { where: { persona_id: id } })) await repo.update("conversations", c.id, { persona_id: null });
    if (settings.default_persona_id === id) await repo.update("settings", settings.id, { default_persona_id: null });
    await repo.remove("personas", id);
    revalidatePath("/app/settings/personalities");
    return null;
  });
}
