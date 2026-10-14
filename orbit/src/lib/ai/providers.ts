import "server-only";
import { env } from "@/lib/env";
import { assertPublicUrl } from "@/lib/net";
import type { ModelInfo, ProviderKind } from "@/lib/types";
import { readSSE } from "./sse";
import { ProviderError, type ChatMessage, type ChatRequest, type ContentPart, type ProviderAdapter, type ProviderConnection } from "./types";

/* ───────────────────────────── helpers ───────────────────────────── */

const EMBED_DIMS = 1536;

async function toProviderError(res: Response, provider: string): Promise<ProviderError> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
      detail = typeof j.error === "string" ? j.error : j.error?.message ?? j.message ?? text;
    } catch {
      detail = text;
    }
  } catch {
    /* ignore */
  }
  detail = detail.slice(0, 400);
  const code =
    res.status === 401 || res.status === 403
      ? "auth"
      : res.status === 429
        ? "rate_limit"
        : res.status === 400 || res.status === 404 || res.status === 422
          ? "bad_request"
          : res.status >= 500
            ? "unavailable"
            : "unknown";
  const prefix =
    code === "auth"
      ? `${provider} rejected the API key`
      : code === "rate_limit"
        ? `${provider} rate limit or quota reached`
        : code === "unavailable"
          ? `${provider} is temporarily unavailable`
          : `${provider} request failed`;
  return new ProviderError(`${prefix} (${res.status})${detail ? `: ${detail}` : ""}`, res.status, code);
}

function partsOf(content: ChatMessage["content"]): ContentPart[] {
  return typeof content === "string" ? [{ type: "text", text: content }] : content;
}

