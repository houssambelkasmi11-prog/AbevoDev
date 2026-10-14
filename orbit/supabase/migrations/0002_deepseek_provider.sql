-- Allow DeepSeek as an AI provider on existing databases.
alter table public.credentials drop constraint if exists credentials_provider_check;
alter table public.credentials
  add constraint credentials_provider_check
  check (provider in ('openai','anthropic','gemini','openrouter','deepseek','custom'));
