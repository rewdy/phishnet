# dream-weaver monorepo

## Workspace layout

- `service/`: IMAP + OpenAI email filtering service
- `api/`: reserved for future API project
- `ui/`: reserved for future UI project
- `docs/`: planning and operational docs

## Service quickstart

```bash
bun install
cp service/.env.template service/.env
```

Fill `service/.env` with real credentials, then run:

```bash
bun run service:dry-run-once
bun run service:run-once
bun run service:start
bun run service:cleanup
```
