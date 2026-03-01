import { z } from "zod";

const booleanFromUnknown = z.preprocess((value) => {
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

const stringArrayFromUnknown = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return value;
  },
  z.array(z.string().trim().min(1)),
);

export const NonSecretConfigSchema = z.object({
  imap: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    secure: z.boolean(),
    inboxMailbox: z.string(),
    junkMailbox: z.string(),
  }),
  model: z.object({
    provider: z.enum(["openai", "ollama"]),
    openaiModel: z.string(),
    ollamaBaseUrl: z.string(),
    ollamaModel: z.string(),
  }),
  filtering: z.object({
    profile: z.enum(["light", "balanced", "strict"]),
    confidenceThreshold: z.number().min(0).max(1),
    allowlistPatterns: z.array(z.string().trim().min(1)),
  }),
  runtime: z.object({
    pollIntervalMinutes: z.number().positive(),
    maxMessagesPerRun: z.number().int().positive(),
    dryRun: z.boolean(),
    maxClassificationFailures: z.number().int().positive(),
  }),
  storage: z.object({
    sqlitePath: z.string(),
    logRetentionDays: z.number().int().positive(),
  }),
  network: z.object({
    lanMode: z.boolean(),
    apiHost: z.string(),
    apiPort: z.number().int().positive(),
    uiHost: z.string(),
    uiPort: z.number().int().positive(),
    uiAllowedHosts: z.array(z.string().trim().min(1)),
  }),
});

const NonSecretConfigFileSchema = z.object({
  imap: z
    .object({
      host: z.string().optional(),
      port: z.coerce.number().int().positive().optional(),
      secure: booleanFromUnknown.optional(),
      inboxMailbox: z.string().optional(),
      junkMailbox: z.string().optional(),
    })
    .optional(),
  model: z
    .object({
      provider: z.enum(["openai", "ollama"]).optional(),
      openaiModel: z.string().optional(),
      ollamaBaseUrl: z.string().optional(),
      ollamaModel: z.string().optional(),
    })
    .optional(),
  filtering: z
    .object({
      profile: z.enum(["light", "balanced", "strict"]).optional(),
      confidenceThreshold: z.coerce.number().min(0).max(1).optional(),
      allowlistPatterns: stringArrayFromUnknown.optional(),
    })
    .optional(),
  runtime: z
    .object({
      pollIntervalMinutes: z.coerce.number().positive().optional(),
      maxMessagesPerRun: z.coerce.number().int().positive().optional(),
      dryRun: booleanFromUnknown.optional(),
      maxClassificationFailures: z.coerce.number().int().positive().optional(),
    })
    .optional(),
  storage: z
    .object({
      sqlitePath: z.string().optional(),
      logRetentionDays: z.coerce.number().int().positive().optional(),
    })
    .optional(),
  network: z
    .object({
      lanMode: booleanFromUnknown.optional(),
      apiHost: z.string().optional(),
      apiPort: z.coerce.number().int().positive().optional(),
      uiHost: z.string().optional(),
      uiPort: z.coerce.number().int().positive().optional(),
      uiAllowedHosts: stringArrayFromUnknown.optional(),
    })
    .optional(),
});

export type NonSecretConfig = z.infer<typeof NonSecretConfigSchema>;

