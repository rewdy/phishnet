import type { ClassificationInput, ClassificationResult } from "../types";
import {
  buildSystemPrompt,
  classificationOutputSchema,
  type FilterProfile,
  type MessageClassifier,
} from "./types";

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

export class OllamaClassifier implements MessageClassifier {
  private readonly baseUrl: string;
  private readonly systemPrompt: string;

  constructor(
    baseUrl: string,
    private readonly model: string,
    profile: FilterProfile,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.systemPrompt = buildSystemPrompt(profile);
  }

  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: "json",
        messages: [
          {
            role: "system",
            content: this.systemPrompt,
          },
          {
            role: "user",
            content: [
              `Sender: ${input.from}`,
              `Subject: ${input.subject}`,
              "Body:",
              input.bodyText || "",
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Ollama request failed (${response.status}): ${body.slice(0, 300)}`,
      );
    }

    const json = (await response.json()) as OllamaChatResponse;
    const content = json.message?.content;
    if (!content) {
      throw new Error("Ollama response did not include message content");
    }

    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      throw new Error("Ollama response message content was not valid JSON");
    }

    return classificationOutputSchema.parse(parsedContent);
  }
}
