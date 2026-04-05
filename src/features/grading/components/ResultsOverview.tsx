import { Button, Group, Stack, Progress, Badge, Text } from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import React, { useMemo, useState } from 'react';

import DecryptedText from '@components/common/encryptions/DecryptedText';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';

import type { AdjustableSubmission } from '../types';
import type { DataTableColumn } from 'mantine-datatable';

type Props = {
  items: AdjustableSubmission[];
  questionIds: string[];
  onView: (studentId: string) => void;
  initialPageSize?: number;
  searchQuery?: string;
};

type RowT = AdjustableSubmission;

const ResultsOverview: React.FC<Props> = ({
  items,
  questionIds,
  onView,
  initialPageSize = 10,
  searchQuery = '',
}) => {
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = initialPageSize;

  const studentIds = useMemo(() => items.map((it) => it.student_id ?? ''), [items]);
  const { decryptedIds, isDecrypting } = useDecryptedIds(studentIds, passphrase, notifyEncryptedDetected);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const original = it.student_id ?? '';
      const plain = decryptedIds[original] ?? original;
      return plain.toLowerCase().includes(q);
    });
  }, [items, decryptedIds, searchQuery]);

  // Reset to page 1 when search changes
  React.useEffect(() => { setPage(1); }, [searchQuery]);

  const columns = useMemo(() => {
    const cols: DataTableColumn<RowT>[] = [];

    cols.push({
      accessor: 'student_id',
      title: 'Student ID',
      render: (row) => (
        <DecryptedText
          value={row.student_id}
          passphrase={passphrase}
          mono
          size="sm"
          showSkeletonWhileDecrypting={isDecrypting}
        />
      ),
    });

    for (const qid of questionIds) {
      cols.push({
        accessor: `q:${qid}` as keyof RowT,
        title: qid,
        render: (row) => {
          const r = row.result_map?.[qid];
          if (!r) return <Text span>—</Text>;
          const adjustedExists = r.adjusted_points !== undefined && r.adjusted_points !== null;
          const pointsDisplay = adjustedExists ? (r.adjusted_points as number) : r.points;
          const maxPoints = r.max_points ?? 0;

          return (
            <div style={adjustedExists ? { backgroundColor: 'var(--mantine-color-yellow-0)', margin: '-4px', padding: '4px', borderRadius: 4 } : undefined}>
              {!r.graded ? (
                <Badge color="yellow">Ungraded</Badge>
              ) : (
                <Stack gap={2}>
                  <Text ff="monospace" size="sm">{pointsDisplay}/{maxPoints}</Text>
                  {adjustedExists && (
                    <Text ff="monospace" size="xs" c="dimmed">Original: {r.points} / {maxPoints}</Text>
                  )}
                </Stack>
              )}
            </div>
          );
        },
      });
    }

    cols.push({
      accessor: 'total',
      title: 'Total',
      render: (row) => {
        const resultValues = Object.values(row.result_map ?? {});
        const totalPoints = resultValues.reduce((sum, r) => sum + ((r.adjusted_points ?? r.points) ?? 0), 0);
        const totalMax = resultValues.reduce((sum, r) => sum + (r.max_points ?? 0), 0);
        const pct = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0;
        return (
          <Stack gap={4}>
            <Text ff="monospace" size="sm">{totalPoints}/{totalMax}</Text>
            <Group gap="xs">
              <Progress value={pct} size="sm" style={{ flex: 1, minWidth: 80 }} />
              <Text ff="monospace" size="xs">{pct}%</Text>
            </Group>
          </Stack>
        );
      },
    });

    cols.push({
      accessor: 'actions',
      title: 'Actions',
      render: (row) => (
        <Button size="sm" variant="subtle" leftSection={<IconEye size={14} />} onClick={() => onView(row.student_id)}>
          View
        </Button>
      ),
    });

    return cols;
  }, [passphrase, questionIds, onView, isDecrypting]);

  const records = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DataTable
      columns={columns}
      records={records}
      totalRecords={filteredItems.length}
      recordsPerPage={PAGE_SIZE}
      page={page}
      onPageChange={setPage}
      striped
      highlightOnHover
      pinFirstColumn
      pinLastColumn
    />
  );
};

export default ResultsOverview;
