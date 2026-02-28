import { describe, expect, test } from "bun:test";
import { loadConfig } from "./config";

const baseEnv = {
  IMAP_USER: "user@icloud.com",
  IMAP_PASSWORD: "app-password",
  OPENAI_API_KEY: "sk-test",
};

describe("loadConfig boolean parsing", () => {
  test("parses DRY_RUN=false and IMAP_SECURE=true from env strings", () => {
    const config = loadConfig({
      ...baseEnv,
      DRY_RUN: "false",
      IMAP_SECURE: "true",
    });

    expect(config.dryRun).toBe(false);
    expect(config.imap.secure).toBe(true);
  });

  test("supports 1/0 variants", () => {
    const config = loadConfig({
      ...baseEnv,
      DRY_RUN: "0",
      IMAP_SECURE: "1",
    });

    expect(config.dryRun).toBe(false);
    expect(config.imap.secure).toBe(true);
  });
});

describe("loadConfig model provider", () => {
  test("requires OPENAI_API_KEY when MODEL_PROVIDER=openai", () => {
    expect(() =>
      loadConfig({
        IMAP_USER: "user@icloud.com",
        IMAP_PASSWORD: "app-password",
        MODEL_PROVIDER: "openai",
      }),
    ).toThrow("OPENAI_API_KEY is required");
  });

  test("allows MODEL_PROVIDER=ollama without OPENAI_API_KEY", () => {
    const config = loadConfig({
      IMAP_USER: "user@icloud.com",
      IMAP_PASSWORD: "app-password",
      MODEL_PROVIDER: "ollama",
    });

    expect(config.modelProvider).toBe("ollama");
    expect(config.ollama.baseUrl).toBe("http://127.0.0.1:11434");
  });
});
