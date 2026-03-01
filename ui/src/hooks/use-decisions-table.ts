import type { DecisionsQuery, DecisionsResponse } from "@phishnet/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchDecisions } from "../api";
import type { FinalActionFilter } from "../models/filters";

/**
 * State and query output used to render the Decisions table.
 */
export interface UseDecisionsTableResult {
  limit: number;
  page: number;
  finalAction: FinalActionFilter;
  fromFilter: string;
  hasError: boolean | undefined;
  totalPages: number;
  data: DecisionsResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  setPage: (value: number) => void;
  setFromFilter: (value: string) => void;
  setFinalAction: (value: FinalActionFilter) => void;
  setHasError: (value: boolean | undefined) => void;
  handleLimitChange: (value: string | null) => void;
}

/**
 * Manages Decisions table filter/pagination state and data fetching.
 */
export function useDecisionsTable(): UseDecisionsTableResult {
  const [limit, setLimit] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [finalAction, setFinalAction] = useState<FinalActionFilter>("junk");
  const [fromFilter, setFromFilter] = useState<string>("");
  const [hasError, setHasError] = useState<boolean | undefined>(undefined);

  const query = useMemo<DecisionsQuery>(
    () => ({
      limit,
      offset: (page - 1) * limit,
      finalAction: finalAction === "all" ? undefined : finalAction,
      from: fromFilter.trim() ? fromFilter.trim() : undefined,
      hasError,
    }),
    [limit, page, finalAction, fromFilter, hasError],
  );

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["decisions", query],
    queryFn: () => fetchDecisions(query),
    refetchInterval: 60_000,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  function handleLimitChange(value: string | null): void {
    if (!value) return;
    setLimit(Number(value));
    setPage(1);
  }

  function updateFinalAction(value: FinalActionFilter): void {
    setFinalAction(value);
    setPage(1);
  }

  function updateFromFilter(value: string): void {
    setFromFilter(value);
    setPage(1);
  }

  function updateHasError(value: boolean | undefined): void {
    setHasError(value);
    setPage(1);
  }

  return {
    limit,
    page,
    finalAction,
    fromFilter,
    hasError,
    totalPages,
    data,
    isLoading,
    isFetching,
    error,
    setPage,
    setFromFilter: updateFromFilter,
    setFinalAction: updateFinalAction,
    setHasError: updateHasError,
    handleLimitChange,
  };
}
