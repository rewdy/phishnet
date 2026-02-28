import type { EmailMessage } from "../types";

export class AllowlistMatcher {
  private readonly patterns: RegExp[];

  constructor(rawPatterns: string[]) {
    this.patterns = rawPatterns.map((pattern) => new RegExp(pattern, "i"));
  }

  matches(message: EmailMessage): boolean {
    if (this.patterns.length === 0) {
      return false;
    }

    const source = `${message.from}\n${message.subject}`;
    return this.patterns.some((pattern) => pattern.test(source));
  }
}
