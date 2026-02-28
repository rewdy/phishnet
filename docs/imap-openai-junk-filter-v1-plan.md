# IMAP + OpenAI Junk Filter (v1) Plan

## 1. Purpose
Build a local service (running on an always-on Mac mini) that polls an iCloud mailbox over IMAP every configurable interval (default: 30 minutes), evaluates unread incoming messages for sexual content using the OpenAI API, and moves qualifying messages to iCloud Junk.

Primary goals:
- Keep implementation simple and reliable for single-account local use.
- Support safe rollout with dry-run and clear audit logs.
- Handle transient failures without losing messages.

## 2. Locked v1 Requirements

### 2.1 Runtime and stack
- Runtime: Node.js + TypeScript
- Package manager/tooling: Bun
- Host: always-on Mac mini

### 2.2 Mailbox integration
- Provider: iCloud IMAP (`imap.mail.me.com:993`, TLS)
- Folder source: `INBOX`
- Folder destination: iCloud `Junk` mailbox (configurable name)
- Message scope: unread messages only

### 2.3 Content examined
- Include `from` sender details
- Include `subject`
- Include text body
- Ignore attachments in v1

### 2.4 OpenAI decisioning
- Structured output schema:
  - `action`: `junk | keep`
  - `confidence`: `0..1`
  - `reason_code`: short enum/string code
- Default threshold: `0.6`
- Move to Junk when:
  - `action = junk` and `confidence >= threshold`

### 2.5 Sender allowlist pre-filter
- Configurable regex allowlist (initially empty)
- Match against sender/address/domain fields
- If matched: skip OpenAI classification, keep message, log allowlist skip

### 2.6 Failure and retry policy (confirmed update)
If OpenAI/classification fails for a message:
- Log failure (`uid`, error type/message, timestamp)
- Do not mark message as processed
- Retry next polling run
- Track per-message failure count
- After 3 failures:
  - Mark `permanent_failure`
  - Stop retrying that message
  - Keep message in Inbox
  - Retain audit trail

### 2.7 State, logging, and retention
- Persist message processing state (UID-based)
- Persist decision/audit logs
- Retain logs and state records for 90 days
- Cleanup task removes old records daily

### 2.8 Safety and operability
- `dryRun` mode (must support one-shot execution)
- `run-once` command for validation/tuning
- Polling loop command for continuous service
- On non-classification errors (IMAP/network), log and continue next cycle without crashing loop

## 3. Proposed Data Model (SQLite)

### 3.1 `message_state`
Tracks retry and terminal state per message.
- `id` (pk)
- `imap_uid` (unique, indexed)
- `message_id` (nullable)
- `status` (`pending`, `processed`, `permanent_failure`)
- `failure_count` (int, default 0)
- `last_error` (nullable text)
- `last_attempt_at` (datetime)
- `created_at` (datetime)
- `updated_at` (datetime)

### 3.2 `decisions`
Audit records for each processing attempt.
- `id` (pk)
- `imap_uid` (indexed)
- `run_id` (indexed)
- `from_value` (text)
- `subject_hash` (text)
- `body_hash` (text)
- `allowlist_matched` (bool)
- `model_action` (nullable text)
- `model_confidence` (nullable real)
- `reason_code` (nullable text)
- `final_action` (`keep`, `junk`, `error`, `allowlist_skip`)
- `dry_run` (bool)
- `error_type` (nullable text)
- `error_message` (nullable text)
- `created_at` (datetime)

### 3.3 `runs`
Tracks each poll cycle.
- `id` (pk)
- `started_at` (datetime)
- `completed_at` (datetime)
- `status` (`success`, `partial_failure`, `failure`)
- `messages_scanned` (int)
- `messages_classified` (int)
- `messages_moved` (int)
- `messages_failed` (int)

## 4. Module Layout
- `src/config.ts` - env parsing and validation
- `src/logger.ts` - structured logger
- `src/db/` - sqlite connection + migrations + queries
- `src/imap/client.ts` - IMAP connect/search/fetch/move
- `src/classifier/openai.ts` - OpenAI structured classification client
- `src/filter/allowlist.ts` - regex allowlist matcher
- `src/pipeline/process-message.ts` - per-message orchestration
- `src/jobs/run-once.ts` - single execution unit
- `src/jobs/poller.ts` - interval scheduler
- `src/jobs/cleanup.ts` - 90-day retention cleanup
- `src/cli.ts` - command entrypoint

## 5. Commands (v1)
- `bun run start` -> continuous poller
- `bun run run-once` -> one cycle, honors config
- `bun run dry-run-once` -> one cycle with dry-run forced true
- `bun run cleanup` -> retention cleanup task

