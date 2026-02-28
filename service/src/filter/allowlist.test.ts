import { describe, expect, test } from "bun:test";
import { AllowlistMatcher } from "./allowlist";
import type { EmailMessage } from "../types";

const baseMessage: EmailMessage = {
  uid: 1,
  from: "Promo Bot <noreply@ads.example.com>",
  subject: "Weekly update",
  bodyText: "hello",
};

describe("AllowlistMatcher", () => {
  test("returns false when empty", () => {
    const matcher = new AllowlistMatcher([]);
    expect(matcher.matches(baseMessage)).toBe(false);
  });

  test("matches sender regex", () => {
    const matcher = new AllowlistMatcher(["ads\\.example\\.com"]);
    expect(matcher.matches(baseMessage)).toBe(true);
  });

  test("does not match unrelated regex", () => {
    const matcher = new AllowlistMatcher(["trusted\\.org"]);
    expect(matcher.matches(baseMessage)).toBe(false);
  });
});
