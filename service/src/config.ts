import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const schema = z.object({
  IMAP_HOST: z.string().default("imap.mail.me.com"),
  IMAP_PORT: z.coerce.number().int().positive().default(993),
  IMAP_SECURE: booleanFromEnv.default(true),
  IMAP_USER: z.string().min(1),
  IMAP_PASSWORD: z.string().min(1),
  INBOX_MAILBOX: z.string().default("INBOX"),
  JUNK_MAILBOX: z.string().default("Junk"),
  MODEL_PROVIDER: z.enum(["openai", "ollama"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("llama3.1:8b"),
  FILTER_PROFILE: z.enum(["light", "balanced", "strict"]).default("light"),
  POLL_INTERVAL_MINUTES: z.coerce.number().positive().default(15),
  CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
  MAX_MESSAGES_PER_RUN: z.coerce.number().int().positive().default(100),
  DRY_RUN: booleanFromEnv.default(true),
  SQLITE_PATH: z.string().default("./data/email-filter.db"),
  MAX_CLASSIFICATION_FAILURES: z.coerce.number().int().positive().default(3),
  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  ALLOWLIST_REGEX: z.string().optional(),
});

export interface AppConfig {
  imap: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    inboxMailbox: string;
    junkMailbox: string;
  };
  modelProvider: "openai" | "ollama";
  filterProfile: "light" | "balanced" | "strict";
  openai: {
    apiKey: string;
    model: string;
  };
  ollama: {
    baseUrl: string;
    model: string;
  };
  pollIntervalMinutes: number;
  confidenceThreshold: number;
  maxMessagesPerRun: number;
  dryRun: boolean;
  sqlitePath: string;
  maxClassificationFailures: number;
  logRetentionDays: number;
  allowlistPatterns: string[];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${errors}`);
  }

  const provider = parsed.data.MODEL_PROVIDER;
  if (provider === "openai" && !parsed.data.OPENAI_API_KEY) {
    throw new Error(
      "Invalid configuration: OPENAI_API_KEY is required when MODEL_PROVIDER=openai",
    );
  }

  const allowlistPatterns = (parsed.data.ALLOWLIST_REGEX ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    imap: {
      host: parsed.data.IMAP_HOST,
      port: parsed.data.IMAP_PORT,
      secure: parsed.data.IMAP_SECURE,
      user: parsed.data.IMAP_USER,
      password: parsed.data.IMAP_PASSWORD,
      inboxMailbox: parsed.data.INBOX_MAILBOX,
      junkMailbox: parsed.data.JUNK_MAILBOX,
    },
    modelProvider: provider,
    filterProfile: parsed.data.FILTER_PROFILE,
    openai: {
      apiKey: parsed.data.OPENAI_API_KEY ?? "",
      model: parsed.data.OPENAI_MODEL,
    },
    ollama: {
      baseUrl: parsed.data.OLLAMA_BASE_URL,
      model: parsed.data.OLLAMA_MODEL,
    },
    pollIntervalMinutes: parsed.data.POLL_INTERVAL_MINUTES,
    confidenceThreshold: parsed.data.CONFIDENCE_THRESHOLD,
    maxMessagesPerRun: parsed.data.MAX_MESSAGES_PER_RUN,
    dryRun: parsed.data.DRY_RUN,
    sqlitePath: parsed.data.SQLITE_PATH,
    maxClassificationFailures: parsed.data.MAX_CLASSIFICATION_FAILURES,
    logRetentionDays: parsed.data.LOG_RETENTION_DAYS,
    allowlistPatterns,
  };
}
