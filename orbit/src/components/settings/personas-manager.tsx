"use client";

import { Plus, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { OrbitGlyph } from "@/components/brand/logo";
import { ModelPicker, type CredentialLite } from "@/components/chat/model-picker";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Badge, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { Depth, PersonaRow, ResponseLength } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createPersona, deletePersona, resetPersona, updatePersona } from "@/server/actions/personas";
import { updateSettings } from "@/server/actions/workspace";

type PersonaDraft = Pick<
  PersonaRow,
  "name" | "role" | "tagline" | "teaching_style" | "instructions" | "credential_id" | "model" | "temperature" | "depth" | "length" | "language" | "source_collections" | "glyph"
>;

const EMPTY: PersonaDraft = {
  name: "",
  role: "",
  tagline: "",
  teaching_style: "",
  instructions: "",
  credential_id: null,
  model: null,
  temperature: null,
  depth: "standard",
  length: "medium",
  language: "English",
  source_collections: [],
  glyph: 0,
};

export function PersonasManager({
  personas,
  credentials,
  defaultPersonaId,
  collections,
}: {
  personas: PersonaRow[];
  credentials: CredentialLite[];
  defaultPersonaId: string | null;
  collections: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<{ id: string | null; draft: PersonaDraft; builtin: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "delete" | "reset"; p: PersonaRow } | null>(null);
  const [pending, start] = useTransition();
  const [defaultId, setDefaultId] = useState(defaultPersonaId);

  const open = (p: PersonaRow | null) =>
    setEditing(
      p
        ? {
            id: p.id,
            builtin: p.builtin,
            draft: {
              name: p.name,
              role: p.role,
              tagline: p.tagline,
              teaching_style: p.teaching_style,
              instructions: p.instructions,
              credential_id: p.credential_id,
              model: p.model,
              temperature: p.temperature,
              depth: p.depth,
              length: p.length,
              language: p.language,
              source_collections: p.source_collections,
              glyph: p.glyph,
            },
          }
        : { id: null, builtin: false, draft: { ...EMPTY, glyph: personas.length % 6 } },
    );

  const set = <K extends keyof PersonaDraft>(k: K, v: PersonaDraft[K]) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e));

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label text-ink-3">The ORBIT intelligence network</p>
          <h2 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-[-0.03em]">Personalities</h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] text-ink-2">Each personality is a real behaviour configuration — instructions, depth, length, language and model — not just a card.</p>
        </div>
        <Button onClick={() => open(null)}>
          <Plus className="h-4 w-4" /> Design your own
        </Button>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {personas.map((p) => {
          const cred = credentials.find((c) => c.id === p.credential_id);
          return (
            <li key={p.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <OrbitGlyph variant={p.glyph} className="h-11 w-11" />
                <div className="flex gap-1.5">
                  {p.builtin ? <Badge>Built-in</Badge> : <Badge tone="student">Custom</Badge>}
                  {defaultId === p.id ? <Badge tone="solid">Default</Badge> : null}
                </div>
              </div>
              <h3 className="mt-5 font-display text-[18px] font-bold tracking-[0.12em]">{p.name}</h3>
              <p className="text-[13px] text-ink-2">{p.role}</p>
              {p.tagline ? <p className="mt-2 font-serif text-[15px] italic leading-snug">{p.tagline}</p> : null}
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line pt-3 text-[11.5px]">
                <dt className="label text-ink-3">Depth</dt>
                <dd>{p.depth}</dd>
                <dt className="label text-ink-3">Length</dt>
                <dd>{p.length}</dd>
                <dt className="label text-ink-3">Model</dt>
                <dd className="truncate">{cred ? `${cred.label} · ${p.model ?? cred.default_model ?? "default"}` : "Provider default"}</dd>
              </dl>
              <div className="mt-4 flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => open(p)}>
                  Configure
                </Button>
                <Button size="sm" variant="ghost" onClick={() => router.push(`/app/ai?persona=${p.id}`)}>
                  Chat
                </Button>
                {defaultId !== p.id ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      start(async () => {
                        const r = await updateSettings({ default_persona_id: p.id });
                        if (r.ok) setDefaultId(p.id);
                        else toast.error(r.error);
                      })
                    }
                  >
                    <Star className="h-3.5 w-3.5" /> Default
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing?.id ? `Configure ${editing.draft.name}` : "New personality"} description="Advanced persona editor" className="sm:w-[min(720px,calc(100vw-32px))]">
        {editing ? (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = editing.id ? await updatePersona(editing.id, editing.draft) : await createPersona(editing.draft);
                if (r.ok) {
                  toast.show(editing.id ? "Personality updated" : "Personality created");
                  setEditing(null);
                  router.refresh();
                } else toast.error(r.error);
              });
            }}
          >
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Glyph">
              {[0, 1, 2, 3, 4, 5].map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={editing.draft.glyph === g}
                  onClick={() => set("glyph", g)}
                  className={cn("rounded-xl border p-2", editing.draft.glyph === g ? "border-ink bg-ink text-canvas" : "border-line hover:border-ink-2")}
                >
                  <OrbitGlyph variant={g} className="h-8 w-8" />
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input value={editing.draft.name} onChange={(e) => set("name", e.target.value)} required maxLength={40} />
              </Field>
              <Field label="Role">
                <Input value={editing.draft.role} onChange={(e) => set("role", e.target.value)} required placeholder="The Debate Coach" maxLength={60} />
              </Field>
            </div>
            <Field label="Tagline">
              <Input value={editing.draft.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120} />
            </Field>
            <Field label="Teaching style">
              <Input value={editing.draft.teaching_style} onChange={(e) => set("teaching_style", e.target.value)} placeholder="Uses analogies from sport; always ends with a challenge question." maxLength={300} />
            </Field>
            <Field label="Custom instructions" hint="This becomes part of the system instruction for every conversation with this personality.">
              <Textarea value={editing.draft.instructions} onChange={(e) => set("instructions", e.target.value)} className="min-h-[160px] font-mono text-[12.5px]" maxLength={6000} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Explanation depth">
                <Select value={editing.draft.depth} onChange={(e) => set("depth", e.target.value as Depth)}>
                  <option value="brief">Brief</option>
                  <option value="standard">Standard</option>
                  <option value="deep">Deep</option>
                </Select>
              </Field>
              <Field label="Response length">
                <Select value={editing.draft.length} onChange={(e) => set("length", e.target.value as ResponseLength)}>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </Select>
              </Field>
              <Field label="Language">
                <Input value={editing.draft.language} onChange={(e) => set("language", e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Field label="Default model" hint="Leave on default to use your provider's default model.">
                <ModelPicker
                  credentials={credentials}
                  credentialId={editing.draft.credential_id}
                  model={editing.draft.model}
                  onChange={(c, m) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, credential_id: c, model: m } } : e))}
                />
              </Field>
              <Field label={`Temperature${editing.draft.temperature === null ? " · default" : ` · ${editing.draft.temperature.toFixed(1)}`}`} hint="Ignored by models that don't support it.">
                <div className="flex h-10 items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.1}
                    value={editing.draft.temperature ?? 0.7}
                    onChange={(e) => set("temperature", Number(e.target.value))}
                    className="flex-1 accent-[var(--ink)]"
                    aria-label="Temperature"
                  />
                  <button type="button" onClick={() => set("temperature", null)} className="label text-ink-3 hover:text-ink">
                    Reset
                  </button>
                </div>
              </Field>
            </div>
            <Field label="Preferred source collections" hint={collections.length ? `Available: ${collections.join(", ")}` : "Create collections in Lessons & Sources."}>
              <Input
                value={editing.draft.source_collections.join(", ")}
                onChange={(e) => set("source_collections", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                placeholder="Midterm, Lab reports"
              />
            </Field>
            <div className="mt-2 flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                {editing.id && editing.builtin ? (
                  <Button variant="ghost" onClick={() => setConfirm({ kind: "reset", p: personas.find((x) => x.id === editing.id) as PersonaRow })}>
                    Reset to original
                  </Button>
                ) : null}
                {editing.id && !editing.builtin ? (
                  <Button variant="ghost" className="text-danger" onClick={() => setConfirm({ kind: "delete", p: personas.find((x) => x.id === editing.id) as PersonaRow })}>
                    Delete
                  </Button>
                ) : null}
              </div>
              <Button type="submit" loading={pending}>
                {editing.id ? "Save personality" : "Create personality"}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "delete" ? `Delete ${confirm.p.name}?` : `Reset ${confirm?.p.name}?`}
        body={confirm?.kind === "delete" ? "Conversations keep their messages but lose this personality." : "Instructions, depth and length return to the original configuration. Your model choice is kept."}
        destructive={confirm?.kind === "delete"}
        confirmLabel={confirm?.kind === "delete" ? "Delete" : "Reset"}
        onConfirm={() =>
          start(async () => {
            if (!confirm) return;
            const r = confirm.kind === "delete" ? await deletePersona(confirm.p.id) : await resetPersona(confirm.p.id);
            if (!r.ok) toast.error(r.error);
            setConfirm(null);
            setEditing(null);
            router.refresh();
          })
        }
      />
    </div>
  );
}
