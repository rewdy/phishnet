# launchd Setup (macOS)

Phishnet includes scripts that generate and install user-specific LaunchAgents.

These scripts avoid committing machine-specific plist files and handle:
- install/bootstrap/start
- status inspection
- uninstall/removal

## Scripts

- `scripts/launchd/install.sh`
- `scripts/launchd/status.sh`
- `scripts/launchd/uninstall.sh`

## Prerequisites

- macOS
- `bun` installed
- Repo checked out locally
- `service/.env` configured

## Install

Interactive install:

```bash
./scripts/launchd/install.sh
```

Non-interactive install:

```bash
./scripts/launchd/install.sh --yes
```

What install does:
- Generates two plist files with your current `HOME`, user ID, repo path, and `bun` path
- Installs them into `~/Library/LaunchAgents`
- Bootstraps and enables:
  - `com.phishnet.stack` (`bun run start`)
  - `com.phishnet.cleanup` (`bun run service:cleanup` daily at 03:15)
- Starts/restarts the stack agent immediately

## Status

```bash
./scripts/launchd/status.sh
```

You can also run:

```bash
launchctl print gui/$(id -u)/com.phishnet.stack
launchctl print gui/$(id -u)/com.phishnet.cleanup
```

## Logs

- `~/Library/Logs/phishnet.stack.out.log`
- `~/Library/Logs/phishnet.stack.err.log`
- `~/Library/Logs/phishnet.cleanup.out.log`
- `~/Library/Logs/phishnet.cleanup.err.log`

Tail logs:

```bash
tail -f ~/Library/Logs/phishnet.stack.out.log ~/Library/Logs/phishnet.stack.err.log
```

## Uninstall / Remove

Interactive uninstall:

```bash
./scripts/launchd/uninstall.sh
```

Non-interactive uninstall:

```bash
./scripts/launchd/uninstall.sh --yes
```

What uninstall does:
- Boots out `com.phishnet.stack` and `com.phishnet.cleanup`
- Removes plist files from `~/Library/LaunchAgents`
- Optionally removes logs
- Optionally removes `service/data/email-filter.db`
