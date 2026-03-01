import {
  type DecisionsQuery,
  type DecisionsResponse,
  DecisionsResponseSchema,
  type RunsQuery,
  type RunsResponse,
  RunsResponseSchema,
  type StatsResponse,
  StatsResponseSchema,
} from "@phishnet/shared";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT ?? "8787"}`;

function buildQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }
  const stringified = query.toString();
  return stringified.length > 0 ? `?${stringified}` : "";
}

function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/**
 * Fetches a paginated runs list from the local API.
 */
export async function fetchRuns(params: RunsQuery): Promise<RunsResponse> {
  const response = await fetch(
    buildApiUrl(`/api/runs${buildQueryString(params)}`),
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch runs (${response.status})`);
  }

  const json = await response.json();
  return RunsResponseSchema.parse(json);
}

/**
 * Fetches a paginated, filterable decisions list from the local API.
 */
export async function fetchDecisions(
  params: DecisionsQuery,
): Promise<DecisionsResponse> {
  const response = await fetch(
    buildApiUrl(
      `/api/decisions${buildQueryString({
        ...params,
        hasError:
          params.hasError === undefined
            ? undefined
            : params.hasError
              ? "true"
              : "false",
      })}`,
    ),
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch decisions (${response.status})`);
  }

  const json = await response.json();
  return DecisionsResponseSchema.parse(json);
}

/**
 * Fetches dashboard summary stats from the local API.
 */
export async function fetchStats(): Promise<StatsResponse> {
  const response = await fetch(buildApiUrl("/api/stats"));
  if (!response.ok) {
    throw new Error(`Failed to fetch stats (${response.status})`);
  }

  const json = await response.json();
  return StatsResponseSchema.parse(json);
}
