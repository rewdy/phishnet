import { pageSizeValues } from "@phishnet/shared";

/**
 * Select options for table page size controls.
 */
export const PAGE_SIZE_OPTIONS = pageSizeValues.map((value) => ({
  value: String(value),
  label: String(value),
}));

/**
 * Select options for the Decisions "Final action" filter.
 */
export const FINAL_ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "junk", label: "junk" },
  { value: "keep", label: "keep" },
  { value: "allowlist_skip", label: "allowlist_skip" },
  { value: "error", label: "error" },
];

/**
 * Select options for filtering decisions by error state.
 */
export const ERROR_FILTER_OPTIONS = [
  { value: "true", label: "Only errors" },
  { value: "false", label: "No errors" },
];
