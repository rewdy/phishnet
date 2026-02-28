import type { MessageClassifier } from "../classifier";
import type { AppConfig } from "../config";
import { logger } from "../logger";

interface OllamaTagsResponse {
  models?: Array<{
    model?: string;
    name?: string;
  }>;
}

export interface SmokeModelDeps {
  config: AppConfig;
  classifier: MessageClassifier;
}

async function verifyOllamaModel(config: AppConfig): Promise<void> {
  if (config.modelProvider !== "ollama") {
    return;
  }

  const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Ollama tags request failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const json = (await response.json()) as OllamaTagsResponse;
  const availableModels = (json.models ?? [])
    .map((model) => model.name ?? model.model ?? "")
    .filter(Boolean);
  if (!availableModels.includes(config.ollama.model)) {
    throw new Error(
      `Ollama model '${config.ollama.model}' not found. Available models: ${
        availableModels.length > 0 ? availableModels.join(", ") : "(none)"
      }`,
    );
  }
}

export async function runModelSmoke(deps: SmokeModelDeps): Promise<void> {
  await verifyOllamaModel(deps.config);

  const result = await deps.classifier.classify({
    from: "news@example.com",
    subject: "Welcome to your monthly account summary",
    bodyText:
      "Your monthly account summary is available. No action is required.",
  });

  logger.info(
    {
      provider: deps.config.modelProvider,
      model:
        deps.config.modelProvider === "ollama"
          ? deps.config.ollama.model
          : deps.config.openai.model,
      result,
    },
    "model smoke test succeeded",
  );
}