export const defaultNonSecretConfig: NonSecretConfig = {
  imap: {
    host: "imap.mail.me.com",
    port: 993,
    secure: true,
    inboxMailbox: "INBOX",
    junkMailbox: "Junk",
  },
  model: {
    provider: "openai",
    openaiModel: "gpt-4.1-mini",
    ollamaBaseUrl: "http://127.0.0.1:11434",
    ollamaModel: "llama3.1:8b",
  },
  filtering: {
    profile: "light",
    confidenceThreshold: 0.6,
    allowlistPatterns: [],
  },
  runtime: {
    pollIntervalMinutes: 15,
    maxMessagesPerRun: 100,
    dryRun: true,
    maxClassificationFailures: 3,
  },
  storage: {
    sqlitePath: "./data/email-filter.db",
    logRetentionDays: 90,
  },
  network: {
    lanMode: false,
    apiHost: "127.0.0.1",
    apiPort: 8787,
    uiHost: "127.0.0.1",
    uiPort: 54321,
    uiAllowedHosts: [],
  },
};

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function parseNumberEnv(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseArrayEnv(value: string | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Returns the validated non-secret config by merging defaults, JSONC file values,
 * and env var overrides (env has highest precedence).
 */
export function resolveNonSecretConfig(
  fileConfig: unknown,
  env: Record<string, string | undefined>,
): NonSecretConfig {
  const parsedFile = NonSecretConfigFileSchema.parse(fileConfig ?? {});

  const merged: NonSecretConfig = {
    imap: {
      ...defaultNonSecretConfig.imap,
      ...parsedFile.imap,
    },
    model: {
      ...defaultNonSecretConfig.model,
      ...parsedFile.model,
    },
    filtering: {
      ...defaultNonSecretConfig.filtering,
      ...parsedFile.filtering,
    },
    runtime: {
      ...defaultNonSecretConfig.runtime,
      ...parsedFile.runtime,
    },
    storage: {
      ...defaultNonSecretConfig.storage,
      ...parsedFile.storage,
    },
    network: {
      ...defaultNonSecretConfig.network,
      ...parsedFile.network,
    },
  };

  merged.imap.host = env.IMAP_HOST ?? merged.imap.host;
  merged.imap.port = parseNumberEnv(env.IMAP_PORT) ?? merged.imap.port;
  merged.imap.secure = parseBooleanEnv(env.IMAP_SECURE) ?? merged.imap.secure;
  merged.imap.inboxMailbox = env.INBOX_MAILBOX ?? merged.imap.inboxMailbox;
  merged.imap.junkMailbox = env.JUNK_MAILBOX ?? merged.imap.junkMailbox;

  merged.model.provider =
    (env.MODEL_PROVIDER as NonSecretConfig["model"]["provider"] | undefined) ??
    merged.model.provider;
  merged.model.openaiModel = env.OPENAI_MODEL ?? merged.model.openaiModel;
  merged.model.ollamaBaseUrl =
    env.OLLAMA_BASE_URL ?? merged.model.ollamaBaseUrl;
  merged.model.ollamaModel = env.OLLAMA_MODEL ?? merged.model.ollamaModel;

  merged.filtering.profile =
    (env.FILTER_PROFILE as
      | NonSecretConfig["filtering"]["profile"]
      | undefined) ?? merged.filtering.profile;
  merged.filtering.confidenceThreshold =
    parseNumberEnv(env.CONFIDENCE_THRESHOLD) ??
    merged.filtering.confidenceThreshold;
  merged.filtering.allowlistPatterns =
    parseArrayEnv(env.ALLOWLIST_REGEX) ?? merged.filtering.allowlistPatterns;

  merged.runtime.pollIntervalMinutes =
    parseNumberEnv(env.POLL_INTERVAL_MINUTES) ??
    merged.runtime.pollIntervalMinutes;
  merged.runtime.maxMessagesPerRun =
    parseNumberEnv(env.MAX_MESSAGES_PER_RUN) ??
    merged.runtime.maxMessagesPerRun;
  merged.runtime.dryRun = parseBooleanEnv(env.DRY_RUN) ?? merged.runtime.dryRun;
  merged.runtime.maxClassificationFailures =
    parseNumberEnv(env.MAX_CLASSIFICATION_FAILURES) ??
    merged.runtime.maxClassificationFailures;

  merged.storage.sqlitePath = env.SQLITE_PATH ?? merged.storage.sqlitePath;
  merged.storage.logRetentionDays =
    parseNumberEnv(env.LOG_RETENTION_DAYS) ?? merged.storage.logRetentionDays;

  merged.network.lanMode =
    parseBooleanEnv(env.LAN_MODE) ?? merged.network.lanMode;
  merged.network.apiHost = env.PHISHNET_API_HOST ?? merged.network.apiHost;
  merged.network.apiPort =
    parseNumberEnv(env.PHISHNET_API_PORT) ?? merged.network.apiPort;
  merged.network.uiHost = env.PHISHNET_UI_HOST ?? merged.network.uiHost;
  merged.network.uiPort =
    parseNumberEnv(env.PHISHNET_UI_PORT) ?? merged.network.uiPort;
  merged.network.uiAllowedHosts =
    parseArrayEnv(env.PHISHNET_UI_ALLOWED_HOSTS) ??
    merged.network.uiAllowedHosts;

  if (merged.network.lanMode) {
    merged.network.apiHost = "0.0.0.0";
    merged.network.uiHost = "0.0.0.0";
  }

  return NonSecretConfigSchema.parse(merged);
}
