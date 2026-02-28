import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import type { ClassificationResult, FinalAction, MessageState } from "../types";

function nowIso(): string {
  return new Date().toISOString();
}

export class StateRepository {
  constructor(private readonly db: Database) {}

  getMessageState(imapUid: number): MessageState | null {
    const query = this.db.query(
      `SELECT imap_uid, message_id, status, failure_count, last_error, last_attempt_at
       FROM message_state
       WHERE imap_uid = ?1`,
    );

    const row = query.get(imapUid) as {
      imap_uid: number;
      message_id: string | null;
      status: "pending" | "processed" | "permanent_failure";
      failure_count: number;
      last_error: string | null;
      last_attempt_at: string | null;
    } | null;

    if (!row) {
      return null;
    }

    return {
      imapUid: row.imap_uid,
      messageId: row.message_id ?? undefined,
      status: row.status,
      failureCount: row.failure_count,
      lastError: row.last_error ?? undefined,
      lastAttemptAt: row.last_attempt_at ?? undefined,
    };
  }

  ensurePending(imapUid: number, messageId?: string): void {
    this.db
      .query(
        `INSERT INTO message_state (imap_uid, message_id, status, failure_count, last_attempt_at, updated_at)
         VALUES (?1, ?2, 'pending', 0, ?3, ?3)
         ON CONFLICT(imap_uid) DO UPDATE SET
           message_id = COALESCE(excluded.message_id, message_state.message_id),
           last_attempt_at = excluded.last_attempt_at,
           updated_at = excluded.updated_at`,
      )
      .run(imapUid, messageId ?? null, nowIso());
  }

  markProcessed(imapUid: number): void {
    const timestamp = nowIso();
    this.db
      .query(
        `UPDATE message_state
         SET status = 'processed',
             last_error = NULL,
             updated_at = ?2,
             last_attempt_at = ?2
         WHERE imap_uid = ?1`,
      )
      .run(imapUid, timestamp);
  }

  recordFailure(
    imapUid: number,
    errorMessage: string,
    maxFailures: number,
  ): { failureCount: number; permanentFailure: boolean } {
    const current = this.getMessageState(imapUid);
    const nextFailureCount = (current?.failureCount ?? 0) + 1;
    const permanentFailure = nextFailureCount >= maxFailures;
    const status = permanentFailure ? "permanent_failure" : "pending";
    const timestamp = nowIso();

    this.db
      .query(
        `INSERT INTO message_state (imap_uid, status, failure_count, last_error, last_attempt_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)
         ON CONFLICT(imap_uid) DO UPDATE SET
           status = excluded.status,
           failure_count = excluded.failure_count,
           last_error = excluded.last_error,
           last_attempt_at = excluded.last_attempt_at,
           updated_at = excluded.updated_at`,
      )
      .run(imapUid, status, nextFailureCount, errorMessage, timestamp);

    return { failureCount: nextFailureCount, permanentFailure };
  }

  canProcess(imapUid: number): boolean {
    const state = this.getMessageState(imapUid);
    if (!state) {
      return true;
    }

    return state.status === "pending";
  }

  pruneOlderThan(days: number): {
    stateRowsDeleted: number;
    decisionsRowsDeleted: number;
    runsRowsDeleted: number;
  } {
    const cutoff = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const stateResult = this.db
      .query("DELETE FROM message_state WHERE updated_at < ?1")
      .run(cutoff);
    const decisionResult = this.db
      .query("DELETE FROM decisions WHERE created_at < ?1")
      .run(cutoff);
    const runResult = this.db
      .query("DELETE FROM runs WHERE started_at < ?1")
      .run(cutoff);

    return {
      stateRowsDeleted: stateResult.changes,
      decisionsRowsDeleted: decisionResult.changes,
      runsRowsDeleted: runResult.changes,
    };
  }
}

export class RunsRepository {
  constructor(private readonly db: Database) {}

  startRun(): number {
    const result = this.db.query("INSERT INTO runs DEFAULT VALUES").run();
    return Number(result.lastInsertRowid);
  }

  completeRun(
    runId: number,
    input: {
      status: "success" | "partial_failure" | "failure";
      messagesScanned: number;
      messagesClassified: number;
      messagesMoved: number;
      messagesFailed: number;
    },
  ): void {
    this.db
      .query(
        `UPDATE runs
         SET completed_at = CURRENT_TIMESTAMP,
             status = ?2,
             messages_scanned = ?3,
             messages_classified = ?4,
             messages_moved = ?5,
             messages_failed = ?6
         WHERE id = ?1`,
      )
      .run(
        runId,
        input.status,
        input.messagesScanned,
        input.messagesClassified,
        input.messagesMoved,
        input.messagesFailed,
      );
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export class DecisionsRepository {
  constructor(private readonly db: Database) {}

  insertDecision(input: {
    runId: number;
    uid: number;
    fromValue: string;
    subject: string;
    bodyText: string;
    allowlistMatched: boolean;
    classification?: ClassificationResult;
    finalAction: FinalAction;
    dryRun: boolean;
    errorType?: string;
    errorMessage?: string;
  }): void {
    this.db
      .query(
        `INSERT INTO decisions (
          imap_uid,
          run_id,
          from_value,
          subject_text,
          subject_hash,
          body_hash,
          allowlist_matched,
          model_action,
          model_confidence,
          reason_code,
          final_action,
          dry_run,
          error_type,
          error_message
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
      )
      .run(
        input.uid,
        input.runId,
        input.fromValue,
        input.subject,
        digest(input.subject),
        digest(input.bodyText),
        input.allowlistMatched ? 1 : 0,
        input.classification?.action ?? null,
        input.classification?.confidence ?? null,
        input.classification?.reasonCode ?? null,
        input.finalAction,
        input.dryRun ? 1 : 0,
        input.errorType ?? null,
        input.errorMessage ?? null,
      );
  }
}
