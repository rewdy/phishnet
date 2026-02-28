import {
  Alert,
  AppShell,
  Badge,
  Group,
  Image,
  Loader,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  type DecisionsQuery,
  type FinalAction,
  pageSizeValues,
  type RunsQuery,
} from "@phishnet/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchDecisions, fetchRuns, fetchStats } from "./api";
import phishnetLogo from "./assets/phishnet-logo.png";

const PAGE_SIZE_OPTIONS = pageSizeValues.map((value) => ({
  value: String(value),
  label: String(value),
}));
const TIMEZONE = import.meta.env.VITE_TIMEZONE ?? "America/Chicago";

function parseTimestamp(value: string): Date {
  if (value.includes("T") || value.endsWith("Z")) {
    return new Date(value);
  }

  return new Date(`${value.replace(" ", "T")}Z`);
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = parseTimestamp(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}

function actionColor(action: FinalAction): string {
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

function RunsTable() {
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

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group>
          <Select
            label="Rows per page"
            data={PAGE_SIZE_OPTIONS}
            value={String(limit)}
            onChange={(value) => {
              if (!value) return;
              setLimit(Number(value));
              setPage(1);
            }}
            w={140}
          />
          <Text size="sm" c="dimmed">
            {data ? `Total runs: ${data.total}` : "Total runs: -"}
          </Text>
        </Group>
        {isFetching && <Loader size="sm" />}
      </Group>

      {error && <Alert color="red">{(error as Error).message}</Alert>}

      <Paper withBorder p="sm" radius="md">
        {isLoading ? (
          <Loader />
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Started</Table.Th>
                <Table.Th>Completed</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Scanned</Table.Th>
                <Table.Th>Classified</Table.Th>
                <Table.Th>Moved</Table.Th>
                <Table.Th>Failed</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data?.items ?? []).map((run) => (
                <Table.Tr key={run.id}>
                  <Table.Td>{run.id}</Table.Td>
                  <Table.Td>{formatTimestamp(run.startedAt)}</Table.Td>
                  <Table.Td>{formatTimestamp(run.completedAt)}</Table.Td>
                  <Table.Td>{run.status}</Table.Td>
                  <Table.Td>{run.messagesScanned}</Table.Td>
                  <Table.Td>{run.messagesClassified}</Table.Td>
                  <Table.Td>{run.messagesMoved}</Table.Td>
                  <Table.Td>{run.messagesFailed}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Pagination value={page} onChange={setPage} total={totalPages} />
    </Stack>
  );
}

function DecisionsTable() {
  const [limit, setLimit] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [finalAction, setFinalAction] = useState<FinalAction | undefined>(
    undefined,
  );
  const [fromFilter, setFromFilter] = useState<string>("");
  const [hasError, setHasError] = useState<boolean | undefined>(undefined);

  const query = useMemo<DecisionsQuery>(
    () => ({
      limit,
      offset: (page - 1) * limit,
      finalAction,
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

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Group align="flex-end" wrap="wrap">
          <Select
            label="Rows per page"
            data={PAGE_SIZE_OPTIONS}
            value={String(limit)}
            onChange={(value) => {
              if (!value) return;
              setLimit(Number(value));
              setPage(1);
            }}
            w={140}
          />
          <Select
            label="Final action"
            clearable
            value={finalAction}
            onChange={(value) => {
              setFinalAction((value as FinalAction | null) ?? undefined);
              setPage(1);
            }}
            data={[
              { value: "junk", label: "junk" },
              { value: "keep", label: "keep" },
              { value: "allowlist_skip", label: "allowlist_skip" },
              { value: "error", label: "error" },
            ]}
            w={180}
          />
          <Select
            label="Errors"
            clearable
            value={hasError === undefined ? null : hasError ? "true" : "false"}
            onChange={(value) => {
              if (!value) {
                setHasError(undefined);
              } else {
                setHasError(value === "true");
              }
              setPage(1);
            }}
            data={[
              { value: "true", label: "Only errors" },
              { value: "false", label: "No errors" },
            ]}
            w={160}
          />
          <TextInput
            label="Sender contains"
            placeholder="example@domain.com"
            value={fromFilter}
            onChange={(event) => {
              setFromFilter(event.currentTarget.value);
              setPage(1);
            }}
            w={280}
          />
        </Group>
        <Group>
          <Text size="sm" c="dimmed">
            {data ? `Total decisions: ${data.total}` : "Total decisions: -"}
          </Text>
          {isFetching && <Loader size="sm" />}
        </Group>
      </Group>

      {error && <Alert color="red">{(error as Error).message}</Alert>}

      <Paper withBorder p="sm" radius="md">
        {isLoading ? (
          <Loader />
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>UID</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Sender</Table.Th>
                <Table.Th>Subject</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Confidence</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Error</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(data?.items ?? []).map((decision) => (
                <Table.Tr key={decision.id}>
                  <Table.Td>{decision.id}</Table.Td>
                  <Table.Td>{decision.imapUid}</Table.Td>
                  <Table.Td>{formatTimestamp(decision.createdAt)}</Table.Td>
                  <Table.Td>{decision.fromValue}</Table.Td>
                  <Table.Td>{decision.subjectText ?? "-"}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={actionColor(decision.finalAction)}
                      variant="light"
                    >
                      {decision.finalAction}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {decision.modelConfidence === null
                      ? "-"
                      : decision.modelConfidence.toFixed(2)}
                  </Table.Td>
                  <Table.Td>{decision.reasonCode ?? "-"}</Table.Td>
                  <Table.Td>{decision.errorMessage ?? "-"}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Pagination value={page} onChange={setPage} total={totalPages} />
    </Stack>
  );
}

function App() {
  const {
    data: stats,
    error: statsError,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 60_000,
  });

  return (
    <AppShell padding="md">
      <AppShell.Main>
        <Stack gap="lg">
          <Group gap="md" align="center">
            <Image
              src={phishnetLogo}
              alt="Phishnet logo"
              w={100}
              h={100}
              fit="contain"
            />
            <Title order={2}>Phishnet Stats</Title>
          </Group>
          <Text c="dimmed" size="sm">
            Data refreshes every 60 seconds. Times shown in {TIMEZONE}.
          </Text>
          <Text c="dimmed" size="sm">
            <strong>Last run:</strong>{" "}
            {stats?.lastRunAt ? formatTimestamp(stats.lastRunAt) : "-"}
            {statsFetching ? " (refreshing...)" : ""}
          </Text>
          {statsError && (
            <Alert color="red">{(statsError as Error).message}</Alert>
          )}

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
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
          </SimpleGrid>

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
