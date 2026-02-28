import { OpenAIClassifier } from "./classifier/openai";
import { loadConfig } from "./config";
import { createDatabase, runMigrations } from "./db/database";
import {
  DecisionsRepository,
  RunsRepository,
  StateRepository,
} from "./db/repositories";
import { AllowlistMatcher } from "./filter/allowlist";
import { ICloudImapClient } from "./imap/client";

export function buildApp() {
  const config = loadConfig();
  const db = createDatabase(config.sqlitePath);
  runMigrations(db);

  const stateRepo = new StateRepository(db);
  const decisionsRepo = new DecisionsRepository(db);
  const runsRepo = new RunsRepository(db);
  const allowlist = new AllowlistMatcher(config.allowlistPatterns);
  const classifier = new OpenAIClassifier(
    config.openai.apiKey,
    config.openai.model,
    config.openai.filterProfile,
  );
  const imapClient = new ICloudImapClient(config.imap);

  return {
    config,
    db,
    stateRepo,
    decisionsRepo,
    runsRepo,
    allowlist,
    classifier,
    imapClient,
  };
}
