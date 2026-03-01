#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MODE="${1:-}"
if [[ "${MODE}" != "start" && "${MODE}" != "web" ]]; then
  echo "Usage: $0 <start|web>" >&2
  exit 1
fi

ENV_FILE="${ROOT_DIR}/service/.env"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a
fi

is_truthy() {
  local value
  value="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  [[ "${value}" == "1" || "${value}" == "true" || "${value}" == "yes" ]]
}

PHISHNET_API_HOST="${PHISHNET_API_HOST:-127.0.0.1}"
PHISHNET_API_PORT="${PHISHNET_API_PORT:-8787}"
PHISHNET_UI_HOST="${PHISHNET_UI_HOST:-127.0.0.1}"
PHISHNET_UI_PORT="${PHISHNET_UI_PORT:-54321}"

if is_truthy "${LAN_MODE:-false}"; then
  PHISHNET_API_HOST="0.0.0.0"
  PHISHNET_UI_HOST="0.0.0.0"
fi

export API_HOST="${PHISHNET_API_HOST}"
export API_PORT="${PHISHNET_API_PORT}"
export PHISHNET_UI_HOST
export PHISHNET_UI_PORT
export VITE_API_PORT="${PHISHNET_API_PORT}"

echo "Phishnet network config:"
echo "- API: http://${API_HOST}:${API_PORT}"
echo "- UI:  http://${PHISHNET_UI_HOST}:${PHISHNET_UI_PORT}"
if is_truthy "${LAN_MODE:-false}"; then
  echo "- LAN mode: enabled"
else
  echo "- LAN mode: disabled"
fi

cd "${ROOT_DIR}"
if [[ "${MODE}" == "start" ]]; then
  exec bun run start:internal
fi

exec bun run web:internal
