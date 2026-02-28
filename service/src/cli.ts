import { buildApp } from "./app";
import { serializeError } from "./errors";
import { runCleanup } from "./jobs/cleanup";
import { startPoller } from "./jobs/poller";
import { runOnce } from "./jobs/run-once";
import { runModelSmoke } from "./jobs/smoke-model";
import { logger } from "./logger";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "start";
  const app = buildApp();

  const deps = {
    config: app.config,
    stateRepo: app.stateRepo,
    decisionsRepo: app.decisionsRepo,
    runsRepo: app.runsRepo,
    allowlist: app.allowlist,
    imapClient: app.imapClient,
    classifier: app.classifier,
  };

  switch (command) {
    case "start": {
      await startPoller(deps);
      return;
    }
    case "run-once": {
      await runOnce(deps);
      return;
    }
    case "dry-run-once": {
      await runOnce(deps, { forceDryRun: true });
      return;
    }
    case "cleanup": {
      runCleanup(app.config, app.stateRepo);
      return;
    }
    case "smoke-model": {
      await runModelSmoke({
        config: app.config,
        classifier: app.classifier,
      });
      return;
    }
    default: {
      throw new Error(`Unknown command: ${command}`);
    }
  }
}

main().catch((error) => {
  logger.error({ err: serializeError(error) }, "fatal error");
  process.exit(1);
});
