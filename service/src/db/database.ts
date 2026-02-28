import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";

export function createDatabase(sqlitePath: string): Database {
  mkdirSync(dirname(sqlitePath), { recursive: true });
  return new Database(sqlitePath, { create: true, strict: true });
}

export function runMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imap_uid INTEGER NOT NULL UNIQUE,
      message_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      failure_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      last_attempt_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (status IN ('pending', 'processed', 'permanent_failure'))
    );

    CREATE INDEX IF NOT EXISTS idx_message_state_status ON message_state(status);

    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imap_uid INTEGER NOT NULL,
      run_id INTEGER,
      from_value TEXT NOT NULL,
      subject_text TEXT,
      subject_hash TEXT,
      body_hash TEXT,
      allowlist_matched INTEGER NOT NULL DEFAULT 0,
      model_action TEXT,
      model_confidence REAL,
      reason_code TEXT,
      final_action TEXT NOT NULL,
      dry_run INTEGER NOT NULL DEFAULT 0,
      error_type TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (final_action IN ('keep', 'junk', 'error', 'allowlist_skip'))
    );

    CREATE INDEX IF NOT EXISTS idx_decisions_uid ON decisions(imap_uid);
    CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at);

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      messages_scanned INTEGER NOT NULL DEFAULT 0,
      messages_classified INTEGER NOT NULL DEFAULT 0,
      messages_moved INTEGER NOT NULL DEFAULT 0,
      messages_failed INTEGER NOT NULL DEFAULT 0,
      CHECK (status IN ('success', 'partial_failure', 'failure'))
    );

    CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);
  `);

  const decisionColumns = db
    .query("PRAGMA table_info(decisions)")
    .all() as Array<{ name: string }>;
  const hasSubjectText = decisionColumns.some((column) => column.name === "subject_text");
  if (!hasSubjectText) {
    db.exec("ALTER TABLE decisions ADD COLUMN subject_text TEXT;");
  }
}
