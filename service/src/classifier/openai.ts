import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ClassificationInput, ClassificationResult } from "../types";
import {
  buildSystemPrompt,
  classificationOutputSchema,
  type FilterProfile,
  type MessageClassifier,
} from "./types";

export class OpenAIClassifier implements MessageClassifier {
  private readonly client: OpenAI;
  private readonly systemPrompt: string;

  constructor(
    apiKey: string,
    private readonly model: string,
    profile: FilterProfile,
  ) {
    this.client = new OpenAI({ apiKey });
    this.systemPrompt = buildSystemPrompt(profile);
  }

  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const completion = await this.client.chat.completions.parse({
      model: this.model,
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
      response_format: zodResponseFormat(
        classificationOutputSchema,
        "email_junk_decision",
      ),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error(
        "OpenAI response did not include parsed classification output",
      );
    }

    return parsed;
  }
}
