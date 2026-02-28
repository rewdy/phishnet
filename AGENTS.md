# AGENTS.md

This file is a practical guide for future coding agents working in this repository.

## Project Summary

Phishnet is a local-first iCloud email filtering stack.

Core behavior:
- Poll unread iCloud IMAP messages on an interval.
- Classify with OpenAI.
- Move matching messages to Junk.
- Persist run/decision/state data in SQLite.
- Provide local API + UI to inspect results.

This repo is a Bun monorepo with 4 workspaces:
- `service/` mail processor and scheduler
- `api/` local read API over the service SQLite DB
- `ui/` local web UI (Mantine + React)
- `shared/` shared Zod schemas/types used by API and UI

## Repo Layout

- `README.md`: project overview + day-to-day dev commands
- `INSTALL.md`: setup instructions (credentials, launchd, install/uninstall)
- `docs/`: planning docs only (do not place installation docs here)
- `scripts/launchd/`: launchd install/restart/status/uninstall scripts
- `phishnet.png`, `phishnet-lg.png`: project branding assets

## Current Runtime Topology

From repo root:
- `bun run start`
  - Runs `service:start` + `web` in parallel.
  - `web` runs `api:dev` and `ui:serve`.
- UI preview runs on fixed port `54321` (localhost) via:
  - `ui:preview`: `vite preview --host 127.0.0.1 --port 54321 --strictPort`
- API default port is `8787` in `api/src/index.ts` (`PORT` override supported).

## Formatting / Linting

Biome is the formatting/lint source of truth.

Root scripts:
- `bun run format` -> `biome format --write .`
- `bun run check` -> `biome check .`
- `bun run check:fix` -> `biome check --write .`

Run `bun run check` before committing.

## Workspace Commands

### Root
- `bun run dev` -> API + UI dev server
- `bun run web` -> API + UI preview
- `bun run start` -> service + API + UI preview
- `bun run launchd:install`
- `bun run launchd:restart`
- `bun run launchd:status`
- `bun run launchd:uninstall`

### Service (`service/`)
- `bun run service:dry-run-once`
- `bun run service:run-once`
- `bun run service:start`
- `bun run service:cleanup`
- `bun run service:test`
- `bun run service:check`

### Shared (`shared/`)
- `bun run shared:check`
- `bun run shared:build`

### UI (`ui/`)
- `bun run ui:dev`
- `bun run ui:build`
- `bun run ui:lint`

## Key Configuration

Primary env file is `service/.env`.
Template: `service/.env.template`.

Important variables:
- `IMAP_USER`, `IMAP_PASSWORD` (iCloud app-specific password)
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `FILTER_PROFILE`:
  - `light`: sexual only
  - `balanced`: sexual + spam
  - `strict`: sexual + spam + annoyances
- `POLL_INTERVAL_MINUTES` (default 15)
- `CONFIDENCE_THRESHOLD` (default 0.6)
- `DRY_RUN`
- `SQLITE_PATH` (default `./data/email-filter.db` inside `service/`)

## Data / Persistence Notes

Service DB tables (created in `service/src/db/database.ts`):
- `runs`
- `decisions`
- `message_state`

Notable behavior:
- Retry classification failures up to `MAX_CLASSIFICATION_FAILURES` (default 3).
- Then mark message `permanent_failure`.
- `decisions.subject_text` stores readable subject text.

Retention:
- A cleanup command exists (`service:cleanup`) and launchd cleanup job is available.
- There is no guaranteed always-on TTL enforcement unless cleanup is run.

## API / UI Contract Notes

Shared schemas live in `shared/src/index.ts`.
Use them for API responses and UI parsing.

Current API endpoints:
- `GET /health`
- `GET /api/runs`
- `GET /api/decisions`
- `GET /api/stats`

UI expectations:
- Dashboard title: "Phishnet Stats"
- Includes logo at `ui/src/assets/phishnet-logo.png`
- Displays stats widgets (`filtered today`, `all time filtered`, `total runs`)
- Shows `Last run` timestamp near header
- Uses React Query for fetch + periodic refresh

## Launchd Operations

Use scripts instead of committing machine-specific plist files:
- `scripts/launchd/install.sh`
- `scripts/launchd/restart.sh`
- `scripts/launchd/status.sh`
- `scripts/launchd/uninstall.sh`

These scripts generate user-specific launch agents and manage bootstrap/teardown.

## Agent Working Agreements

- Keep installation guidance in `INSTALL.md`, not `docs/`.
- Keep `docs/` for planning and design docs.
- Prefer shared schemas for API/UI contract changes.
- When changing classification behavior, update:
  - `service/src/classifier/openai.ts`
  - env template/example
  - `INSTALL.md` if config surface changes.
- Avoid committing secrets or real credentials.
- Run at least:
  - `bun run check`
  - relevant workspace build/test commands
  before finalizing.

## Safe Change Checklist (Suggested)

1. Update code + configs/templates together.
2. Run `bun run check`.
3. Run affected workspace checks/tests/builds.
4. Verify scripts in `package.json` still reflect expected behavior.
5. Update docs (`README.md` / `INSTALL.md`) for user-facing changes.
