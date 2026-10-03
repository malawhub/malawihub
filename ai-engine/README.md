# MalawiHub AI Engine

This directory defines the independent model-serving layer for MalawiHub AI Class.

## Architecture

Student browser -> Supabase Edge Function `malawihub-ai` -> self-hosted open-weight model

The Edge Function keeps the model endpoint and any model-server credential out of the browser.

## Model server

The engine uses an OpenAI-compatible `/v1/chat/completions` endpoint. vLLM supports this API and can serve open-weight models.

The initial deployment target is Qwen3-8B for a quality-oriented university tutor. For a small development machine, Qwen3-0.6B can be used to validate the wiring before moving to a stronger model.

## Environment

The model server should expose:

- `AI_ENGINE_URL` — base URL of the model server, without the `/v1/chat/completions` suffix
- `AI_ENGINE_MODEL` — model identifier accepted by the server
- `AI_ENGINE_API_KEY` — optional private credential

These are Supabase Edge Function secrets, not browser variables.

## Example vLLM

```bash
vllm serve Qwen/Qwen3-8B --host 0.0.0.0 --port 8000 --api-key YOUR_ENGINE_KEY
```

For a development test:

```bash
vllm serve Qwen/Qwen3-0.6B --host 0.0.0.0 --port 8000 --api-key YOUR_ENGINE_KEY
```

Do not expose an unauthenticated model server directly to the public internet. Put it behind HTTPS and an access-controlled reverse proxy.

## Supabase secrets

Set:

```text
AI_ENGINE_URL=https://YOUR-AI-SERVER
AI_ENGINE_MODEL=Qwen/Qwen3-8B
AI_ENGINE_API_KEY=...
```

The values are read only by the `malawihub-ai` Edge Function.

## Important

The existing `ai-class` function is deliberately left untouched while this engine is being brought online. Once the independent engine passes testing, the AI Class frontend can be switched to `malawihub-ai`.
