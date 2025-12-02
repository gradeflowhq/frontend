import React, { useMemo } from 'react';
import { IconInbox } from '@components/ui/Icon';
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table';
import TableShell from '@components/common/TableShell';
import { usePaginationState } from '@hooks/usePaginationState';
import DecryptedText from '@components/common/encryptions/DecryptedText';
import AnswerText from '@components/common/AnswerText';
import type { RawSubmission } from '@features/submissions/types';
import { extractQuestionKeys } from '@features/submissions/helpers';
import { useAssessmentPassphrase } from '@features/encryption/AssessmentPassphraseProvider';

type SubmissionsTableProps = {
  items: RawSubmission[];
  initialPageSize?: number;
};

const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ items, initialPageSize = 10 }) => {
  const columnHelper = createColumnHelper<RawSubmission>();
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();

  const questionKeys = useMemo(() => extractQuestionKeys(items), [items]);

  const columns = useMemo(() => {
    const cols: any[] = [];

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
  }, [columnHelper, passphrase, notifyEncryptedDetected, questionKeys]);

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

  if (items.length === 0) {
    return (
      <div className="hero rounded-box bg-base-200 py-12">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold flex items-center justify-center">
              <IconInbox className="m-2" />
              No submissions
            </h1>
            <p className="py-2 opacity-70">Load submissions using the actions above.</p>
          </div>
        </div>
      </div>
    );
  }

  return <TableShell table={table} totalItems={items.length} />;
};

export default SubmissionsTable;