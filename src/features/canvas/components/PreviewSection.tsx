import { createColumnHelper, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import React, { useCallback, useMemo } from 'react';

import TableShell from '@components/common/TableShell';
import { InfoRow, LoadingBadge } from './InfoRow';
import { type PreviewRow, type PreviewTab } from '../types';

type PreviewSectionProps = {
  mappedRows: PreviewRow[];
  unmappedRows: PreviewRow[];
  previewTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  loadingCourseData: boolean;
  gradeMode: 'points' | 'percent';
  roundingEnabled: boolean;
};

const PreviewSection: React.FC<PreviewSectionProps> = ({
  mappedRows,
  unmappedRows,
  previewTab,
  onTabChange,
  loadingCourseData,
  gradeMode,
  roundingEnabled,
}) => {
  const columnHelper = useMemo(() => createColumnHelper<PreviewRow>(), []);

  const formatScore = useCallback((value?: number | string, suffix?: string) => {
    if (value === undefined || value === null || value === '') return '—';
    const asNum = typeof value === 'string' ? Number(value) : value;
    const base = Number.isFinite(asNum) ? Number(asNum).toFixed(2).replace(/\.0+$/, '').replace(/\.([1-9]*)0+$/, '.$1') : String(value);
    return suffix ? `${base}${suffix}` : base;
  }, []);

  const renderPointsCell = useCallback(
    (row: PreviewRow) => {
      const primary = roundingEnabled ? row.roundedPoints ?? row.points : row.points ?? row.roundedPoints;
      const secondary = !roundingEnabled ? undefined : row.points ?? row.roundedPoints;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs">{formatScore(primary, ' pts')}</span>
          {secondary !== undefined && secondary !== null && secondary !== primary && (
            <span className="text-[11px] text-base-content/70">Raw: {formatScore(secondary, ' pts')}</span>
          )}
        </div>
      );
    },
    [formatScore, roundingEnabled]
  );

  const renderPercentCell = useCallback(
    (row: PreviewRow) => {
      const primary = roundingEnabled ? row.roundedPercent ?? row.percent : row.percent ?? row.roundedPercent;
      const secondary = !roundingEnabled ? undefined : row.percent ?? row.roundedPercent;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs">{formatScore(primary, '%')}</span>
          {secondary !== undefined && secondary !== null && secondary !== primary && (
            <span className="text-[11px] text-base-content/70">Raw: {formatScore(secondary, '%')}</span>
          )}
        </div>
      );
    },
    [formatScore, roundingEnabled]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('gradeflowId', {
        header: 'GradeFlow ID',
        cell: (info) => <span className="font-mono text-xs">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('canvasId', {
        header: 'Canvas ID',
        cell: (info) => <span className="font-mono text-xs">{info.getValue() || 'Unmapped'}</span>,
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
            {roundingEnabled && <span className="badge badge-outline badge-xs">Rounded</span>}
          </div>
        ),
        cell: (info) => renderPointsCell(info.row.original),
      }),
      columnHelper.display({
        id: 'percent',
        header: () => (
          <div className="flex items-center gap-2">
            <span>Percent</span>
            {gradeMode === 'percent' && <span className="badge badge-primary badge-xs">Used</span>}
            {roundingEnabled && <span className="badge badge-outline badge-xs">Rounded</span>}
          </div>
        ),
        cell: (info) => renderPercentCell(info.row.original),
      }),
      columnHelper.accessor('remarks', {
        header: 'Remarks',
        cell: (info) => <span className="text-xs whitespace-pre-wrap">{info.getValue() ?? '—'}</span>,
      }),
    ],
    [columnHelper, renderPercentCell, renderPointsCell, gradeMode, roundingEnabled]
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
      action={loadingCourseData ? <LoadingBadge label="Loading roster" /> : undefined}
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

      <TableShell table={activeTable} totalItems={activeRows.length} paddingClassName="px-3 py-1" />

      <div className="text-sm text-base-content/70">
        {mappedRows.length} mapped / {unmappedRows.length} unmapped students.
      </div>
    </InfoRow>
  );
};

export default PreviewSection;
