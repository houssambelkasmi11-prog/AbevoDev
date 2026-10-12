import type { ModelInfo, ProviderKind } from "@/lib/types";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; mime: string; data: string } // base64
  | { type: "pdf"; data: string; filename: string }; // base64

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | ContentPart[];
}

export interface ChatRequest {
  model: string;
  system: string;
  messages: ChatMessage[];
  temperature?: number | null;
  maxTokens?: number | null;
  signal?: AbortSignal;
  /** Ask for a JSON object when the provider supports a JSON mode. */
  json?: boolean;
}

export interface ProviderConnection {
  kind: ProviderKind;
  apiKey: string;
  baseUrl: string | null;
}

export interface ProviderAdapter {
  kind: ProviderKind;
  label: string;
  listModels(conn: ProviderConnection): Promise<ModelInfo[]>;
  stream(conn: ProviderConnection, req: ChatRequest): AsyncGenerator<string>;
  embed?(conn: ProviderConnection, texts: string[], model?: string): Promise<number[][]>;
  supportsEmbeddings: boolean;
  defaultEmbeddingModel?: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null,
    public readonly code: "auth" | "rate_limit" | "bad_request" | "unavailable" | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class NoProviderError extends Error {
  constructor(message = "No AI provider is connected. Add an API key in Settings → AI Providers.") {
    super(message);
    this.name = "NoProviderError";
  }
}
