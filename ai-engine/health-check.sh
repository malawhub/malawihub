#!/usr/bin/env bash
set -euo pipefail

: "${AI_ENGINE_URL:?Set AI_ENGINE_URL}"
: "${AI_ENGINE_API_KEY:?Set AI_ENGINE_API_KEY}"

curl -fsS \
  -H "Authorization: Bearer ${AI_ENGINE_API_KEY}" \
  "${AI_ENGINE_URL%/}/v1/models"

echo
