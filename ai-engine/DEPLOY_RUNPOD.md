# MalawiHub AI Engine — GPU deployment

This directory runs the independent MalawiHub AI model behind the Supabase `malawihub-ai` gateway.

## Recommended first server

Use a Linux NVIDIA GPU with at least 24 GB VRAM for the first public test. vLLM supports NVIDIA GPUs with compute capability 7.5+ and provides an official OpenAI-compatible Docker image.

A 24 GB L4 is a practical starting point for testing. The exact available price changes, so check the provider before launching.

## RunPod Pod setup

1. Create a RunPod account and add billing.
2. Create a GPU Pod.
3. Select an NVIDIA L4 (24 GB) or another NVIDIA GPU with at least 24 GB VRAM.
4. Use a Linux image with Docker support.
5. Attach persistent storage for the Hugging Face model cache.
6. Open only the port needed for the model API. Do not expose the API without authentication.
7. Clone this repository on the server.

## Required server environment

Create an environment file containing:

HF_TOKEN=<your Hugging Face token if required>
AI_ENGINE_API_KEY=<long random private API key>

Never commit this file.

## Start vLLM

From `ai-engine/`:

docker compose up -d

The included compose file starts Qwen/Qwen3-8B and exposes the OpenAI-compatible API on port 8000.

## Verify the model

Run:

curl -fsS -H "Authorization: Bearer $AI_ENGINE_API_KEY" http://127.0.0.1:8000/v1/models

Then test a question through `/v1/chat/completions`.

## HTTPS

Before connecting Supabase, put the model API behind HTTPS and keep the API key enabled. Do not expose an unauthenticated model endpoint to the public internet.

## Supabase gateway

Set these Edge Function secrets:

AI_ENGINE_URL=https://<private-model-host>
AI_ENGINE_MODEL=Qwen/Qwen3-8B
AI_ENGINE_API_KEY=<same private API key>

Do not change the existing `OPENAI_API_KEY`. It belongs to the existing Online Class integration.

## Production sequence

1. Start the GPU server.
2. Verify `/v1/models`.
3. Verify `/v1/chat/completions`.
4. Configure the three Supabase secrets.
5. Test `malawihub-ai`.
6. Switch the AI Class frontend from the temporary OpenAI function to the independent gateway.
7. Monitor latency, errors and GPU cost.

Stop the GPU Pod when it is not needed during development because GPU instances are billed while running.