import { logger } from "../logger";
import type { RunOnceDeps } from "./run-once";
import { runOnce } from "./run-once";

export async function startPoller(deps: RunOnceDeps): Promise<never> {
  const intervalMs = deps.config.pollIntervalMinutes * 60_000;

  const execute = async (): Promise<void> => {
    try {
      await runOnce(deps);
    } catch (error) {
      const errText = error instanceof Error ? error.message : String(error);
      logger.error({ err: errText }, "poll iteration failed");
    }
  };

  await execute();

  setInterval(() => {
    void execute();
  }, intervalMs);

  logger.info(
    { intervalMinutes: deps.config.pollIntervalMinutes },
    "poller started",
  );

  return await new Promise(() => {
    // Keep process alive.
  });
}
