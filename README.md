# phishnet

<p><img src="./phishnet.png" alt="Phishnet logo" align=center /></p>

Phishnet is a local-first email triage stack for iCloud Mail.

It runs a background service that:

- connects to your iCloud inbox over IMAP,
- evaluates unread messages with OpenAI,
- moves messages with sexual content to Junk,
- stores runs/decisions in SQLite for auditability.

It also includes a local API and web UI to inspect run history and decisions.

## Installation

### 1. Prerequisites

- macOS machine with internet access (always-on recommended)
- [Bun](https://bun.sh) installed
- iCloud account with IMAP access
- OpenAI API key

### 2. Clone and install

```bash
bun install
cp service/.env.template service/.env
```

### 3. Configure credentials

Edit `service/.env` and set at minimum:

- `IMAP_USER` (your full iCloud email, e.g. `name@icloud.com`)
- `IMAP_PASSWORD` (Apple app-specific password; see below)
- `OPENAI_API_KEY` (project API key)

The default config already includes:

- `IMAP_HOST=imap.mail.me.com`
- `IMAP_PORT=993`
- `IMAP_SECURE=true`
- `POLL_INTERVAL_MINUTES=30`
- `CONFIDENCE_THRESHOLD=0.6`

### 4. Create OpenAI API key

- In the OpenAI API dashboard, create a project key.
- Recommended: restricted key with model request permissions for chat completions.
- Put the key in `service/.env` as `OPENAI_API_KEY`.

### 5. Create iCloud app-specific password

Use an app-specific password (not your Apple ID password):

- Open `appleid.apple.com`
- Sign in and ensure 2FA is enabled
- Go to **Sign-In and Security** -> **App-Specific Passwords**
- Generate a new password for Phishnet
- Paste it into `service/.env` as `IMAP_PASSWORD`
- Reminder: your username will be `YOU@icloud.com` (even if you use a custom domain name)

### 6. Verify service

Run one dry-run cycle:

```bash
bun run service:dry-run-once
```

## Development

### Common commands

From repo root:

```bash
bun run dev                  # API + UI (vite dev)
bun run web                  # API + UI preview (build + preview)
bun run start                # service poller + API + UI preview

bun run service:run-once
bun run service:dry-run-once
bun run service:start
bun run service:cleanup

bun run service:test
bun run service:check
bun run shared:check
bun run shared:build
bun run ui:lint
bun run ui:build

bun run launchd:install
bun run launchd:status
bun run launchd:uninstall
```

### Repository layout

- `service/` background mail processor (IMAP + OpenAI + SQLite)
- `api/` local read API for run/decision data
- `ui/` Mantine + React viewer
- `shared/` shared Zod schemas/types used by API and UI
- `scripts/launchd/` launchd install/status/uninstall scripts
- `docs/` operational and planning docs

### Data and logs

- SQLite DB (default): `service/data/email-filter.db`
- Launchd docs: `docs/launchd.md`
- Launchd logs (when enabled): `~/Library/Logs/phishnet.*.log`

---

Vibed with 😂 by [Rewdy](https://rewdy.lol)  
(Codex CLI with GPT 5.3-codex)
