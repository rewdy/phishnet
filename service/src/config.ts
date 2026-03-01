import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type NonSecretConfig, resolveNonSecretConfig } from "@phishnet/shared";
import { parse as parseJsonc } from "jsonc-parser";
import { z } from "zod";

const secretSchema = z.object({
  IMAP_USER: z.string().min(1),
  IMAP_PASSWORD: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
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

function parseConfigFile(configPath: string): unknown {
  try {
    const raw = readFileSync(configPath, "utf8");
    const errors: Array<{
      error: number;
      offset: number;
      length: number;
    }> = [];
    const parsed = parseJsonc(raw, errors, {
      allowTrailingComma: true,
      disallowComments: false,
    });

    if (errors.length > 0) {
      throw new Error(
        errors
          .map(
            (entry) =>
              `code=${entry.error} at offset=${entry.offset} length=${entry.length}`,
          )
          .join("; "),
      );
    }

    return parsed ?? {};
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    const errText = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid configuration file at ${configPath}: ${errText}`);
  }
}

function resolveNonSecret(env: NodeJS.ProcessEnv): NonSecretConfig {
  const configPath = env.PHISHNET_CONFIG_PATH
    ? env.PHISHNET_CONFIG_PATH
    : join(import.meta.dir, "..", "config.jsonc");
  const fileConfig = parseConfigFile(configPath);
  return resolveNonSecretConfig(fileConfig, env);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nonSecretConfig = resolveNonSecret(env);
  const parsedSecrets = secretSchema.safeParse(env);
  if (!parsedSecrets.success) {
    const errors = parsedSecrets.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid configuration (env secrets): ${errors}`);
  }

  const provider = nonSecretConfig.model.provider;
  if (provider === "openai" && !parsedSecrets.data.OPENAI_API_KEY) {
    throw new Error(
      "Invalid configuration: OPENAI_API_KEY is required when model.provider=openai",
    );
  }

  return {
    imap: {
      host: nonSecretConfig.imap.host,
      port: nonSecretConfig.imap.port,
      secure: nonSecretConfig.imap.secure,
      user: parsedSecrets.data.IMAP_USER,
      password: parsedSecrets.data.IMAP_PASSWORD,
      inboxMailbox: nonSecretConfig.imap.inboxMailbox,
      junkMailbox: nonSecretConfig.imap.junkMailbox,
    },
    modelProvider: provider,
    filterProfile: nonSecretConfig.filtering.profile,
    openai: {
      apiKey: parsedSecrets.data.OPENAI_API_KEY ?? "",
      model: nonSecretConfig.model.openaiModel,
    },
    ollama: {
      baseUrl: nonSecretConfig.model.ollamaBaseUrl,
      model: nonSecretConfig.model.ollamaModel,
    },
    pollIntervalMinutes: nonSecretConfig.runtime.pollIntervalMinutes,
    confidenceThreshold: nonSecretConfig.filtering.confidenceThreshold,
    maxMessagesPerRun: nonSecretConfig.runtime.maxMessagesPerRun,
    dryRun: nonSecretConfig.runtime.dryRun,
    sqlitePath: nonSecretConfig.storage.sqlitePath,
    maxClassificationFailures:
      nonSecretConfig.runtime.maxClassificationFailures,
    logRetentionDays: nonSecretConfig.storage.logRetentionDays,
    allowlistPatterns: nonSecretConfig.filtering.allowlistPatterns,
  };
}