function textOf(content: ChatMessage["content"]): string {
  return partsOf(content)
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

/** Merge consecutive same-role messages and ensure the first is from the user. */
function normaliseTurns(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content = [...partsOf(last.content), { type: "text", text: "\n\n" }, ...partsOf(m.content)];
    } else out.push({ role: m.role, content: m.content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

const NON_CHAT = /(embed|embedding|whisper|tts|dall-e|davinci|babbage|moderation|audio|realtime|transcribe|image|search|computer-use|sora)/i;

/* ─────────────────────────── OpenAI-compatible ─────────────────────────── */

function openAIBase(conn: ProviderConnection): string {
  if (conn.kind === "openai") return "https://api.openai.com/v1";
  if (conn.kind === "openrouter") return "https://openrouter.ai/api/v1";
  if (conn.kind === "deepseek") return "https://api.deepseek.com";
  if (!conn.baseUrl) throw new ProviderError("Custom endpoint has no base URL.");
  return conn.baseUrl.replace(/\/+$/, "");
}

function openAIHeaders(conn: ProviderConnection): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${conn.apiKey}` };
  if (conn.kind === "openrouter") {
    h["HTTP-Referer"] = env.siteUrl;
    h["X-Title"] = "ORBIT";
  }
  return h;
}

async function guardCustom(conn: ProviderConnection) {
  if (conn.kind === "custom") await assertPublicUrl(openAIBase(conn), { allowPrivate: env.allowPrivateEndpoints });
}

function toOpenAIContent(content: ChatMessage["content"]): string | Record<string, unknown>[] {
  if (typeof content === "string") return content;
  return content.map((p) => {
    if (p.type === "text") return { type: "text", text: p.text };
    if (p.type === "image") return { type: "image_url", image_url: { url: `data:${p.mime};base64,${p.data}` } };
    return { type: "file", file: { filename: p.filename, file_data: `data:application/pdf;base64,${p.data}` } };
  });
}

interface OpenAIModelEntry {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { input_modalities?: string[]; modality?: string };
}

/** Used only if DeepSeek's /models endpoint is unavailable (the key is still verified by a 401). */
const DEEPSEEK_FALLBACK_MODELS: ModelInfo[] = [
  { id: "deepseek-flash", label: "DeepSeek Flash", contextWindow: null, vision: false, inputPrice: null, outputPrice: null },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", contextWindow: null, vision: false, inputPrice: null, outputPrice: null },
];

function makeOpenAICompatible(kind: "openai" | "openrouter" | "deepseek" | "custom", label: string): ProviderAdapter {
  return {
    kind,
    label,
    supportsEmbeddings: kind === "openai",
    defaultEmbeddingModel: kind === "openai" ? "text-embedding-3-small" : undefined,

    async listModels(conn) {
      await guardCustom(conn);
      const res = await fetch(`${openAIBase(conn)}/models`, { headers: openAIHeaders(conn), cache: "no-store" });
      if (kind === "deepseek" && (res.status === 404 || res.status === 405)) return DEEPSEEK_FALLBACK_MODELS;
      if (!res.ok) throw await toProviderError(res, label);
      const json = (await res.json()) as { data?: OpenAIModelEntry[] };
      const models = (json.data ?? []).filter((m) => kind !== "openai" || !NON_CHAT.test(m.id));
      return models
        .map<ModelInfo>((m) => {
          const inP = m.pricing?.prompt ? Number(m.pricing.prompt) : NaN;
          const outP = m.pricing?.completion ? Number(m.pricing.completion) : NaN;
          const modalities = m.architecture?.input_modalities ?? (m.architecture?.modality ? m.architecture.modality.split("->")[0].split("+") : null);
          return {
            id: m.id,
            label: m.name ?? m.id,
            contextWindow: m.context_length ?? null,
            vision: modalities ? modalities.includes("image") : null,
            inputPrice: Number.isFinite(inP) && inP >= 0 ? inP * 1_000_000 : null,
            outputPrice: Number.isFinite(outP) && outP >= 0 ? outP * 1_000_000 : null,
          };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
    },

    async *stream(conn, req) {
      await guardCustom(conn);
      const body: Record<string, unknown> = {
        model: req.model,
        stream: true,
        messages: [
          { role: "system", content: req.system },
          ...req.messages.map((m) => ({ role: m.role, content: toOpenAIContent(m.content) })),
        ],
      };
      if (req.temperature !== null && req.temperature !== undefined) body.temperature = req.temperature;
      if (req.maxTokens) body[kind === "openai" ? "max_completion_tokens" : "max_tokens"] = req.maxTokens;
      if (req.json) body.response_format = { type: "json_object" };

      let res: Response | null = null;
      // Retry once, stripping parameters a model rejects (e.g. reasoning models and temperature).
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await fetch(`${openAIBase(conn)}/chat/completions`, {
          method: "POST",
          headers: openAIHeaders(conn),
          body: JSON.stringify(body),
          signal: req.signal,
        });
        if (res.ok) break;
        if (res.status !== 400) throw await toProviderError(res, label);
        const err = await toProviderError(res, label);
        const msg = err.message.toLowerCase();
        if (msg.includes("temperature") && "temperature" in body) delete body.temperature;
        else if (msg.includes("response_format") && "response_format" in body) delete body.response_format;
        else if (msg.includes("max_completion_tokens") && "max_completion_tokens" in body) {
          body.max_tokens = body.max_completion_tokens;
          delete body.max_completion_tokens;
        } else if (msg.includes("max_tokens") && "max_tokens" in body) {
          body.max_completion_tokens = body.max_tokens;
          delete body.max_tokens;
        } else throw err;
        res = null;
      }
      if (!res || !res.body) throw new ProviderError(`${label} returned no response body.`);

      for await (const { data } of readSSE(res.body)) {
        if (data === "[DONE]") return;
        let j: { choices?: { delta?: { content?: string | null } }[]; error?: { message?: string } };
        try {
          j = JSON.parse(data);
        } catch {
          continue;
        }
        if (j.error) throw new ProviderError(`${label}: ${j.error.message ?? "stream error"}`);
        const piece = j.choices?.[0]?.delta?.content;
        if (piece) yield piece;
      }
    },

    async embed(conn, texts, model) {
      const res = await fetch(`${openAIBase(conn)}/embeddings`, {
        method: "POST",
        headers: openAIHeaders(conn),
        body: JSON.stringify({ model: model ?? "text-embedding-3-small", input: texts, dimensions: EMBED_DIMS }),
      });
      if (!res.ok) throw await toProviderError(res, label);
      const j = (await res.json()) as { data: { embedding: number[]; index: number }[] };
      return j.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    },
  };
}

/* ─────────────────────────────── Anthropic ─────────────────────────────── */

const ANTHROPIC_VERSION = "2023-06-01";

function anthropicHeaders(conn: ProviderConnection): Record<string, string> {
  return { "Content-Type": "application/json", "x-api-key": conn.apiKey, "anthropic-version": ANTHROPIC_VERSION };
}

function toAnthropicContent(content: ChatMessage["content"]): string | Record<string, unknown>[] {
  if (typeof content === "string") return content;
  return content.map((p) => {
    if (p.type === "text") return { type: "text", text: p.text };
    if (p.type === "image") return { type: "image", source: { type: "base64", media_type: p.mime, data: p.data } };
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: p.data } };
  });
}

const anthropic: ProviderAdapter = {
  kind: "anthropic",
  label: "Anthropic",
  supportsEmbeddings: false,

  async listModels(conn) {
    const out: ModelInfo[] = [];
    let after: string | null = null;
    for (let page = 0; page < 5; page++) {
      const url = new URL("https://api.anthropic.com/v1/models");
      url.searchParams.set("limit", "100");
      if (after) url.searchParams.set("after_id", after);
      const res = await fetch(url, { headers: anthropicHeaders(conn), cache: "no-store" });
      if (!res.ok) throw await toProviderError(res, "Anthropic");
      const j = (await res.json()) as { data: { id: string; display_name?: string }[]; has_more?: boolean; last_id?: string };
      for (const m of j.data) out.push({ id: m.id, label: m.display_name ?? m.id, contextWindow: null, vision: null, inputPrice: null, outputPrice: null });
      if (!j.has_more || !j.last_id) break;
      after = j.last_id;
    }
    return out;
  },

  async *stream(conn, req) {
    const body: Record<string, unknown> = {
      model: req.model,
      system: req.system,
      max_tokens: req.maxTokens ?? 4096,
      stream: true,
      messages: normaliseTurns(req.messages).map((m) => ({ role: m.role, content: toAnthropicContent(m.content) })),
    };
    if (req.temperature !== null && req.temperature !== undefined) body.temperature = Math.min(1, req.temperature);

    let res: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: anthropicHeaders(conn),
        body: JSON.stringify(body),
        signal: req.signal,
      });
      if (res.ok) break;
      const err = await toProviderError(res, "Anthropic");
      if (res.status === 400 && err.message.toLowerCase().includes("temperature") && "temperature" in body) {
        delete body.temperature;
        res = null;
        continue;
      }
      throw err;
    }
    if (!res || !res.body) throw new ProviderError("Anthropic returned no response body.");

    for await (const { event, data } of readSSE(res.body)) {
      if (event === "error") {
        let msg = "stream error";
        try {
          msg = (JSON.parse(data) as { error?: { message?: string } }).error?.message ?? msg;
        } catch {
          /* ignore */
        }
        throw new ProviderError(`Anthropic: ${msg}`);
      }
      if (event !== "content_block_delta") continue;
      try {
        const j = JSON.parse(data) as { delta?: { type?: string; text?: string } };
        if (j.delta?.type === "text_delta" && j.delta.text) yield j.delta.text;
      } catch {
        /* ignore malformed chunk */
      }
    }
  },
};

/* ─────────────────────────────── Gemini ─────────────────────────────── */

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";

function geminiHeaders(conn: ProviderConnection): Record<string, string> {
  return { "Content-Type": "application/json", "x-goog-api-key": conn.apiKey };
}

function toGeminiParts(content: ChatMessage["content"]): Record<string, unknown>[] {
  return partsOf(content).map((p) => {
    if (p.type === "text") return { text: p.text };
    if (p.type === "image") return { inlineData: { mimeType: p.mime, data: p.data } };
    return { inlineData: { mimeType: "application/pdf", data: p.data } };
  });
}

const gemini: ProviderAdapter = {
  kind: "gemini",
  label: "Google Gemini",
  supportsEmbeddings: true,
  defaultEmbeddingModel: "gemini-embedding-001",

  async listModels(conn) {
    const out: ModelInfo[] = [];
    let token: string | null = null;
    for (let page = 0; page < 5; page++) {
      const url = new URL(`${GEMINI}/models`);
      url.searchParams.set("pageSize", "1000");
      if (token) url.searchParams.set("pageToken", token);
      const res = await fetch(url, { headers: geminiHeaders(conn), cache: "no-store" });
      if (!res.ok) throw await toProviderError(res, "Gemini");
      const j = (await res.json()) as {
        models?: { name: string; displayName?: string; inputTokenLimit?: number; supportedGenerationMethods?: string[] }[];
        nextPageToken?: string;
      };
      for (const m of j.models ?? []) {
        if (!m.supportedGenerationMethods?.includes("generateContent")) continue;
        const id = m.name.replace(/^models\//, "");
        if (/embedding|aqa|imagen|veo|tts/i.test(id)) continue;
        out.push({ id, label: m.displayName ?? id, contextWindow: m.inputTokenLimit ?? null, vision: null, inputPrice: null, outputPrice: null });
      }
      if (!j.nextPageToken) break;
      token = j.nextPageToken;
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
  },

  async *stream(conn, req) {
    const generationConfig: Record<string, unknown> = {};
    if (req.temperature !== null && req.temperature !== undefined) generationConfig.temperature = req.temperature;
    if (req.maxTokens) generationConfig.maxOutputTokens = req.maxTokens;
    if (req.json) generationConfig.responseMimeType = "application/json";
    const body = {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: normaliseTurns(req.messages).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: toGeminiParts(m.content) })),
      generationConfig,
    };
    const res = await fetch(`${GEMINI}/models/${encodeURIComponent(req.model)}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: geminiHeaders(conn),
      body: JSON.stringify(body),
      signal: req.signal,
    });
    if (!res.ok) throw await toProviderError(res, "Gemini");
    if (!res.body) throw new ProviderError("Gemini returned no response body.");
    for await (const { data } of readSSE(res.body)) {
      let j: { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]; error?: { message?: string } };
      try {
        j = JSON.parse(data);
      } catch {
        continue;
      }
      if (j.error) throw new ProviderError(`Gemini: ${j.error.message ?? "stream error"}`);
      for (const part of j.candidates?.[0]?.content?.parts ?? []) {
        if (part.text && !part.thought) yield part.text;
      }
    }
  },

  async embed(conn, texts, model) {
    const m = model ?? "gemini-embedding-001";
    const res = await fetch(`${GEMINI}/models/${m}:batchEmbedContents`, {
      method: "POST",
      headers: geminiHeaders(conn),
      body: JSON.stringify({
        requests: texts.map((t) => ({ model: `models/${m}`, content: { parts: [{ text: t }] }, outputDimensionality: EMBED_DIMS })),
      }),
    });
    if (!res.ok) throw await toProviderError(res, "Gemini");
    const j = (await res.json()) as { embeddings: { values: number[] }[] };
    return j.embeddings.map((e) => normalise(e.values));
  },
};

function normalise(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

/* ─────────────────────────────── Registry ─────────────────────────────── */

export const PROVIDERS: Record<ProviderKind, ProviderAdapter> = {
  openai: makeOpenAICompatible("openai", "OpenAI"),
  anthropic,
  gemini,
  openrouter: makeOpenAICompatible("openrouter", "OpenRouter"),
  deepseek: makeOpenAICompatible("deepseek", "DeepSeek"),
  custom: makeOpenAICompatible("custom", "Custom endpoint"),
};



/** Collects a full completion from a stream. */
export async function complete(conn: ProviderConnection, req: ChatRequest): Promise<string> {
  let out = "";
  for await (const piece of PROVIDERS[conn.kind].stream(conn, req)) out += piece;
  return out;
}

export { textOf };
