#!/usr/bin/env bash
set -euo pipefail

UID_VALUE="$(id -u)"
STACK_LABEL="com.phishnet.stack"
CLEANUP_LABEL="com.phishnet.cleanup"

echo "=== ${STACK_LABEL} ==="
launchctl print "gui/${UID_VALUE}/${STACK_LABEL}" || true

echo

echo "=== ${CLEANUP_LABEL} ==="
launchctl print "gui/${UID_VALUE}/${CLEANUP_LABEL}" || true
