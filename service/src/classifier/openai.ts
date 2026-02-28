import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { ClassificationInput, ClassificationResult } from "../types";

const outputSchema = z.object({
  action: z.enum(["junk", "keep"]),
  confidence: z.number().min(0).max(1),
  reasonCode: z.string().min(1),
});

export interface MessageClassifier {
  classify(input: ClassificationInput): Promise<ClassificationResult>;
}

export class OpenAIClassifier implements MessageClassifier {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async classify(input: ClassificationInput): Promise<ClassificationResult> {
    const completion = await this.client.chat.completions.parse({
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "You classify incoming emails for explicit sexual content. Return junk only when sexual/adult explicit content is present. Otherwise keep.",
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
      response_format: zodResponseFormat(outputSchema, "email_junk_decision"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("OpenAI response did not include parsed classification output");
    }

    return parsed;
  }
}
