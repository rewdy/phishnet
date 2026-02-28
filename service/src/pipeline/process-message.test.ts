import { beforeEach, describe, expect, test } from "bun:test";
import type { AppConfig } from "../config";
import { createDatabase, runMigrations } from "../db/database";
import {
  DecisionsRepository,
  RunsRepository,
  StateRepository,
} from "../db/repositories";
import { AllowlistMatcher } from "../filter/allowlist";
import type {
  ClassificationInput,
  ClassificationResult,
  EmailMessage,
} from "../types";
import { processMessage } from "./process-message";

class MockImapClient {
  moved: number[] = [];

  async listUnread(): Promise<EmailMessage[]> {
    return [];
  }

  async moveToJunk(uid: number): Promise<void> {
    this.moved.push(uid);
  }
}

class MockClassifier {
  calls = 0;
  constructor(
    private readonly handler: (
      input: ClassificationInput,
    ) => Promise<ClassificationResult>,
  ) {}

  classify(input: ClassificationInput): Promise<ClassificationResult> {
    this.calls += 1;
    return this.handler(input);
  }
}

const baseMessage: EmailMessage = {
  uid: 42,
  messageId: "msg-42",
  from: "spammer123@badmail.example",
  subject: "special adult offer",
  bodyText: "explicit content",
};

let config: AppConfig;

beforeEach(() => {
  config = {
    imap: {
      host: "imap.mail.me.com",
      port: 993,
      secure: true,
      user: "u",
      password: "p",
      inboxMailbox: "INBOX",
      junkMailbox: "Junk",
    },
    openai: {
      apiKey: "k",
      model: "m",
    },
    pollIntervalMinutes: 30,
    confidenceThreshold: 0.6,
    maxMessagesPerRun: 100,
    dryRun: false,
    sqlitePath: ":memory:",
    maxClassificationFailures: 3,
    logRetentionDays: 90,
    allowlistPatterns: [],
  };
});

function setupRepos() {
  const db = createDatabase(":memory:");
  runMigrations(db);
  return {
    db,
    stateRepo: new StateRepository(db),
    decisionsRepo: new DecisionsRepository(db),
    runsRepo: new RunsRepository(db),
  };
}

describe("processMessage", () => {
  test("moves to junk when classification is junk and confidence >= threshold", async () => {
    const repos = setupRepos();
    const classifier = new MockClassifier(async () => ({
      action: "junk",
      confidence: 0.9,
      reasonCode: "explicit_sexual_content",
    }));
    const imap = new MockImapClient();

    const result = await processMessage(
      {
        stateRepo: repos.stateRepo,
        decisionsRepo: repos.decisionsRepo,
        allowlist: new AllowlistMatcher([]),
        classifier,
        imapClient: imap,
        config,
      },
      repos.runsRepo.startRun(),
      baseMessage,
    );

    expect(result.finalAction).toBe("junk");
    expect(result.movedToJunk).toBe(true);
    expect(imap.moved).toEqual([42]);
    expect(repos.stateRepo.getMessageState(42)?.status).toBe("processed");
    repos.db.close();
  });

  test("keeps message when confidence below threshold", async () => {
    const repos = setupRepos();
    const classifier = new MockClassifier(async () => ({
      action: "junk",
      confidence: 0.59,
      reasonCode: "low_confidence",
    }));
    const imap = new MockImapClient();

    const result = await processMessage(
      {
        stateRepo: repos.stateRepo,
        decisionsRepo: repos.decisionsRepo,
        allowlist: new AllowlistMatcher([]),
        classifier,
        imapClient: imap,
        config,
      },
      repos.runsRepo.startRun(),
      baseMessage,
    );

    expect(result.finalAction).toBe("keep");
    expect(result.movedToJunk).toBe(false);
    expect(imap.moved).toEqual([]);
    repos.db.close();
  });

  test("retries classification failures and marks permanent_failure on third failure", async () => {
    const repos = setupRepos();
    const classifier = new MockClassifier(async () => {
      throw new Error("temporary upstream issue");
    });
    const imap = new MockImapClient();
    const runId = repos.runsRepo.startRun();

    for (let i = 0; i < 3; i += 1) {
      const result = await processMessage(
        {
          stateRepo: repos.stateRepo,
          decisionsRepo: repos.decisionsRepo,
          allowlist: new AllowlistMatcher([]),
          classifier,
          imapClient: imap,
          config,
        },
        runId,
        baseMessage,
      );
      expect(result.finalAction).toBe("error");
    }

    const state = repos.stateRepo.getMessageState(42);
    expect(state?.status).toBe("permanent_failure");
    expect(state?.failureCount).toBe(3);

    await processMessage(
      {
        stateRepo: repos.stateRepo,
        decisionsRepo: repos.decisionsRepo,
        allowlist: new AllowlistMatcher([]),
        classifier,
        imapClient: imap,
        config,
      },
      runId,
      baseMessage,
    );

    expect(classifier.calls).toBe(3);
    repos.db.close();
  });

  test("allowlist skips classification and marks processed", async () => {
    const repos = setupRepos();
    const classifier = new MockClassifier(async () => ({
      action: "keep",
      confidence: 1,
      reasonCode: "non_sexual",
    }));
    const imap = new MockImapClient();

    const result = await processMessage(
      {
        stateRepo: repos.stateRepo,
        decisionsRepo: repos.decisionsRepo,
        allowlist: new AllowlistMatcher(["badmail\\.example"]),
        classifier,
        imapClient: imap,
        config,
      },
      repos.runsRepo.startRun(),
      baseMessage,
    );

    expect(result.finalAction).toBe("allowlist_skip");
    expect(classifier.calls).toBe(0);
    expect(repos.stateRepo.getMessageState(42)?.status).toBe("processed");
    repos.db.close();
  });
});
