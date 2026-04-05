import { Group, Select, Text, Stack } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import React, { useMemo, useState } from 'react';

import AnswerText from '@components/common/AnswerText';
import DecryptedText from '@components/encryption/DecryptedText';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { extractQuestionKeys } from '@features/submissions/helpers';

import type { RawSubmission } from '@features/submissions/types';
import type { DataTableColumn, DataTableSortStatus } from 'mantine-datatable';

type SubmissionsTableProps = {
  items: RawSubmission[];
  initialPageSize?: number;
  isLoading?: boolean;
  isDecryptingIds?: boolean;
};

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  items,
  initialPageSize = 10,
  isLoading = false,
  isDecryptingIds = false,
}) => {
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<RawSubmission>>({
    columnAccessor: 'student_id',
    direction: 'asc',
  });

  const questionKeys = useMemo(() => extractQuestionKeys(items), [items]);

  const sortedItems = useMemo(() => {
    const key = sortStatus.columnAccessor as string;
    const dir = sortStatus.direction === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      if (key === 'student_id') {
        return String(a.student_id ?? '').localeCompare(String(b.student_id ?? '')) * dir;
      }
      if (key.startsWith('q:')) {
        const qid = key.slice(2);
        const av = String((a.raw_answer_map ?? {})[qid] ?? '');
        const bv = String((b.raw_answer_map ?? {})[qid] ?? '');
        return av.localeCompare(bv) * dir;
      }
      return 0;
    });
  }, [items, sortStatus]);

  React.useEffect(() => {
    setPage(1);
  }, [sortStatus, items]);

  const columns = useMemo(() => {
    const cols: DataTableColumn<RawSubmission>[] = [];

    cols.push({
      accessor: 'student_id',
      title: 'Student ID',
      sortable: true,
      render: (row) => (
        <DecryptedText
          value={row.student_id}
          passphrase={passphrase}
          mono
          size="sm"
          showSkeletonWhileDecrypting={isDecryptingIds}
          onEncryptedDetected={notifyEncryptedDetected}
        />
      ),
    });

    for (const qKey of questionKeys) {
      cols.push({
        accessor: `q:${qKey}` as keyof RawSubmission,
        title: qKey,
        sortable: true,
        render: (row) => {
          const map = row.raw_answer_map ?? {};
          const value = map[qKey];
          const result = (row.result_map ?? {})[qKey];
          return (
            <Stack gap={2}>
              <Text ff="monospace" size="xs">
                <AnswerText value={value} maxLength={100} />
              </Text>
              {result != null && (
                <Text size="xs" c="blue.7" fw={500}>{result.points} pts</Text>
              )}
            </Stack>
          );
        },
      });
    }

    return cols;
  }, [isDecryptingIds, notifyEncryptedDetected, passphrase, questionKeys]);

  const records = sortedItems.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Stack gap="md">
      <DataTable
        columns={columns}
        records={records}
        totalRecords={items.length}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={setPage}
        sortStatus={sortStatus}
        onSortStatusChange={(s) => setSortStatus(s as DataTableSortStatus<RawSubmission>)}
        fetching={isLoading}
        highlightOnHover
        pinFirstColumn
      />
      <Group justify="flex-end" align="center">
        <Group gap="xs" align="center">
          <Text size="xs" fw={600}>Per page</Text>
          <Select
            size="xs"
            w={88}
            data={PAGE_SIZE_OPTIONS}
            value={String(pageSize)}
            onChange={(v) => { setPageSize(Number(v ?? '10')); setPage(1); }}
          />
        </Group>
      </Group>
    </Stack>
  );
};

export default SubmissionsTable;