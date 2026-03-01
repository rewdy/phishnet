import type { StatsResponse } from "@phishnet/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "../api";

/**
 * Query state returned for dashboard stats.
 */
export interface UseStatsResult {
  data: StatsResponse | undefined;
  error: unknown;
  isFetching: boolean;
}

/**
 * Fetches dashboard summary stats with periodic refresh.
 */
export function useStats(): UseStatsResult {
  const { data, error, isFetching } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 60_000,
  });

  return { data, error, isFetching };
}
