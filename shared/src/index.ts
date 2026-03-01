import { z } from "zod";

export const pageSizeValues = [25, 50, 75, 100] as const;

export const FinalActionSchema = z.enum([
  "junk",
  "keep",
  "error",
  "allowlist_skip",
]);
export const ModelActionSchema = z.enum(["junk", "keep"]);
export const RunStatusSchema = z.enum([
  "success",
  "partial_failure",
  "failure",
]);

export const PaginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .refine(
      (value) =>
        pageSizeValues.includes(value as (typeof pageSizeValues)[number]),
      {
        message: "limit must be one of 25, 50, 75, 100",
      },
    )
    .default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const RunsQuerySchema = PaginationQuerySchema;

export const DecisionsQuerySchema = PaginationQuerySchema.extend({
  finalAction: FinalActionSchema.optional(),
  from: z.string().trim().min(1).optional(),
  hasError: z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["1", "true", "yes"].includes(normalized)) return true;
      if (["0", "false", "no"].includes(normalized)) return false;
    }
    return value;
  }, z.boolean().optional()),
});

export const RunSummarySchema = z.object({
  id: z.number().int(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  status: RunStatusSchema,
  messagesScanned: z.number().int(),
  messagesClassified: z.number().int(),
  messagesMoved: z.number().int(),
  messagesFailed: z.number().int(),
});

export const DecisionRowSchema = z.object({
  id: z.number().int(),
  imapUid: z.number().int(),
  runId: z.number().int().nullable(),
  fromValue: z.string(),
  subjectText: z.string().nullable(),
  allowlistMatched: z.boolean(),
  modelAction: ModelActionSchema.nullable(),
  modelConfidence: z.number().nullable(),
  reasonCode: z.string().nullable(),
  finalAction: FinalActionSchema,
  dryRun: z.boolean(),
  errorType: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
});

export const RunsResponseSchema = z.object({
  items: z.array(RunSummarySchema),
  total: z.number().int().min(0),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const DecisionsResponseSchema = z.object({
  items: z.array(DecisionRowSchema),
  total: z.number().int().min(0),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const StatsResponseSchema = z.object({
  filteredToday: z.number().int().min(0),
  allTimeFiltered: z.number().int().min(0),
  totalRuns: z.number().int().min(0),
  totalMessagesScanned: z.number().int().min(0),
  lastRunAt: z.string().nullable(),
});

export type FinalAction = z.infer<typeof FinalActionSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export type RunsQuery = z.infer<typeof RunsQuerySchema>;
export type DecisionsQuery = z.infer<typeof DecisionsQuerySchema>;
export type RunSummary = z.infer<typeof RunSummarySchema>;
export type DecisionRow = z.infer<typeof DecisionRowSchema>;
export type RunsResponse = z.infer<typeof RunsResponseSchema>;
export type DecisionsResponse = z.infer<typeof DecisionsResponseSchema>;
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
