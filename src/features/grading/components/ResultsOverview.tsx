import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@api';
import { Button } from '@components/ui/Button';
import { IconEye, IconSearch } from '@components/ui/Icon';
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
import { useDecryptedIds } from '@features/encryption/useDecryptedIds';
import ResultsDownloadDropdown from './ResultsDownloadDropdown';
import ResultsDownloadModal from './ResultsDownloadModal';

type Props = {
  assessmentId: string;
  gradingInProgress: boolean;
  items: AdjustableGradedSubmission[];
  questionIds: string[];
  onView: (studentId: string) => void; // caller decides how to navigate
  initialPageSize?: number;
};

type RowT = AdjustableGradedSubmission;

const ResultsOverview: React.FC<Props> = ({
  assessmentId,
  gradingInProgress,
  items,
  questionIds,
  onView,
  initialPageSize = 10,
}) => {
  const { passphrase, notifyEncryptedDetected } = useAssessmentPassphrase();
  const [searchQuery, setSearchQuery] = useState('');
  const [openDownload, setOpenDownload] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const columnHelper = createColumnHelper<RowT>();

  const studentIds = useMemo(() => items.map((it) => it.student_id ?? ''), [items]);
  const decryptedIds = useDecryptedIds(studentIds, passphrase, notifyEncryptedDetected);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const original = it.student_id ?? '';
      const plain = decryptedIds[original] ?? original;
      return plain.toLowerCase().includes(q);
    });
  }, [items, decryptedIds, searchQuery]);

  // Fetch available download serializers from registry (CSV/JSON/YAML, etc.)
  const { data: serializerRegistry } = useQuery({
    queryKey: ['registry', 'gradedSubmissionsSerializers'],
    queryFn: async () => (await api.gradedSubmissionsSerializersRegistrySerializersGradedSubmissionsGet()).data as string[],
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });

  const formats = useMemo<string[]>(() => {
    if (Array.isArray(serializerRegistry) && serializerRegistry.length > 0) return serializerRegistry;
    // Fallback to CSV if registry is empty/unavailable
    return ['CSV'];
  }, [serializerRegistry]);

  const hasItems = (items?.length ?? 0) > 0;
  const canDownload = hasItems || gradingInProgress;

  const openFormatModal = (fmt: string) => {
    setSelectedFormat(fmt);
    setOpenDownload(true);
  };

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
          header: () => <span className="font-mono text-xs">{qid}</span>,
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
    data: filteredItems,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.student_id,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="input input-bordered flex items-center gap-2">
          <IconSearch className="h-4 w-4 opacity-60" />
          <input
            type="search"
            className="w-full grow bg-transparent focus:outline-none"
            placeholder="Search by Student ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
        <ResultsDownloadDropdown
          formats={formats}
          canDownload={canDownload}
          onSelect={openFormatModal}
        />
      </div>

      <TableShell table={table} totalItems={filteredItems.length} />

      <ResultsDownloadModal
        open={openDownload}
        assessmentId={assessmentId}
        onClose={() => {
          setOpenDownload(false);
          setSelectedFormat(null);
        }}
        selectedFormat={selectedFormat ?? undefined}
      />
    </div>
  );
};

export default ResultsOverview;