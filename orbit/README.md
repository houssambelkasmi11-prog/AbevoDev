# ORBIT — *Your mind. In motion.*

A cinematic public site and a complete AI study workspace: notes, a source library with grounded retrieval, six teaching personalities, bring-your-own AI providers, Homework Studio, Practice Lab, Focus Mode, a calendar and an interactive knowledge universe.

> Human curiosity. Artificial intelligence. Infinite understanding.

---

## Quick start (local mode, no external services)

Requirements: **Node.js 20.9+** (22 LTS recommended).

```bash
npm install
npm run setup      # writes .env.local with fresh ORBIT_ENCRYPTION_KEY + ORBIT_SESSION_SECRET
npm run dev        # http://localhost:3000
```

Create an account at `/sign-up`. In local mode, data lives in `./.orbit-data/` (JSON tables, uploaded files, auth). You'll get a one-time **recovery code** at sign-up — that's the local-mode password reset.

Then open **Settings → AI Providers** and connect at least one key (OpenAI, Anthropic, Google Gemini, OpenRouter, or an OpenAI-compatible endpoint). Everything AI-related is disabled — never faked — until you do.

Useful scripts: `npm run typecheck`, `npm run build`, `npm start`.

## Hosted mode (Supabase)

1. Create a Supabase project. In **SQL editor**, run `supabase/migrations/0001_orbit_init.sql` (or `supabase db push`). It creates every table with row-level security, the pgvector index + `match_source_chunks` function, the private `sources` storage bucket and its policies, and `delete_own_account`.
2. In `.env.local` set:
   ```
   ORBIT_BACKEND=supabase
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SITE_URL=https://your-domain
   ORBIT_ENCRYPTION_KEY=...   # keep the one from `npm run setup`
   ```
3. In Supabase Auth → URL configuration, add `https://your-domain/auth/callback` as a redirect URL (email confirmation + password reset).

All queries run with the signed-in user's JWT, so Postgres RLS is the primary guard; the repository layer adds an explicit `user_id` filter as defence in depth.

## Architecture

```
src/
  app/
    (marketing)/          public site: /, /features, /how-it-works, /models, /about
    (auth)/               /sign-in, /sign-up, /reset, /reset/update
    app/                  authenticated workspace (/app, /app/notes/[id], …)
    api/                  streaming AI (NDJSON), uploads, exports, search, files
  components/
    marketing/hero/       THE CONNECTION — R3F scene + GSAP ScrollTrigger narrative
    app/ notes/ lessons/ chat/ homework/ practice/ focus/ calendar/ universe/ settings/
  lib/
    db/                   typed Repo interface → LocalRepo (JSON) | SupabaseRepo (Postgres)
    auth/                 local sessions (scrypt + HMAC cookies) | Supabase Auth
    ai/                   provider adapters, model resolution, prompts, retrieval, embeddings
    ingest/               PDF (unpdf) / DOCX (mammoth) / URL / text extraction + chunking
    crypto.ts             AES-256-GCM for provider keys
  server/actions/         validated server actions (zod) returning typed results
supabase/migrations/      schema + RLS + pgvector + storage policies
```

- **Data access** — `Repo` is generic over a typed table map (`src/lib/types.ts`), so every read/write is type-checked and always scoped to the current user.
- **AI providers** — `src/lib/ai/providers.ts` implements OpenAI, Anthropic, Gemini, OpenRouter and OpenAI-compatible endpoints over `fetch` with streaming. Model lists are fetched live (no hard-coded inventories). Parameters a model rejects (e.g. temperature on reasoning models) are stripped and retried automatically.
- **Personalities** — ATLAS, NOVA, AXIOM, SOCRATES, ECHO, PULSE are seeded as real behaviour configs (instructions, depth, length, language, temperature, model). Users can edit them or design their own.
- **Grounding** — sources are chunked with page/heading metadata. Retrieval uses BM25 always, plus embeddings (OpenAI or Gemini; pgvector in hosted mode) when enabled, fused with reciprocal-rank fusion. Retrieved text is wrapped as untrusted data; answers cite `[S#]` keys that render as clickable chips; when sources don't cover a question the answer is flagged **Not in sources**.
- **Background jobs** — ingestion runs after the response via `after()` with status/progress persisted and polled by the UI. On serverless hosting with tight time limits, move `processSource` to a queue worker (the function is self-contained).

## Security

- Provider keys are encrypted at rest with AES-256-GCM using `ORBIT_ENCRYPTION_KEY`; ciphertexts are bound to their owner (AAD), only decrypted server-side for a request, never logged, never returned to the browser (only a masked hint). Without the key, provider connections are disabled.
- Custom endpoints and URL imports go through an SSRF guard (no private/loopback addresses unless `ORBIT_ALLOW_PRIVATE_ENDPOINTS=true`, e.g. for a local Ollama).
- Uploaded files are served only to their owner, with `nosniff` and a sandboxing CSP.
- Nothing is sent to an AI provider without a user-initiated action. Documents and student answers are delimited as untrusted input in every prompt.
- Destructive actions confirm; note deletion is undoable; AI never overwrites notes or homework without explicit confirmation.

## Honest limitations

- **YouTube** — videos are added with their public title, but transcripts must be pasted (no unofficial scraping).
- **OCR** — images and scanned PDFs are transcribed by *your* vision-capable model on request ("Extract text with AI"); the result is labelled as AI transcription.
- **Local mode** is single-machine and file-based — ideal for personal use and development; use Supabase for multi-device / multi-user hosting.
- **Exports** — PDF export uses standard fonts; characters outside Latin-1 (e.g. CJK, many math symbols) are substituted. DOCX/Markdown preserve full Unicode.
- ORBIT never submits work anywhere; there are no LMS integrations.

## Design system

Monochrome tokens live in `src/app/globals.css` (Tailwind v4 `@theme`). Display type is Cabinet Grotesk (Fontshare, ITF Free Font License), body Geist, editorial accents Instrument Serif Italic, metadata JetBrains Mono. The orbital emblem is `src/components/brand/logo.tsx`; the same geometry powers the favicon, the Learning Pulse loader, empty states and the focus timer.

Reduced motion is respected everywhere: the hero becomes a static editorial layout, Lenis is disabled, and CSS animations collapse.
