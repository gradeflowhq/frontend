import React, { useMemo } from 'react';
import { IconInbox } from '@components/ui/Icon';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import DecryptedText from '@components/common/encryptions/DecryptedText';
import type { RawSubmission } from '@features/submissions/types';
import { extractQuestionKeys } from '@features/submissions/helpers';

type SubmissionsTableProps = {
  items: RawSubmission[];
  passphrase?: string | null;
  onEncryptionDetected?: () => void;
};

const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ items, passphrase, onEncryptionDetected }) => {
  const columnHelper = createColumnHelper<RawSubmission>();

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
                onEncryptedDetected={onEncryptionDetected}
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
            const display =
              Array.isArray(value)
                ? JSON.stringify(value)
                : typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : String(value ?? '');
            return (
              <div className="max-w-xs truncate" title={display}>
                <span className="font-mono text-xs">{display}</span>
              </div>
            );
          },
        })
      );
    }

    return cols;
  }, [columnHelper, passphrase, onEncryptionDetected, questionKeys]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
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

  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100 shadow-xs">
      <table className="table table-zebra w-full">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubmissionsTable;