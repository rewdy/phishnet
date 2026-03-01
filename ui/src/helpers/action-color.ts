import type { FinalAction } from "@phishnet/shared";

/**
 * Returns the Mantine color token used for a decision action badge.
 */
export function actionColor(action: FinalAction): string {
  switch (action) {
    case "junk":
      return "red";
    case "keep":
      return "green";
    case "allowlist_skip":
      return "blue";
    case "error":
      return "orange";
  }
}
