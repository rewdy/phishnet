import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { ClassificationInput, ClassificationResult } from "../types";

export type FilterProfile = "light" | "balanced" | "strict";

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
      response_format: zodResponseFormat(outputSchema, "email_junk_decision"),
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

function buildSystemPrompt(profile: FilterProfile): string {
  const sharedRules = [
    "You are classifying incoming email for a local junk-filter service.",
    "Read sender, subject, and body together before deciding.",
    "Return action='junk' only when the selected profile's junk criteria are met.",
    "Return action='keep' for uncertain or borderline cases.",
    "Confidence should be between 0 and 1 and reflect your certainty.",
    "reasonCode should be short and machine-readable, for example: non_sexual, explicit_sexual_content, spam_unsolicited_bulk, annoyance_low_value_outreach.",
  ];

  if (profile === "light") {
    return [
      ...sharedRules,
      "Profile: light.",
      "Junk criteria: only explicit sexual/adult content, pornographic solicitation, or clearly sexual service offers.",
      "Do NOT junk normal marketing, newsletters, or generic spam unless it is explicitly sexual.",
    ].join(" ");
  }

  if (profile === "balanced") {
    return [
      ...sharedRules,
      "Profile: balanced.",
      "Junk criteria: explicit sexual/adult content OR clear spam signals (unsolicited bulk promotion, scam-like bait, deceptive subject lines, obvious machine-generated spam).",
      "Keep normal transactional emails, known-newsletter style content, and legitimate one-to-one messages unless they clearly meet junk criteria.",
    ].join(" ");
  }

  return [
    ...sharedRules,
    "Profile: strict.",
    "Junk criteria: explicit sexual/adult content OR clear spam OR recurring annoyances.",
    "Annoyances include low-value cold outreach, repetitive promotional blasts, aggressive lead-generation pitches, and persistent unsolicited solicitations with little user value.",
    "When a message appears annoyance-grade even without clear scam behavior, prefer junk with an appropriate reasonCode.",
  ].join(" ");
}
