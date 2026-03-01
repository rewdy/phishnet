import type { RunsQuery, RunsResponse } from "@phishnet/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchRuns } from "../api";

/**
 * State and query output used to render the Runs table.
 */
export interface UseRunsTableResult {
  limit: number;
  page: number;
  totalPages: number;
  data: RunsResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  setPage: (value: number) => void;
  handleLimitChange: (value: string | null) => void;
}

/**
 * Manages Runs table pagination state and data fetching.
 */
export function useRunsTable(): UseRunsTableResult {
  const [limit, setLimit] = useState<number>(25);
  const [page, setPage] = useState<number>(1);

  const query = useMemo<RunsQuery>(
    () => ({
      limit,
      offset: (page - 1) * limit,
    }),
    [limit, page],
  );

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["runs", query],
    queryFn: () => fetchRuns(query),
    refetchInterval: 60_000,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  function handleLimitChange(value: string | null): void {
    if (!value) return;
    setLimit(Number(value));
    setPage(1);
  }

  return {
    limit,
    page,
    totalPages,
    data,
    isLoading,
    isFetching,
    error,
    setPage,
    handleLimitChange,
  };
}
