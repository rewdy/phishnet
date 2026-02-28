# Install Phishnet

## 1. Prerequisites

- macOS machine with internet access (always-on recommended)
- [Bun](https://bun.sh) installed
- iCloud account with IMAP access
- OpenAI API key

## 2. Clone and install dependencies

```bash
bun install
cp service/.env.template service/.env
```

## 3. Configure service credentials

Edit `service/.env` and set at minimum:

- `IMAP_USER` (your full iCloud email, e.g. `name@icloud.com`)
- `IMAP_PASSWORD` (Apple app-specific password)
- `OPENAI_API_KEY` (project API key)

Defaults include:

- `IMAP_HOST=imap.mail.me.com`
- `IMAP_PORT=993`
- `IMAP_SECURE=true`
- `FILTER_PROFILE=light` (`light` = sexual only, `balanced` = sexual + spam, `strict` = sexual + spam + annoyances)
- `POLL_INTERVAL_MINUTES=15`
- `CONFIDENCE_THRESHOLD=0.6`

## 4. OpenAI API key setup

- Create a project API key in the OpenAI API dashboard.
- Recommended: restricted key with model request permissions for chat completions.
- Place it in `service/.env` as `OPENAI_API_KEY`.

## 5. iCloud app-specific password setup

Use an app-specific password (not your Apple ID password):

1. Open `appleid.apple.com`
2. Sign in and ensure 2FA is enabled
3. Open **Sign-In and Security** -> **App-Specific Passwords**
4. Generate a new app password for Phishnet
5. Put it in `service/.env` as `IMAP_PASSWORD`

Note: username is your iCloud mailbox address (for example `you@icloud.com`).

## 6. Verify service

Run a dry-run cycle:

```bash
bun run service:dry-run-once
```

## 7. Optional: run as persistent background services with launchd

Phishnet includes user-specific launchd scripts:

- `scripts/launchd/install.sh`
- `scripts/launchd/status.sh`
- `scripts/launchd/uninstall.sh`

Install interactively:

```bash
bun run launchd:install
```

If bun is installed in a non-standard location, pass it explicitly:

```bash
PHISHNET_BUN_BIN=/absolute/path/to/bun bun run launchd:install
```

Install non-interactively:

```bash
./scripts/launchd/install.sh --yes
```

Check status:

```bash
bun run launchd:status
```

Logs:

- `~/Library/Logs/phishnet.stack.out.log`
- `~/Library/Logs/phishnet.stack.err.log`
- `~/Library/Logs/phishnet.cleanup.out.log`
- `~/Library/Logs/phishnet.cleanup.err.log`

Uninstall/remove launchd services:

```bash
bun run launchd:uninstall
```

Non-interactive uninstall:

```bash
./scripts/launchd/uninstall.sh --yes
```

The uninstall script can also optionally remove logs and database files.
