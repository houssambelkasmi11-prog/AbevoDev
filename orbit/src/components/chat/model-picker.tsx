"use client";

import { PROVIDER_META } from "@/lib/ai/provider-meta";
import type { PublicCredential } from "@/lib/types";
import { Select } from "@/components/ui/field";

export type CredentialLite = Pick<PublicCredential, "id" | "provider" | "label" | "default_model" | "status"> & {
  models: { id: string; label: string; inputPrice: number | null; outputPrice: number | null }[];
};

/** Encodes credential+model in one <select>; "" means "use default". */
export function ModelPicker({
  credentials,
  credentialId,
  model,
  onChange,
  defaultLabel = "Default (persona / provider)",
  className,
  id,
}: {
  credentials: CredentialLite[];
  credentialId: string | null;
  model: string | null;
  onChange: (credentialId: string | null, model: string | null) => void;
  defaultLabel?: string;
  className?: string;
  id?: string;
}) {
  const value = credentialId && model ? `${credentialId}::${model}` : "";
  return (
    <Select
      id={id}
      aria-label="Model"
      value={value}
      className={className}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return onChange(null, null);
        const [cid, ...rest] = v.split("::");
        onChange(cid, rest.join("::"));
      }}
    >
      <option value="">{defaultLabel}</option>
      {credentials.map((c) => (
        <optgroup key={c.id} label={`${c.label || PROVIDER_META[c.provider].label}${c.status === "error" ? " (error)" : ""}`}>
          {c.models.length === 0 ? <option disabled>No models — test the connection</option> : null}
          {c.models.map((m) => (
            <option key={m.id} value={`${c.id}::${m.id}`}>
              {m.label !== m.id ? `${m.label} (${m.id})` : m.id}
              {m.inputPrice !== null && m.outputPrice !== null ? ` — $${m.inputPrice.toFixed(2)}/$${m.outputPrice.toFixed(2)} per 1M` : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

/** Rough cost estimate — only when the provider published prices. */
export function estimateCost(chars: number, model: { inputPrice: number | null; outputPrice: number | null } | undefined, expectedOutputTokens = 800): string | null {
  if (!model || model.inputPrice === null || model.outputPrice === null) return null;
  const inTok = chars / 4;
  const usd = (inTok * model.inputPrice + expectedOutputTokens * model.outputPrice) / 1_000_000;
  if (usd < 0.001) return "< $0.001";
  return `≈ $${usd.toFixed(usd < 0.1 ? 3 : 2)}`;
}
