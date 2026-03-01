# phishnet

Local TypeScript/Bun service that polls iCloud IMAP, classifies unread mail with OpenAI, and moves sexual-content messages to Junk.

## Setup

```bash
bun install
cp .env.template .env
cp config.sample.jsonc config.jsonc
```

Fill `.env` with secrets and `config.jsonc` with non-secret runtime options.

## Commands

```bash
bun run dry-run-once
bun run run-once
bun run start
bun run cleanup
```

- `dry-run-once`: evaluates mail and logs decisions without moving messages.
- `run-once`: executes one full cycle and applies move-to-junk actions.
- `start`: runs continuously on the configured polling interval.
- `cleanup`: removes DB records older than `LOG_RETENTION_DAYS`.

## Retry behavior

If OpenAI classification fails for a message:
- the message is retried on the next run,
- failure count increments,
- after `MAX_CLASSIFICATION_FAILURES` (default 3), message is marked `permanent_failure` and no longer retried.

## Notes

- v1 evaluates sender + subject + plain text body.
- Attachments are ignored.
- Default confidence threshold is `0.6`.
