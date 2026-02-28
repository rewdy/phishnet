import type { AppConfig } from "../config";
import { OllamaClassifier } from "./ollama";
import { OpenAIClassifier } from "./openai";
import type { MessageClassifier } from "./types";

export type { FilterProfile, MessageClassifier } from "./types";

export function buildClassifier(config: AppConfig): MessageClassifier {
  if (config.modelProvider === "ollama") {
    return new OllamaClassifier(
      config.ollama.baseUrl,
      config.ollama.model,
      config.filterProfile,
    );
  }

  return new OpenAIClassifier(
    config.openai.apiKey,
    config.openai.model,
    config.filterProfile,
  );
}
