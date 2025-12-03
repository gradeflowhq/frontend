import React, { useMemo } from 'react';
import { Button } from '@components/ui/Button';
import { IconEye } from '@components/ui/Icon';
import DecryptedText from '@components/common/encryptions/DecryptedText';
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import TableShell from '@components/common/TableShell';
import { usePaginationState } from '@hooks/usePaginationState';
import type { AdjustableGradedSubmission, AdjustableQuestionResult } from '../types';
import { useAssessmentPassphrase } from '@features/encryption/AssessmentPassphraseProvider';

type Props = {
  items: AdjustableGradedSubmission[];
  questionIds: string[];
  onView: (studentId: string) => void; // caller decides how to navigate
  initialPageSize?: number;
};

type RowT = AdjustableGradedSubmission;

const ResultsOverview: React.FC<Props> = ({ items, questionIds, onView, initialPageSize = 10 }) => {
  const { passphrase } = useAssessmentPassphrase();
  const columnHelper = createColumnHelper<RowT>();

  const renderPercentBar = (value: number, max: number) => {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
      <div className="mt-1 flex items-center gap-2">
        <progress className="progress progress-primary w-24" value={pct} max={100} />
        <span className="text-xs font-mono">{pct}%</span>
      </div>
    );
  };

  const columns = useMemo(() => {
    const cols: any[] = [];

    // Student ID
    cols.push(
      columnHelper.display({
        id: 'student_id',
        header: 'Student ID',
        cell: ({ row }) => (
          <DecryptedText value={row.original.student_id} passphrase={passphrase} mono size="sm" />
        ),
      })
    );

    // Per-question columns
    for (const qid of questionIds) {
      cols.push(
        columnHelper.display({
          id: `q:${qid}`,
          header: <span className="font-mono text-xs">{qid}</span>,
          cell: ({ row }) => {
            const resMap = new Map<string, AdjustableQuestionResult>();
            (row.original.results ?? []).forEach((r) => resMap.set(r.question_id, r));
            const r = resMap.get(qid);
            if (!r) return <span>—</span>;
            const adjustedExists = r.adjusted_points !== undefined && r.adjusted_points !== null;
            const pointsDisplay = adjustedExists ? (r.adjusted_points as number) : r.points;
            const maxPoints = r.max_points ?? 0;
            const graded = r.graded;

            return (
              <div className={adjustedExists ? 'bg-warning/10 -m-1 p-1 rounded' : ''}>
                <div className="flex flex-col">
                  {!graded ? (
                    <span className="badge badge-warning">Ungraded</span>
                  ) : (
                    <>
                      <span className="font-mono text-sm">
                        {pointsDisplay} / {maxPoints}
                      </span>
                      {adjustedExists && (
                        <span className="font-mono text-[11px] opacity-70">
                          Original: {r.points} / {maxPoints}
                        </span>
                      )}
                      {renderPercentBar(pointsDisplay ?? 0, maxPoints)}
                    </>
                  )}
                </div>
              </div>
            );
          },
        })
      );
    }

    // Total column
    cols.push(
      columnHelper.display({
        id: 'total',
        header: 'Total',
        cell: ({ row }) => {
          const totalPoints = (row.original.results ?? []).reduce(
            (sum, r) => sum + (r.adjusted_points ?? r.points),
            0
          );
          const totalMax = (row.original.results ?? []).reduce(
            (sum, r) => sum + (r.max_points ?? 0),
            0
          );
          return (
            <div className="flex flex-col">
              <span className="font-mono text-sm">
                {totalPoints} / {totalMax}
              </span>
              {renderPercentBar(totalPoints, totalMax)}
            </div>
          );
        },
      })
    );

    // Actions
    cols.push(
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button size="sm" onClick={() => onView(row.original.student_id)} leftIcon={<IconEye />}>
            View
          </Button>
        ),
      })
    );

    return cols;
  }, [columnHelper, passphrase, questionIds, onView]);

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

  return <TableShell table={table} totalItems={items.length} />;
};

export default ResultsOverview;