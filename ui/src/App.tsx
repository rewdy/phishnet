import {
  Alert,
  AppShell,
  Group,
  Image,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import phishnetLogo from "./assets/phishnet-logo.png";
import { ColorSchemeToggle } from "./components/color-scheme-toggle";
import { DecisionsTable } from "./components/decisions-table";
import { RunsTable } from "./components/runs-table";
import { StatsCards } from "./components/stats-cards";
import { formatTimestamp, TIMEZONE } from "./helpers/time";
import { useStats } from "./hooks/use-stats";

/**
 * Root dashboard component for the Phishnet stats UI.
 */
function App() {
  const {
    data: stats,
    error: statsError,
    isFetching: statsFetching,
  } = useStats();

  return (
    <AppShell padding="md">
      <AppShell.Main>
        <Stack gap="lg">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="md" align="center" wrap="nowrap">
              <Image
                src={phishnetLogo}
                alt="Phishnet logo"
                w={{ base: 60, sm: 100 }}
                h={{ base: 60, sm: 100 }}
                fit="contain"
              />
              <Title order={2}>Phishnet Stats</Title>
            </Group>
            <ColorSchemeToggle />
          </Group>
          <Text c="dimmed" size="sm">
            Data refreshes every 60 seconds. Times shown in {TIMEZONE}.
          </Text>
          <Text c="dimmed" size="sm">
            <strong>Last run:</strong>{" "}
            {stats?.lastRunAt ? formatTimestamp(stats.lastRunAt) : "-"}
            {statsFetching ? " (refreshing...)" : ""}
          </Text>
          {statsError ? (
            <Alert color="red">{(statsError as Error).message}</Alert>
          ) : null}

          <StatsCards stats={stats} />

          <Tabs defaultValue="decisions">
            <Tabs.List>
              <Tabs.Tab value="decisions">Decisions</Tabs.Tab>
              <Tabs.Tab value="runs">Runs</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="decisions" pt="md">
              <DecisionsTable />
            </Tabs.Panel>
            <Tabs.Panel value="runs" pt="md">
              <RunsTable />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
