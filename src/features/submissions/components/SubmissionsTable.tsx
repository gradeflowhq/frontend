import React, { useMemo } from 'react';
import { IconInbox } from '@components/ui/Icon';
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  type ColumnDef,
  useReactTable,
} from '@tanstack/react-table';
import TableShell from '@components/common/TableShell';
import EmptyState from '@components/common/EmptyState';
import { usePaginationState } from '@hooks/usePaginationState';
import DecryptedText from '@components/common/encryptions/DecryptedText';
import AnswerText from '@components/common/AnswerText';
import type { RawSubmission } from '@features/submissions/types';
import { extractQuestionKeys } from '@features/submissions/helpers';
import { useAssessmentPassphrase } from '@features/encryption/passphraseContext';

type SubmissionsTableProps = {
  items: RawSubmission[];
  initialPageSize?: number;
  isLoading?: boolean;
  isDecryptingIds?: boolean;
};

const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ items, initialPageSize = 10, isLoading = false, isDecryptingIds = false }) => {
  const columnHelper = createColumnHelper<RawSubmission>();
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();

  const questionKeys = useMemo(() => extractQuestionKeys(items), [items]);

  const columns = useMemo(() => {
    const cols: ColumnDef<RawSubmission>[] = [];

    cols.push(
      columnHelper.display({
        id: 'student_id',
        header: 'Student ID',
        cell: ({ row }) => {
          const sid = row.original.student_id;
          return (
            <div className="flex items-center">
              <DecryptedText
                value={sid}
                passphrase={passphrase}
                mono
                size="sm"
                showSkeletonWhileDecrypting={isDecryptingIds}
                onEncryptedDetected={notifyEncryptedDetected}
              />
            </div>
          );
        },
      })
    );

    for (const qKey of questionKeys) {
      cols.push(
        columnHelper.display({
          id: `q:${qKey}`,
          header: qKey,
          cell: ({ row }) => {
            const map = row.original.raw_answer_map ?? {};
            const value = map[qKey];
            return (
              <div>
                <span className="font-mono text-xs">
                  <AnswerText value={value} maxLength={100} />
                </span>
              </div>
            );
          },
        })
      );
    }

    return cols;
  }, [columnHelper, isDecryptingIds, notifyEncryptedDetected, passphrase, questionKeys]);

  const { pagination, setPagination } = usePaginationState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data: items,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.student_id,
  });

  if (!isLoading && items.length === 0) {
    return (
      <EmptyState
        icon={<IconInbox />}
        title="No submissions"
        description="Load submissions using the actions above."
      />
    );
  }

  return (
    <TableShell
      table={table}
      totalItems={items.length}
      pinnedColumns={['Student ID']}
      isLoading={isLoading}
    />
  );
};

export default SubmissionsTable;