#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LAUNCH_AGENTS_DIR="${HOME}/Library/LaunchAgents"
LOG_DIR="${HOME}/Library/Logs"
STACK_LABEL="com.phishnet.stack"
CLEANUP_LABEL="com.phishnet.cleanup"
UID_VALUE="$(id -u)"
ASSUME_YES=false

if [[ "${1:-}" == "--yes" ]]; then
  ASSUME_YES=true
fi

prompt_yes_no() {
  local prompt="$1"
  if [[ "${ASSUME_YES}" == "true" ]]; then
    return 0
  fi

  read -r -p "${prompt} [y/N]: " answer
  [[ "${answer}" =~ ^[Yy]$ ]]
}

echo "Stopping and removing launch agents..."
launchctl bootout "gui/${UID_VALUE}/${STACK_LABEL}" >/dev/null 2>&1 || true
launchctl bootout "gui/${UID_VALUE}/${CLEANUP_LABEL}" >/dev/null 2>&1 || true
rm -f "${LAUNCH_AGENTS_DIR}/${STACK_LABEL}.plist" "${LAUNCH_AGENTS_DIR}/${CLEANUP_LABEL}.plist"

echo "Removed launch agents and plist files from ${LAUNCH_AGENTS_DIR}."

if prompt_yes_no "Also remove phishnet log files in ${LOG_DIR}?"; then
  rm -f "${LOG_DIR}/phishnet.stack.out.log" "${LOG_DIR}/phishnet.stack.err.log" "${LOG_DIR}/phishnet.cleanup.out.log" "${LOG_DIR}/phishnet.cleanup.err.log"
  echo "Removed phishnet logs."
fi

if prompt_yes_no "Also remove service database at ${ROOT_DIR}/service/data/email-filter.db?"; then
  rm -f "${ROOT_DIR}/service/data/email-filter.db"
  echo "Removed service database."
fi

echo "Uninstall complete."
