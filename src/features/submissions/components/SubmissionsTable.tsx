import { Text, Stack } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import React, { useMemo, useState } from 'react';

import AnswerText from '@components/common/AnswerText';
import DecryptedText from '@components/common/encryptions/DecryptedText';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { extractQuestionKeys } from '@features/submissions/helpers';

import type { RawSubmission } from '@features/submissions/types';
import type { DataTableColumn } from 'mantine-datatable';

type SubmissionsTableProps = {
  items: RawSubmission[];
  initialPageSize?: number;
  isLoading?: boolean;
  isDecryptingIds?: boolean;
};

const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ items, initialPageSize = 10, isLoading = false, isDecryptingIds = false }) => {
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = initialPageSize;

  const questionKeys = useMemo(() => extractQuestionKeys(items), [items]);

  const columns = useMemo(() => {
    const cols: DataTableColumn<RawSubmission>[] = [];

    cols.push({
      accessor: 'student_id',
      title: 'Student ID',
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

  const records = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DataTable
      columns={columns}
      records={records}
      totalRecords={items.length}
      recordsPerPage={PAGE_SIZE}
      page={page}
      onPageChange={setPage}
      fetching={isLoading}
      striped
      highlightOnHover
      pinFirstColumn
    />
  );
};

export default SubmissionsTable;
