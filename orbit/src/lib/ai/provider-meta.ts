import type { ProviderKind } from "@/lib/types";

export const PROVIDER_META: Record<ProviderKind, { label: string; keyHint: string; docs: string; needsBaseUrl: boolean }> = {
  openai: { label: "OpenAI", keyHint: "sk-…", docs: "https://platform.openai.com/api-keys", needsBaseUrl: false },
  anthropic: { label: "Anthropic", keyHint: "sk-ant-…", docs: "https://console.anthropic.com/settings/keys", needsBaseUrl: false },
  gemini: { label: "Google Gemini", keyHint: "AIza…", docs: "https://aistudio.google.com/apikey", needsBaseUrl: false },
  openrouter: { label: "OpenRouter", keyHint: "sk-or-…", docs: "https://openrouter.ai/keys", needsBaseUrl: false },
  custom: { label: "Custom endpoint", keyHint: "API key", docs: "", needsBaseUrl: true },
};

export const PROVIDER_ORDER: ProviderKind[] = ["openai", "anthropic", "gemini", "openrouter", "custom"];
