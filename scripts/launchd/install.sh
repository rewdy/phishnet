#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LAUNCH_AGENTS_DIR="${HOME}/Library/LaunchAgents"
LOG_DIR="${HOME}/Library/Logs"
STACK_LABEL="com.phishnet.stack"
CLEANUP_LABEL="com.phishnet.cleanup"
STACK_PLIST="${LAUNCH_AGENTS_DIR}/${STACK_LABEL}.plist"
CLEANUP_PLIST="${LAUNCH_AGENTS_DIR}/${CLEANUP_LABEL}.plist"
UID_VALUE="$(id -u)"

BUN_BIN="$(command -v bun || true)"
if [[ -z "${BUN_BIN}" ]]; then
  if [[ -x "${HOME}/.bun/bin/bun" ]]; then
    BUN_BIN="${HOME}/.bun/bin/bun"
  else
    echo "bun was not found in PATH or ~/.bun/bin/bun"
    exit 1
  fi
fi

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

mkdir -p "${LAUNCH_AGENTS_DIR}" "${LOG_DIR}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

STACK_COMMAND="export PATH=\"${HOME}/.bun/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin\"; cd \"${ROOT_DIR}\" &amp;&amp; \"${BUN_BIN}\" run start"
CLEANUP_COMMAND="export PATH=\"${HOME}/.bun/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin\"; cd \"${ROOT_DIR}\" &amp;&amp; \"${BUN_BIN}\" run service:cleanup"

cat > "${TMP_DIR}/${STACK_LABEL}.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${STACK_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>${STACK_COMMAND}</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${ROOT_DIR}</string>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>ThrottleInterval</key>
  <integer>10</integer>

  <key>StandardOutPath</key>
  <string>${LOG_DIR}/phishnet.stack.out.log</string>

  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/phishnet.stack.err.log</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
</dict>
</plist>
PLIST

cat > "${TMP_DIR}/${CLEANUP_LABEL}.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${CLEANUP_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>${CLEANUP_COMMAND}</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${ROOT_DIR}</string>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>3</integer>
    <key>Minute</key>
    <integer>15</integer>
  </dict>

  <key>StandardOutPath</key>
  <string>${LOG_DIR}/phishnet.cleanup.out.log</string>

  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/phishnet.cleanup.err.log</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
</dict>
</plist>
PLIST

plutil -lint "${TMP_DIR}/${STACK_LABEL}.plist" >/dev/null
plutil -lint "${TMP_DIR}/${CLEANUP_LABEL}.plist" >/dev/null

echo "Generated launchd plists in ${TMP_DIR}:"
echo "- ${TMP_DIR}/${STACK_LABEL}.plist"
echo "- ${TMP_DIR}/${CLEANUP_LABEL}.plist"

echo
if ! prompt_yes_no "Install these plist files to ${LAUNCH_AGENTS_DIR} and start services?"; then
  echo "Skipped install."
  exit 0
fi

cp "${TMP_DIR}/${STACK_LABEL}.plist" "${STACK_PLIST}"
cp "${TMP_DIR}/${CLEANUP_LABEL}.plist" "${CLEANUP_PLIST}"

launchctl bootout "gui/${UID_VALUE}/${STACK_LABEL}" >/dev/null 2>&1 || true
launchctl bootout "gui/${UID_VALUE}/${CLEANUP_LABEL}" >/dev/null 2>&1 || true

launchctl bootstrap "gui/${UID_VALUE}" "${STACK_PLIST}"
launchctl bootstrap "gui/${UID_VALUE}" "${CLEANUP_PLIST}"
launchctl enable "gui/${UID_VALUE}/${STACK_LABEL}"
launchctl enable "gui/${UID_VALUE}/${CLEANUP_LABEL}"
launchctl kickstart -k "gui/${UID_VALUE}/${STACK_LABEL}"

echo "Installed launch agents:"
echo "- ${STACK_LABEL}"
echo "- ${CLEANUP_LABEL}"
echo "Logs:"
echo "- ${LOG_DIR}/phishnet.stack.out.log"
echo "- ${LOG_DIR}/phishnet.stack.err.log"
echo "- ${LOG_DIR}/phishnet.cleanup.out.log"
echo "- ${LOG_DIR}/phishnet.cleanup.err.log"
