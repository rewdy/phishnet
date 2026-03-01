import {
  Alert,
  Box,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconMail,
  IconRoute,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import { PAGE_SIZE_OPTIONS } from "../helpers/options";
import { formatTimestamp } from "../helpers/time";
import { useRunsTable } from "../hooks/use-runs-table";

/**
 * Renders the paginated runs table and its controls.
 */
export function RunsTable() {
  const {
    limit,
    page,
    totalPages,
    data,
    isLoading,
    isFetching,
    error,
    setPage,
    handleLimitChange,
  } = useRunsTable();

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group>
          <Select
            label="Rows per page"
            data={PAGE_SIZE_OPTIONS}
            value={String(limit)}
            onChange={handleLimitChange}
            w={{ base: "100%", sm: 140 }}
          />
          <Text size="sm" c="dimmed">
            {data ? `Total runs: ${data.total}` : "Total runs: -"}
          </Text>
        </Group>
        {isFetching && <Loader size="sm" />}
      </Group>

      {error ? <Alert color="red">{(error as Error).message}</Alert> : null}

      <Box visibleFrom="sm">
        <Paper withBorder p="sm" radius="md">
          {isLoading ? (
            <Loader />
          ) : (
            <Table.ScrollContainer minWidth={920} type="native">
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
            </Table.ScrollContainer>
          )}
        </Paper>
      </Box>

      <Box hiddenFrom="sm">
        <Stack gap="sm">
          {isLoading ? (
            <Loader />
          ) : (
            (data?.items ?? []).map((run) => (
              <Paper key={run.id} withBorder p="md" radius="md">
                <Stack gap={6}>
                  <Group justify="space-between" align="center">
                    <Text fw={700}>Run #{run.id}</Text>
                    <Text size="sm" c="dimmed">
                      {run.status}
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    Started: {formatTimestamp(run.startedAt)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Completed: {formatTimestamp(run.completedAt)}
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    <ThemeIcon variant="light" size="sm">
                      <IconMail size={14} />
                    </ThemeIcon>
                    <Text size="sm">Scanned: {run.messagesScanned}</Text>
                    <ThemeIcon variant="light" size="sm">
                      <IconShieldCheck size={14} />
                    </ThemeIcon>
                    <Text size="sm">Classified: {run.messagesClassified}</Text>
                  </Group>
                  <Group gap="xs" wrap="wrap">
                    <ThemeIcon variant="light" size="sm">
                      <IconRoute size={14} />
                    </ThemeIcon>
                    <Text size="sm">Moved: {run.messagesMoved}</Text>
                    <ThemeIcon variant="light" size="sm">
                      <IconX size={14} />
                    </ThemeIcon>
                    <Text size="sm">Failed: {run.messagesFailed}</Text>
                  </Group>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Box>

      <Pagination value={page} onChange={setPage} total={totalPages} />
    </Stack>
  );
}
