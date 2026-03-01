import {
  Alert,
  Badge,
  Box,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconAt,
  IconCalendarEvent,
  IconError404,
  IconInfoCircle,
} from "@tabler/icons-react";
import { actionColor } from "../helpers/action-color";
import {
  ERROR_FILTER_OPTIONS,
  FINAL_ACTION_FILTER_OPTIONS,
  PAGE_SIZE_OPTIONS,
} from "../helpers/options";
import { formatTimestamp } from "../helpers/time";
import { useDecisionsTable } from "../hooks/use-decisions-table";
import type { FinalActionFilter } from "../models/filters";

/**
 * Renders the paginated decisions table and its filters.
 */
export function DecisionsTable() {
  const {
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
    setFromFilter,
    setFinalAction,
    setHasError,
    handleLimitChange,
  } = useDecisionsTable();

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Group align="flex-end" wrap="wrap" w={{ base: "100%", sm: "auto" }}>
          <Select
            label="Rows per page"
            data={PAGE_SIZE_OPTIONS}
            value={String(limit)}
            onChange={handleLimitChange}
            w={{ base: "100%", sm: 140 }}
          />
          <Select
            label="Final action"
            value={finalAction}
            onChange={(value) => {
              if (!value) return;
              setFinalAction(value as FinalActionFilter);
            }}
            data={FINAL_ACTION_FILTER_OPTIONS}
            w={{ base: "100%", sm: 180 }}
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
            }}
            data={ERROR_FILTER_OPTIONS}
            w={{ base: "100%", sm: 160 }}
          />
          <TextInput
            label="Sender contains"
            placeholder="example@domain.com"
            value={fromFilter}
            onChange={(event) => {
              setFromFilter(event.currentTarget.value);
            }}
            w={{ base: "100%", sm: 280 }}
          />
        </Group>
        <Group>
          <Text size="sm" c="dimmed">
            {data ? `Total decisions: ${data.total}` : "Total decisions: -"}
          </Text>
          {isFetching && <Loader size="sm" />}
        </Group>
      </Group>

      {error ? <Alert color="red">{(error as Error).message}</Alert> : null}

      <Box visibleFrom="sm">
        <Paper withBorder p="sm" radius="md">
          {isLoading ? (
            <Loader />
          ) : (
            <Table.ScrollContainer minWidth={1180} type="native">
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
            </Table.ScrollContainer>
          )}
        </Paper>
      </Box>

      <Box hiddenFrom="sm">
        <Stack gap="sm">
          {isLoading ? (
            <Loader />
          ) : (
            (data?.items ?? []).map((decision) => (
              <Paper key={decision.id} withBorder p="md" radius="md">
                <Stack gap={8}>
                  <Group justify="space-between" align="center">
                    <Text fw={700}>Decision #{decision.id}</Text>
                    <Badge
                      color={actionColor(decision.finalAction)}
                      variant="light"
                    >
                      {decision.finalAction}
                    </Badge>
                  </Group>
                  <Group gap={6} wrap="nowrap">
                    <IconCalendarEvent size={16} />
                    <Text size="sm">{formatTimestamp(decision.createdAt)}</Text>
                  </Group>
                  <Group gap={6} wrap="nowrap">
                    <IconAt size={16} />
                    <Text size="sm" style={{ wordBreak: "break-word" }}>
                      {decision.fromValue}
                    </Text>
                  </Group>
                  <Text size="sm" fw={500}>
                    {decision.subjectText ?? "(no subject)"}
                  </Text>
                  <Text size="sm" c="dimmed">
                    UID: {decision.imapUid} | Confidence:{" "}
                    {decision.modelConfidence === null
                      ? "-"
                      : decision.modelConfidence.toFixed(2)}
                  </Text>
                  {decision.reasonCode ? (
                    <Group gap={6} wrap="nowrap">
                      <IconInfoCircle size={16} />
                      <Text size="sm">{decision.reasonCode}</Text>
                    </Group>
                  ) : null}
                  {decision.errorMessage ? (
                    <Group gap={6} wrap="nowrap">
                      <IconError404 size={16} />
                      <Text size="sm" c="red">
                        {decision.errorMessage}
                      </Text>
                    </Group>
                  ) : null}
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
