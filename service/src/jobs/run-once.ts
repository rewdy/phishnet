import type { MessageClassifier } from "../classifier/openai";
import type { AppConfig } from "../config";
import type {
  DecisionsRepository,
  RunsRepository,
  StateRepository,
} from "../db/repositories";
import { serializeError } from "../errors";
import type { AllowlistMatcher } from "../filter/allowlist";
import type { ImapClient } from "../imap/client";
import { logger } from "../logger";
import { processMessage } from "../pipeline/process-message";

export interface RunOnceDeps {
  config: AppConfig;
  stateRepo: StateRepository;
  decisionsRepo: DecisionsRepository;
  runsRepo: RunsRepository;
  allowlist: AllowlistMatcher;
  imapClient: ImapClient;
  classifier: MessageClassifier;
}

export async function runOnce(
  deps: RunOnceDeps,
  options?: { forceDryRun?: boolean },
): Promise<void> {
  const runId = deps.runsRepo.startRun();
  let messagesScanned = 0;
  let messagesClassified = 0;
  let messagesMoved = 0;
  let messagesFailed = 0;

  try {
    const messages = await deps.imapClient.listUnread(
      deps.config.maxMessagesPerRun,
    );
    messagesScanned = messages.length;

    for (const message of messages) {
      const result = await processMessage(
        {
          stateRepo: deps.stateRepo,
          decisionsRepo: deps.decisionsRepo,
          allowlist: deps.allowlist,
          classifier: deps.classifier,
          imapClient: deps.imapClient,
          config: deps.config,
        },
        runId,
        message,
        options?.forceDryRun,
      );

      if (result.finalAction === "error") {
        messagesFailed += 1;
      } else {
        messagesClassified += 1;
      }

      if (result.movedToJunk) {
        messagesMoved += 1;
      }
    }

    deps.runsRepo.completeRun(runId, {
      status: messagesFailed > 0 ? "partial_failure" : "success",
      messagesScanned,
      messagesClassified,
      messagesMoved,
      messagesFailed,
    });

    logger.info(
      {
        runId,
        messagesScanned,
        messagesClassified,
        messagesMoved,
        messagesFailed,
        dryRun: options?.forceDryRun ?? deps.config.dryRun,
      },
      "run completed",
    );
  } catch (error) {
    const err = serializeError(error);

    deps.runsRepo.completeRun(runId, {
      status: "failure",
      messagesScanned,
      messagesClassified,
      messagesMoved,
      messagesFailed: messagesFailed + 1,
    });

    logger.error({ runId, err }, "run failed");
    throw error;
  }
}
