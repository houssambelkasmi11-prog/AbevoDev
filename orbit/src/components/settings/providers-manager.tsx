"use client";

import { ExternalLink, KeyRound, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { OrbitPulse } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Badge, Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { PROVIDER_META, PROVIDER_ORDER } from "@/lib/ai/provider-meta";
import type { ProviderKind, PublicCredential } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { addCredential, deleteCredential, replaceKey, testCredential, updateCredential } from "@/server/actions/providers";
import { updateSettings } from "@/server/actions/workspace";

export function ProvidersManager({
  credentials: initial,
  encryptionReady,
  embeddingsCredentialId,
  personas,
}: {
  credentials: PublicCredential[];
  encryptionReady: boolean;
  embeddingsCredentialId: string | null;
  personas: { id: string; name: string; credential_id: string | null; model: string | null }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [creds, setCreds] = useState(initial);
  const [adding, setAdding] = useState<ProviderKind | null>(null);
  const [replacing, setReplacing] = useState<PublicCredential | null>(null);
  const [removing, setRemoving] = useState<PublicCredential | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const [embedId, setEmbedId] = useState(embeddingsCredentialId ?? "");

  const upsert = (c: PublicCredential) => setCreds((xs) => (xs.some((x) => x.id === c.id) ? xs.map((x) => (x.id === c.id ? c : x)) : [...xs, c]));

  return (
    <div>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label text-ink-3">Model freedom</p>
          <h2 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-tight tracking-[-0.03em]">
            Your intelligence. <span className="serif-accent font-normal text-ink-2">Your choice.</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-ink-2">
          <ShieldCheck className="h-4 w-4" />
          Keys are encrypted server-side (AES-256-GCM) and never sent to your browser.
        </div>
      </div>

      {!encryptionReady ? (
        <div role="alert" className="mt-6 rounded-2xl border border-danger/40 p-5">
          <p className="label text-danger">Secure storage not configured</p>
          <p className="mt-1 text-[13.5px] leading-relaxed">
            Set <code className="rounded bg-soft px-1 font-mono text-[12px]">ORBIT_ENCRYPTION_KEY</code> (run <code className="rounded bg-soft px-1 font-mono text-[12px]">npm run setup</code>) and restart. Provider connections stay disabled until keys can be stored safely.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {PROVIDER_ORDER.map((kind) => {
          const meta = PROVIDER_META[kind];
          const list = creds.filter((c) => c.provider === kind);
          return (
            <section key={kind} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[19px] font-bold tracking-tight">{meta.label}</h3>
                <span className={cn("h-2 w-2 rounded-full", list.some((c) => c.status === "connected") ? "bg-ok" : list.some((c) => c.status === "error") ? "bg-danger" : "bg-line-strong")} aria-hidden />
              </div>
              <p className="label mt-1 text-ink-3">{list.length ? `${list.length} key${list.length > 1 ? "s" : ""}` : "Not connected"}</p>

              <div className="mt-4 flex flex-1 flex-col gap-3">
                {list.map((c) => (
                  <div key={c.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-3.5 w-3.5 text-ink-2" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{c.label}</span>
                      <code className="font-mono text-[11px] text-ink-2">{c.key_hint}</code>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={c.status === "connected" ? "ok" : c.status === "error" ? "danger" : "neutral"}>{c.status}</Badge>
                      <span className="text-[11.5px] text-ink-2">{c.status_detail}</span>
                    </div>
                    {c.base_url ? <p className="mt-1 truncate font-mono text-[10.5px] text-ink-3">{c.base_url}</p> : null}
                    <label className="mt-3 block">
                      <span className="label mb-1 block text-ink-3">Default model</span>
                      <Select
                        value={c.default_model ?? ""}
                        onChange={(e) =>
                          start(async () => {
                            const r = await updateCredential(c.id, { default_model: e.target.value || null });
                            if (r.ok) upsert(r.data);
                            else toast.error(r.error);
                          })
                        }
                        className="[&_select]:h-9 [&_select]:text-[12.5px]"
                      >
                        <option value="">Choose a model…</option>
                        {c.models_cache.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label !== m.id ? `${m.label} — ${m.id}` : m.id}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <CapabilityLine c={c} />
                    <div className="mt-3 flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy === c.id}
                        onClick={async () => {
                          setBusy(c.id);
                          const r = await testCredential(c.id);
                          setBusy(null);
                          if (r.ok) {
                            upsert(r.data);
                            toast.show(r.data.status === "connected" ? "Connection OK" : "Connection failed — see details");
                          } else toast.error(r.error);
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Test
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReplacing(c)} disabled={!encryptionReady}>
                        Replace key
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(c)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                    {c.last_tested_at ? <p className="mt-1 font-mono text-[10px] text-ink-3">Tested {relativeTime(c.last_tested_at)}</p> : null}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button size="sm" variant={list.length ? "outline" : "primary"} disabled={!encryptionReady} onClick={() => setAdding(kind)}>
                  {list.length ? "Add another key" : "Connect"}
                </Button>
                {meta.docs ? (
                  <a href={meta.docs} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11.5px] text-ink-2 hover:text-ink">
                    Get a key <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {/* Routing & embeddings */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <p className="label text-ink-3">Semantic retrieval</p>
          <h3 className="mt-1 font-display text-[17px] font-bold">Embeddings provider</h3>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
            Optional. With an OpenAI or Gemini key, ORBIT embeds your sources for meaning-based search (pgvector in hosted mode). Without it, keyword (BM25) retrieval is used. Changing this applies to newly processed sources — reprocess older ones to embed them.
          </p>
          <Select
            className="mt-3"
            value={embedId}
            onChange={(e) => {
              const v = e.target.value;
              setEmbedId(v);
              start(async () => {
                const r = await updateSettings({ embeddings_credential_id: v || null });
                if (!r.ok) toast.error(r.error);
                else toast.show(v ? "Embeddings enabled" : "Using keyword retrieval");
              });
            }}
            aria-label="Embeddings provider"
          >
            <option value="">Off — keyword retrieval</option>
            {creds
              .filter((c) => c.provider === "openai" || c.provider === "gemini")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.key_hint})
                </option>
              ))}
          </Select>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <p className="label text-ink-3">Persona routing</p>
          <h3 className="mt-1 font-display text-[17px] font-bold">Who thinks with which model</h3>
          <ul className="mt-3 space-y-1.5 text-[13px]">
            {personas.map((p) => {
              const c = creds.find((x) => x.id === p.credential_id);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="font-display text-[12.5px] font-bold tracking-[0.1em]">{p.name}</span>
                  <span className="truncate text-[12px] text-ink-2">{c ? `${c.label} · ${p.model ?? c.default_model ?? "default"}` : "Provider default"}</span>
                </li>
              );
            })}
          </ul>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => router.push("/app/settings/personalities")}>
            Configure personalities
          </Button>
        </div>
      </section>

      <AddKeyDialog
        kind={adding}
        onClose={() => setAdding(null)}
        onAdded={(c) => {
          upsert(c);
          setAdding(null);
          toast.show(c.status === "connected" ? `${c.label} connected — choose a default model` : `Saved, but the test failed: ${c.status_detail ?? ""}`);
          router.refresh();
        }}
      />

      <Dialog open={!!replacing} onOpenChange={(o) => !o && setReplacing(null)} title="Replace API key" description="The old key is overwritten. ORBIT will test the new one immediately.">
        <ReplaceKeyForm
          onSubmit={async (key) => {
            if (!replacing) return;
            const r = await replaceKey(replacing.id, key);
            if (r.ok) {
              upsert(r.data);
              setReplacing(null);
              toast.show("Key replaced");
            } else toast.error(r.error);
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Delete this key?"
        body="The encrypted key is permanently deleted. Personas and chats that used it fall back to your other providers. Remember to also revoke the key in the provider's dashboard if it may be compromised."
        destructive
        confirmLabel="Delete key"
        onConfirm={() =>
          start(async () => {
            if (!removing) return;
            const r = await deleteCredential(removing.id);
            if (r.ok) {
              setCreds((xs) => xs.filter((x) => x.id !== removing.id));
              toast.show("Key deleted");
            } else toast.error(r.error);
            setRemoving(null);
          })
        }
      />
    </div>
  );
}

function CapabilityLine({ c }: { c: PublicCredential }) {
  const m = c.models_cache.find((x) => x.id === c.default_model);
  if (!m) return null;
  const bits = [
    m.contextWindow ? `${Math.round(m.contextWindow / 1000)}k context` : null,
    m.vision === true ? "vision" : m.vision === false ? "text only" : null,
    m.inputPrice !== null && m.outputPrice !== null ? `$${m.inputPrice.toFixed(2)} in / $${m.outputPrice.toFixed(2)} out per 1M` : null,
  ].filter(Boolean);
  if (!bits.length) return <p className="mt-1.5 text-[11px] text-ink-3">Capabilities not published by provider.</p>;
  return <p className="mt-1.5 text-[11px] text-ink-2">{bits.join(" · ")}</p>;
}

function ReplaceKeyForm({ onSubmit }: { onSubmit: (key: string) => Promise<void> }) {
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        await onSubmit(key);
        setPending(false);
        setKey("");
      }}
    >
      <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="New API key" autoComplete="off" required aria-label="New API key" />
      <Button type="submit" loading={pending} className="self-end">
        Replace & test
      </Button>
    </form>
  );
}

function AddKeyDialog({ kind, onClose, onAdded }: { kind: ProviderKind | null; onClose: () => void; onAdded: (c: PublicCredential) => void }) {
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [pending, setPending] = useState(false);
  const meta = kind ? PROVIDER_META[kind] : null;
  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()} title={`Connect ${meta?.label ?? ""}`} description="Your key is sent once over HTTPS, encrypted on the server and only ever shown masked.">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!kind) return;
          setPending(true);
          const r = await addCredential({ provider: kind, label: label || undefined, apiKey: key, baseUrl: baseUrl || null });
          setPending(false);
          if (r.ok) {
            setKey("");
            setLabel("");
            setBaseUrl("");
            onAdded(r.data);
          } else toast.error(r.error);
        }}
      >
        <Field label="Label (optional)">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={meta?.label} />
        </Field>
        {meta?.needsBaseUrl ? (
          <Field label="Base URL" hint="OpenAI-compatible API root, e.g. https://example.com/v1. Private network addresses are blocked unless ORBIT_ALLOW_PRIVATE_ENDPOINTS=true.">
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…/v1" type="url" required />
          </Field>
        ) : null}
        <Field label="API key">
          <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={meta?.keyHint} autoComplete="off" required />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[11.5px] text-ink-2">{pending ? <><OrbitPulse className="h-4 w-4 text-ink" /> Testing connection…</> : "We'll test the key by listing models."}</span>
          <Button type="submit" loading={pending}>
            Save & test
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
