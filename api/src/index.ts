import { Database } from "bun:sqlite";
import {
  type DecisionRow,
  type DecisionsQuery,
  DecisionsQuerySchema,
  DecisionsResponseSchema,
  type RunSummary,
  type RunsQuery,
  RunsQuerySchema,
  RunsResponseSchema,
  StatsResponseSchema,
} from "@phishnet/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();
const port = Number(process.env.PORT ?? 8787);
const sqlitePath =
  process.env.SERVICE_DB_PATH ?? "../service/data/email-filter.db";
const db = new Database(sqlitePath, { create: false, strict: true });
const decisionColumns = db
  .query("PRAGMA table_info(decisions)")
  .all() as Array<{ name: string }>;
const hasSubjectText = decisionColumns.some(
  (column) => column.name === "subject_text",
);
const subjectTextSelect = hasSubjectText
  ? "subject_text"
  : "NULL AS subject_text";

app.use("*", cors());

function parseQuery<T>(
  schema: {
    safeParse: (value: unknown) => {
      success: boolean;
      data?: T;
      error?: unknown;
    };
  },
  raw: Record<string, string>,
) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }

  return parsed.data as T;
}

app.get("/health", (c) =>
  c.json({ ok: true, service: "api", dbPath: sqlitePath }),
);
app.get("/", (c) => c.json({ ok: true, service: "api" }));

app.get("/api/runs", (c) => {
  const parsed = parseQuery<RunsQuery>(RunsQuerySchema, c.req.query());
  if (!parsed) {
    return c.json({ error: "Invalid query params" }, 400);
  }

  const rows = db
    .query(
      `SELECT
        id,
        started_at,
        completed_at,
        status,
        messages_scanned,
        messages_classified,
        messages_moved,
        messages_failed
      FROM runs
      ORDER BY id DESC
      LIMIT ?1 OFFSET ?2`,
    )
    .all(parsed.limit, parsed.offset) as Array<{
    id: number;
    started_at: string;
    completed_at: string | null;
    status: "success" | "partial_failure" | "failure";
    messages_scanned: number;
    messages_classified: number;
    messages_moved: number;
    messages_failed: number;
  }>;

  const items: RunSummary[] = rows.map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    messagesScanned: row.messages_scanned,
    messagesClassified: row.messages_classified,
    messagesMoved: row.messages_moved,
    messagesFailed: row.messages_failed,
  }));

  const totalRow = db.query("SELECT COUNT(*) as count FROM runs").get() as {
    count: number;
  };

  const response = RunsResponseSchema.parse({
    items,
    total: Number(totalRow.count),
    limit: parsed.limit,
    offset: parsed.offset,
  });

  return c.json(response);
});

function buildDecisionWhereClause(query: DecisionsQuery): {
  clause: string;
  params: string[];
} {
  const conditions: string[] = [];
  const params: string[] = [];

  if (query.finalAction) {
    conditions.push("final_action = ?");
    params.push(query.finalAction);
  }

  if (query.from) {
    conditions.push("LOWER(from_value) LIKE LOWER(?)");
    params.push(`%${query.from}%`);
  }

  if (query.hasError === true) {
    conditions.push("error_message IS NOT NULL");
  }

  if (query.hasError === false) {
    conditions.push("error_message IS NULL");
  }

  if (conditions.length === 0) {
    return { clause: "", params };
  }

  return {
    clause: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

app.get("/api/decisions", (c) => {
  const parsed = parseQuery<DecisionsQuery>(
    DecisionsQuerySchema,
    c.req.query(),
  );
  if (!parsed) {
    return c.json({ error: "Invalid query params" }, 400);
  }

  const { clause, params } = buildDecisionWhereClause(parsed);

  const rows = db
    .query(
      `SELECT
        id,
        imap_uid,
        run_id,
        from_value,
        ${subjectTextSelect},
        allowlist_matched,
        model_action,
        model_confidence,
        reason_code,
        final_action,
        dry_run,
        error_type,
        error_message,
        created_at
      FROM decisions
      ${clause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?`,
    )
    .all(...params, parsed.limit, parsed.offset) as Array<{
    id: number;
    imap_uid: number;
    run_id: number | null;
    from_value: string;
    subject_text: string | null;
    allowlist_matched: number;
    model_action: "junk" | "keep" | null;
    model_confidence: number | null;
    reason_code: string | null;
    final_action: "junk" | "keep" | "error" | "allowlist_skip";
    dry_run: number;
    error_type: string | null;
    error_message: string | null;
    created_at: string;
  }>;

  const items: DecisionRow[] = rows.map((row) => ({
    id: row.id,
    imapUid: row.imap_uid,
    runId: row.run_id,
    fromValue: row.from_value,
    subjectText: row.subject_text,
    allowlistMatched: row.allowlist_matched === 1,
    modelAction: row.model_action,
    modelConfidence: row.model_confidence,
    reasonCode: row.reason_code,
    finalAction: row.final_action,
    dryRun: row.dry_run === 1,
    errorType: row.error_type,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }));

  const totalRow = db
    .query(`SELECT COUNT(*) as count FROM decisions ${clause}`)
    .get(...params) as { count: number };

  const response = DecisionsResponseSchema.parse({
    items,
    total: Number(totalRow.count),
    limit: parsed.limit,
    offset: parsed.offset,
  });

  return c.json(response);
});

app.get("/api/stats", (c) => {
  const filteredTodayRow = db
    .query(
      `SELECT COUNT(*) as count
     FROM decisions
     WHERE final_action = 'junk'
       AND date(created_at, 'localtime') = date('now', 'localtime')`,
    )
    .get() as { count: number };

  const allTimeFilteredRow = db
    .query(
      `SELECT COUNT(*) as count
     FROM decisions
     WHERE final_action = 'junk'`,
    )
    .get() as { count: number };

  const totalRunsRow = db.query("SELECT COUNT(*) as count FROM runs").get() as {
    count: number;
  };

  const lastRunRow = db
    .query("SELECT started_at FROM runs ORDER BY started_at DESC LIMIT 1")
    .get() as { started_at: string } | null;

  const response = StatsResponseSchema.parse({
    filteredToday: Number(filteredTodayRow.count),
    allTimeFiltered: Number(allTimeFilteredRow.count),
    totalRuns: Number(totalRunsRow.count),
    lastRunAt: lastRunRow?.started_at ?? null,
  });

  return c.json(response);
});

export default {
  port,
  fetch: app.fetch,
};
