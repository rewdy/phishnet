import type { AppConfig } from "../config";
import type { StateRepository } from "../db/repositories";
import { logger } from "../logger";

export function runCleanup(
  config: AppConfig,
  stateRepo: StateRepository,
): void {
  const deleted = stateRepo.pruneOlderThan(config.logRetentionDays);

  logger.info(
    {
      retentionDays: config.logRetentionDays,
      ...deleted,
    },
    "cleanup completed",
  );
}
