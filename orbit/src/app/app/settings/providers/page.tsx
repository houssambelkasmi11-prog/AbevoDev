import type { Metadata } from "next";
import { ProvidersManager } from "@/components/settings/providers-manager";
import { publicCredential } from "@/lib/ai/resolve";
import { getContext } from "@/lib/bootstrap";
import { encryptionAvailable } from "@/lib/crypto";

export const metadata: Metadata = { title: "AI Providers" };

export default async function ProvidersPage() {
  const { repo, settings } = await getContext();
  const [creds, personas] = await Promise.all([repo.list("credentials", { order: { column: "created_at" } }), repo.list("personas", { order: { column: "created_at" } })]);
  return (
    <ProvidersManager
      credentials={creds.map(publicCredential)}
      encryptionReady={encryptionAvailable()}
      embeddingsCredentialId={settings.embeddings_credential_id}
      personas={personas.map((p) => ({ id: p.id, name: p.name, credential_id: p.credential_id, model: p.model }))}
    />
  );
}
