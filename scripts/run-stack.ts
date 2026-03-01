import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseDotenv } from "dotenv";
import { parse as parseJsonc } from "jsonc-parser";
import { resolveNonSecretConfig } from "../shared/src/config";

type Mode = "start" | "web";

const rootDir = join(import.meta.dir, "..");

function parseArgs(args: string[]): Mode {
  const mode = args[2];
  if (mode !== "start" && mode !== "web") {
    throw new Error("Usage: bun run scripts/run-stack.ts <start|web>");
  }

  return mode;
}

function readEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const text = readFileSync(filePath, "utf8");
  return parseDotenv(text);
}

function parseConfigFile(filePath: string): unknown {
  if (!existsSync(filePath)) {
    return {};
  }

  const text = readFileSync(filePath, "utf8");
  const errors: Array<{
    error: number;
    offset: number;
    length: number;
  }> = [];
  const parsed = parseJsonc(text, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid configuration file ${filePath}: ${errors
        .map(
          (entry) =>
            `code=${entry.error} at offset=${entry.offset} length=${entry.length}`,
        )
        .join("; ")}`,
    );
  }

  return parsed ?? {};
}

function buildRuntimeEnv(mode: Mode): Record<string, string> {
  const envFromFile = readEnvFile(join(rootDir, "service", ".env"));
  const mergedEnv: Record<string, string | undefined> = {
    ...envFromFile,
    ...process.env,
  };

  const configPath =
    mergedEnv.PHISHNET_CONFIG_PATH ?? join(rootDir, "service", "config.jsonc");
  const fileConfig = parseConfigFile(configPath);
  const nonSecretConfig = resolveNonSecretConfig(fileConfig, mergedEnv);

  console.log("Phishnet network config:");
  console.log(
    `- API: http://${nonSecretConfig.network.apiHost}:${nonSecretConfig.network.apiPort}`,
  );
  console.log(
    `- UI:  http://${nonSecretConfig.network.uiHost}:${nonSecretConfig.network.uiPort}`,
  );
  console.log(
    `- LAN mode: ${nonSecretConfig.network.lanMode ? "enabled" : "disabled"}`,
  );
  console.log(`- Config file: ${configPath}`);
  console.log(`- Mode: ${mode}`);

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(mergedEnv)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  env.API_HOST = nonSecretConfig.network.apiHost;
  env.API_PORT = String(nonSecretConfig.network.apiPort);
  env.LAN_MODE = nonSecretConfig.network.lanMode ? "true" : "false";
  env.PHISHNET_UI_HOST = nonSecretConfig.network.uiHost;
  env.PHISHNET_UI_PORT = String(nonSecretConfig.network.uiPort);
  env.PHISHNET_UI_ALLOWED_HOSTS =
    nonSecretConfig.network.uiAllowedHosts.join(",");
  env.VITE_API_PORT = String(nonSecretConfig.network.apiPort);

  return env;
}

async function run(mode: Mode): Promise<void> {
  const env = buildRuntimeEnv(mode);
  const script = mode === "start" ? "start:internal" : "web:internal";
  const proc = Bun.spawn(["bun", "run", script], {
    cwd: rootDir,
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  process.exit(code);
}

const mode = parseArgs(process.argv);
await run(mode);
