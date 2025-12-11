import { createColumnHelper, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import React, { useMemo } from 'react';

import TableShell from '@components/common/TableShell';
import { formatNumericValue, truncateText } from '@utils/format';

import { InfoRow, LoadingBadge } from './InfoRow';
import { type PreparedRow, type PreviewTab } from '../types';

type PreviewSectionProps = {
  mappedRows: PreparedRow[];
  unmappedRows: PreparedRow[];
  previewTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  loadingCourseData: boolean;
  gradeMode: 'points' | 'percent';
};

const PreviewSection: React.FC<PreviewSectionProps> = ({
  mappedRows,
  unmappedRows,
  previewTab,
  onTabChange,
  loadingCourseData,
  gradeMode,
}) => {
  const columnHelper = useMemo(() => createColumnHelper<PreparedRow>(), []);

  // Render a cell with primary value and optional original value if different
  const renderScoreCell = (primary?: number | null, secondary?: number | null) => {
    const formattedPrimary = formatNumericValue(primary);
    const formattedSecondary = formatNumericValue(secondary);
    const displayPrimary = formattedPrimary ?? '—';
    
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-xs">{displayPrimary}</span>
        {formattedSecondary !== undefined && formattedSecondary !== null && formattedSecondary !== formattedPrimary && (
          <span className="text-[11px] text-base-content/70">Original: {formattedSecondary}</span>
        )}
      </div>
    );
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('decryptedStudentId', {
        header: 'Student ID',
        cell: (info) => <span className="font-mono text-xs">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('studentName', {
        header: 'Name',
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.display({
        id: 'points',
        header: () => (
          <div className="flex items-center gap-2">
            <span>Points</span>
            {gradeMode === 'points' && <span className="badge badge-primary badge-xs">Used</span>}
          </div>
        ),
        cell: (info) => renderScoreCell(info.row.original.selectedPoints, info.row.original.originalPoints),
      }),
      columnHelper.display({
        id: 'percent',
        header: () => (
          <div className="flex items-center gap-2">
            <span>Percent</span>
            {gradeMode === 'percent' && <span className="badge badge-primary badge-xs">Used</span>}
          </div>
        ),
        cell: (info) => renderScoreCell(info.row.original.selectedPercent, info.row.original.originalPercent),
      }),
      columnHelper.display({
        id: 'comments',
        header: 'Comments',
        cell: (info) => {
          const remarks = truncateText(info.row.original.comments ?? '', 130);
          return <span className="text-xs whitespace-pre-wrap">{remarks || '—'}</span>;
        },
      }),
    ],
    [columnHelper, gradeMode]
  );

  const mappedTable = useReactTable({
    data: mappedRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5, pageIndex: 0 } },
  });

  const unmappedTable = useReactTable({
    data: unmappedRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5, pageIndex: 0 } },
  });

  const activeTable = previewTab === 'mapped' ? mappedTable : unmappedTable;
  const activeRows = previewTab === 'mapped' ? mappedRows : unmappedRows;

  return (
    <InfoRow
      title="Preview"
      description="Mapped and unmapped students."
      action={loadingCourseData ? <LoadingBadge label="Loading data" /> : undefined}
    >
      <div className="tabs tabs-lift">
        <button
          className={`tab ${previewTab === 'mapped' ? 'tab-active' : ''}`}
          onClick={() => onTabChange('mapped')}
        >
          Mapped ({mappedRows.length})
        </button>
        <button
          className={`tab ${previewTab === 'unmapped' ? 'tab-active' : ''}`}
          onClick={() => onTabChange('unmapped')}
        >
          Unmapped ({unmappedRows.length})
        </button>
      </div>

      <TableShell
        table={activeTable}
        totalItems={activeRows.length}
        paddingClassName="px-3 py-1"
        pinnedColumns={['Student ID']}
      />

      <div className="text-sm text-base-content/70">
        {mappedRows.length} mapped / {unmappedRows.length} unmapped students.
      </div>
    </InfoRow>
  );
};

export default PreviewSection;
