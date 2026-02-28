import {
  DecisionsResponseSchema,
  RunsResponseSchema,
  type DecisionsQuery,
  type DecisionsResponse,
  type RunsQuery,
  type RunsResponse,
} from "@dream-weaver/shared";

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.set(key, String(value));
  }
  const stringified = query.toString();
  return stringified.length > 0 ? `?${stringified}` : "";
}

export async function fetchRuns(params: RunsQuery): Promise<RunsResponse> {
  const response = await fetch(`/api/runs${buildQueryString(params)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch runs (${response.status})`);
  }

  const json = await response.json();
  return RunsResponseSchema.parse(json);
}

export async function fetchDecisions(params: DecisionsQuery): Promise<DecisionsResponse> {
  const response = await fetch(`/api/decisions${buildQueryString({
    ...params,
    hasError: params.hasError === undefined ? undefined : params.hasError ? "true" : "false",
  })}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch decisions (${response.status})`);
  }

  const json = await response.json();
  return DecisionsResponseSchema.parse(json);
}
