#!/usr/bin/env bash
set -euo pipefail

UID_VALUE="$(id -u)"
STACK_LABEL="com.phishnet.stack"
STACK_TARGET="gui/${UID_VALUE}/${STACK_LABEL}"

if ! launchctl print "${STACK_TARGET}" >/dev/null 2>&1; then
  echo "Launch agent ${STACK_LABEL} is not loaded." >&2
  echo "Install/start it first with: bun run launchd:install" >&2
  exit 1
fi

launchctl kickstart -k "${STACK_TARGET}"

echo "Restarted launch agent: ${STACK_LABEL}"
echo "Logs:"
echo "- ${HOME}/Library/Logs/phishnet.stack.out.log"
echo "- ${HOME}/Library/Logs/phishnet.stack.err.log"