## 6. Up-to-4-Agent Implementation Plan

### 6.1 Workstream overview
Parallelize by stable boundaries: config/db, IMAP, classifier/pipeline, and ops/tests/docs.

- Agent 1: Foundation + config + DB schema/state lifecycle
- Agent 2: IMAP integration (iCloud-specific behavior)
- Agent 3: OpenAI classification + decision pipeline (threshold/retry/allowlist)
- Agent 4: CLI/jobs/logging/tests/docs/service packaging

### 6.2 Agent assignments and deliverables

#### Agent 1: Foundation/State
Deliverables:
- Bun + TypeScript project scaffold
- Config schema (`src/config.ts`) and env contract
- SQLite setup, migrations, and repository methods for:
  - message state upsert/read/update
  - decision insert
  - run lifecycle insert/update
- Retention delete queries (90 days)

Acceptance checks:
- Migrations run locally
- State transitions enforce retry/permanent failure semantics
- Config validation fails fast on missing required secrets

#### Agent 2: IMAP
Deliverables:
- IMAP client wrapper:
  - connect/auth to iCloud
  - search unread in INBOX
  - fetch sender/subject/plain-text body + UID + message-id
  - move message to Junk by UID
- Resilience:
  - reconnect/backoff behavior
  - mailbox naming configurable

Acceptance checks:
- Dry-run fetches candidate messages without mutation
- Move action correctly targets iCloud Junk
- Handles empty mailbox and large unread sets safely (batching)

#### Agent 3: Classification + Pipeline
Deliverables:
- OpenAI client with structured output parsing
- Allowlist regex pre-filter
- Message processor orchestration:
  - read message state
  - skip processed/permanent failures
  - run allowlist or classify
  - apply threshold 0.6
  - execute keep/junk action via IMAP adapter
  - update state + decision logs
  - increment failure_count on classification errors
  - set permanent_failure at 3 failures

Acceptance checks:
- Unit tests for threshold and retry logic
- Unit tests for allowlist matching behavior
- Classification parse failures handled as retryable failures

#### Agent 4: Jobs/CLI/QA/Ops
Deliverables:
- CLI entrypoint and commands: `start`, `run-once`, `dry-run-once`, `cleanup`
- Polling scheduler (default 30 min)
- Run-level metrics/log summaries
- Tests (integration-style with mocks/fakes)
- `docs/` operational guide and `launchd` plist template

Acceptance checks:
- `run-once` returns non-zero on fatal setup errors only
- Poller survives transient run failures
- Dry-run command never moves mail

### 6.3 Dependency graph and merge order
1. Agent 1 first: establish config + DB contracts.
2. Agent 2 and Agent 3 in parallel after Agent 1 contracts are stable.
3. Agent 4 integrates once command interfaces from Agents 2/3 settle.
4. Final integration pass with full end-to-end dry-run validation.

### 6.4 Contract-first interfaces (to reduce merge conflicts)
Define early and keep stable:
- `ImapClient` interface:
  - `listUnread(limit?: number)`
  - `moveToJunk(uid: string)`
- `Classifier` interface:
  - `classify(input) -> { action, confidence, reason_code }`
- `StateRepository` interface:
  - `getState(uid)` / `recordAttempt(...)` / `markProcessed(uid)` / `markPermanentFailure(uid)`

### 6.5 Branch strategy
- `feature/agent1-foundation-db`
- `feature/agent2-imap`
- `feature/agent3-classifier-pipeline`
- `feature/agent4-cli-jobs-ops`
- Integration branch: `feature/v1-integration`

PR policy:
- Keep PRs scoped to one workstream
- Merge Agent 1 first
- Rebase remaining branches on main after Agent 1 merge

### 6.6 Test plan
- Unit tests:
  - allowlist regex matching
  - threshold actioning
  - retry counter and permanent failure transition
- Integration tests (mock IMAP + mock OpenAI):
  - unread fetch -> classify -> junk/keep
  - classification transient failure retried across runs
  - failure_count reaches 3 -> permanent_failure
  - dry-run mode logs action without move
- Manual acceptance:
  - run-once dry-run against real iCloud mailbox
  - confirm no message mutation in dry-run
  - enable non-dry-run and verify Junk moves

### 6.7 Milestones
1. M1: Foundation ready (config/db/logging)
2. M2: IMAP + classifier/pipeline merged
3. M3: CLI/poller/cleanup operational
4. M4: End-to-end dry-run validation on Mac mini
5. M5: Controlled live rollout (non-dry-run)

## 7. Deferred to Post-v1
- Attachments/content extraction
- Multi-account support
- UI/dashboard
- Manual review folder routing
- Advanced sender reputation features
- OAuth2 mailbox auth migration
