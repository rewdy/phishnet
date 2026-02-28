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

See [INSTALL.md](./INSTALL.md) for full setup instructions:
- prerequisites
- OpenAI key setup
- iCloud app-specific password setup
- launchd install/uninstall

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
- `docs/` planning docs

### Data and logs

- SQLite DB (default): `service/data/email-filter.db`
- Installation/launchd docs: `INSTALL.md`
- Launchd logs (when enabled): `~/Library/Logs/phishnet.*.log`

---

Vibed with 😂 by [Rewdy](https://rewdy.lol)  
(Codex CLI with GPT 5.3-codex)
