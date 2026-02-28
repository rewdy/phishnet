import type { MessageClassifier } from "../classifier/openai";
import type { AppConfig } from "../config";
import type { DecisionsRepository, StateRepository } from "../db/repositories";
import { serializeError } from "../errors";
import type { AllowlistMatcher } from "../filter/allowlist";
import type { ImapClient } from "../imap/client";
import { logger } from "../logger";
import type { EmailMessage, ProcessResult } from "../types";

export interface ProcessMessageDeps {
  stateRepo: StateRepository;
  decisionsRepo: DecisionsRepository;
  allowlist: AllowlistMatcher;
  classifier: MessageClassifier;
  imapClient: ImapClient;
  config: AppConfig;
}

export async function processMessage(
  deps: ProcessMessageDeps,
  runId: number,
  message: EmailMessage,
  dryRunOverride?: boolean,
): Promise<ProcessResult> {
  const dryRun = dryRunOverride ?? deps.config.dryRun;
  deps.stateRepo.ensurePending(message.uid, message.messageId);

  if (!deps.stateRepo.canProcess(message.uid)) {
    return {
      uid: message.uid,
      finalAction: "keep",
      movedToJunk: false,
    };
  }

  if (deps.allowlist.matches(message)) {
    deps.decisionsRepo.insertDecision({
      runId,
      uid: message.uid,
      fromValue: message.from,
      subject: message.subject,
      bodyText: message.bodyText,
      allowlistMatched: true,
      finalAction: "allowlist_skip",
      dryRun,
    });

    deps.stateRepo.markProcessed(message.uid);

    return {
      uid: message.uid,
      finalAction: "allowlist_skip",
      movedToJunk: false,
    };
  }

  try {
    const classification = await deps.classifier.classify({
      from: message.from,
      subject: message.subject,
      bodyText: message.bodyText,
    });

    const shouldJunk =
      classification.action === "junk" &&
      classification.confidence >= deps.config.confidenceThreshold;

    let movedToJunk = false;
    if (shouldJunk && !dryRun) {
      await deps.imapClient.moveToJunk(message.uid);
      movedToJunk = true;
    }

    deps.decisionsRepo.insertDecision({
      runId,
      uid: message.uid,
      fromValue: message.from,
      subject: message.subject,
      bodyText: message.bodyText,
      allowlistMatched: false,
      classification,
      finalAction: shouldJunk ? "junk" : "keep",
      dryRun,
    });

    deps.stateRepo.markProcessed(message.uid);

    return {
      uid: message.uid,
      finalAction: shouldJunk ? "junk" : "keep",
      movedToJunk,
    };
  } catch (error) {
    const serialized = serializeError(error);
    const messageText = serialized.message;
    const { failureCount, permanentFailure } = deps.stateRepo.recordFailure(
      message.uid,
      messageText,
      deps.config.maxClassificationFailures,
    );

    deps.decisionsRepo.insertDecision({
      runId,
      uid: message.uid,
      fromValue: message.from,
      subject: message.subject,
      bodyText: message.bodyText,
      allowlistMatched: false,
      finalAction: "error",
      dryRun,
      errorType: "classification_error",
      errorMessage: messageText,
    });

    logger.warn(
      {
        uid: message.uid,
        failureCount,
        permanentFailure,
        err: serialized,
      },
      "classification failed",
    );

    return {
      uid: message.uid,
      finalAction: "error",
      movedToJunk: false,
    };
  }
}
