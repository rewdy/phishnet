import { Paper, SimpleGrid, Text, Title } from "@mantine/core";
import type { StatsResponse } from "@phishnet/shared";

/**
 * Props for `StatsCards`.
 */
export interface StatsCardsProps {
  stats: StatsResponse | undefined;
}

/**
 * Renders summary stat cards shown at the top of the dashboard.
 */
export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
      <Paper withBorder p="md" radius="md">
        <Text size="sm" c="dimmed">
          Filtered today
        </Text>
        <Title order={3}>{stats?.filteredToday ?? "-"}</Title>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Text size="sm" c="dimmed">
          All time filtered
        </Text>
        <Title order={3}>{stats?.allTimeFiltered ?? "-"}</Title>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Text size="sm" c="dimmed">
          Total runs
        </Text>
        <Title order={3}>{stats?.totalRuns ?? "-"}</Title>
      </Paper>
      <Paper withBorder p="md" radius="md">
        <Text size="sm" c="dimmed">
          Total messages scanned
        </Text>
        <Title order={3}>{stats?.totalMessagesScanned ?? "-"}</Title>
      </Paper>
    </SimpleGrid>
  );
}
