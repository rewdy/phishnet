import {
  Alert,
  Badge,
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
        <Group align="flex-end" wrap="wrap">
          <Select
            label="Rows per page"
            data={PAGE_SIZE_OPTIONS}
            value={String(limit)}
            onChange={handleLimitChange}
            w={140}
          />
          <Select
            label="Final action"
            value={finalAction}
            onChange={(value) => {
              if (!value) return;
              setFinalAction(value as FinalActionFilter);
            }}
            data={FINAL_ACTION_FILTER_OPTIONS}
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
            }}
            data={ERROR_FILTER_OPTIONS}
            w={160}
          />
          <TextInput
            label="Sender contains"
            placeholder="example@domain.com"
            value={fromFilter}
            onChange={(event) => {
              setFromFilter(event.currentTarget.value);
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

      {error ? <Alert color="red">{(error as Error).message}</Alert> : null}

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
