import React, { useState, useCallback, useMemo } from 'react';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import TableShell from '@components/common/TableShell';
import { usePaginationState } from '@hooks/usePaginationState';
import Papa from 'papaparse';
import ErrorAlert from '@components/common/ErrorAlert';
import LoadingButton from '@components/ui/LoadingButton';
import { IconChevronRight } from '@components/ui/Icon';
import { buildPassphraseKey, readPassphrase, writePassphrase } from '@utils/passphrase';
import { arraysEqual } from '@features/submissions/utils/questionColumnInference';
import { buildSourceCsv } from '@features/submissions/helpers';
import { useToast } from '@components/common/ToastProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';

import type { CsvPreview, PassphraseContext } from '@features/submissions/types';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// ---------------------------------------------------------------------------
// Row range controls
// ---------------------------------------------------------------------------
const RowRangeControls: React.FC<{
  totalRows: number;
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number | '';
  onChange: (next: { headerRow?: number; dataStartRow?: number; dataEndRow?: number | '' }) => void;
}> = ({ totalRows, headerRow, dataStartRow, dataEndRow, onChange }) => (
  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="form-control">
      <label className="label"><span className="label-text">Header row (1-based)</span></label>
      <input
        type="number" min={1} max={totalRows} className="input input-bordered w-full"
        value={headerRow} onChange={(e) => onChange({ headerRow: Number(e.target.value) || 1 })}
      />
      <div className="text-xs opacity-70 mt-1">Row containing column headers.</div>
    </div>
    <div className="form-control">
      <label className="label"><span className="label-text">Body start row (1-based)</span></label>
      <input
        type="number" min={1} max={totalRows} className="input input-bordered w-full"
        value={dataStartRow} onChange={(e) => onChange({ dataStartRow: Number(e.target.value) || 1 })}
      />
      <div className="text-xs opacity-70 mt-1">First data row (typically header+1).</div>
    </div>
    <div className="form-control">
      <label className="label"><span className="label-text">Body end row (optional)</span></label>
      <input
        type="number" min={1} max={totalRows} className="input input-bordered w-full"
        value={dataEndRow === '' ? '' : dataEndRow}
        onChange={(e) => { const v = e.target.value; onChange({ dataEndRow: v === '' ? '' : Number(v) }); }}
        placeholder={`Blank = last row (${totalRows})`}
      />
      <div className="text-xs opacity-70 mt-1">Last row to include. Blank = all.</div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// CSV preview table (paginated, matches list tab style)
// ---------------------------------------------------------------------------
type CsvRow = Record<string, string>;

const CsvPreviewTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => {
  const data = useMemo<CsvRow[]>(
    () => rows.map((r) => Object.fromEntries(r.map((v, i) => [`col${i}`, v]))),
    [rows],
  );

  const columns = useMemo<ColumnDef<CsvRow>[]>(
    () =>
      headers.map((h, i) => ({
        id: `col${i}`,
        header: h,
        accessorKey: `col${i}`,
        cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
      })),
    [headers],
  );

  const { pagination, setPagination } = usePaginationState({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (_, i) => String(i),
  });

  return <TableShell table={table} totalItems={data.length} className="mt-4" />;
};

// ---------------------------------------------------------------------------
// Upload step
// ---------------------------------------------------------------------------
export const UploadStep: React.FC<{
  assessmentId: string;
  hasExistingSource: boolean;
  onNext: () => void;
}> = ({ assessmentId, hasExistingSource, onNext }) => {
  const [rawGrid, setRawGrid] = useState<string[][] | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [studentIdColumn, setStudentIdColumn] = useState('');
  const [headerRow, setHeaderRow] = useState(1);
  const [dataStartRow, setDataStartRow] = useState(2);
  const [dataEndRow, setDataEndRow] = useState<number | ''>('');

  const storageKey = buildPassphraseKey(assessmentId);
  const [encryptIds, setEncryptIds] = useState(false);
  const [passphrase, setPassphrase] = useState(() => readPassphrase(storageKey) ?? '');
  const [storePassphrase, setStorePassphrase] = useState(() => !!readPassphrase(storageKey));

  const toast = useToast();
  const qc = useQueryClient();

  const recomputePreview = useCallback(
    (overrides: Partial<{ rawGrid: string[][] | null; headerRow: number; dataStartRow: number; dataEndRow: number | '' }> = {}) => {
      const grid = overrides.rawGrid ?? rawGrid;
      const hdrRow = overrides.headerRow ?? headerRow;
      const startRow = overrides.dataStartRow ?? dataStartRow;
      const endRow = overrides.dataEndRow !== undefined ? overrides.dataEndRow : dataEndRow;

      if (!grid || grid.length === 0) {
        setPreview(null);
        setStudentIdColumn('');
        return;
      }

      const totalRows = grid.length;
      const hdrRow1b = clamp(hdrRow || 1, 1, totalRows);
      const start1b = clamp(startRow || hdrRow1b + 1, 1, totalRows);
      const end1b = typeof endRow === 'number' && endRow > 0 ? clamp(endRow, 1, totalRows) : totalRows;
      const effectiveStart = Math.max(start1b, hdrRow1b + 1);
      const effectiveEnd = Math.max(end1b, effectiveStart - 1);

      const nextHeaders = (grid[hdrRow1b - 1] ?? []).map(String);
      const nextRows = grid.slice(effectiveStart - 1, effectiveEnd).map((r) => r.map(String));

      setPreview((prev) => {
        if (!prev) return { headers: nextHeaders, rows: nextRows };
        const compact = (arr: string[][], n: number) => arr.slice(0, n).map((r) => r.join('\u0001'));
        if (arraysEqual(prev.headers, nextHeaders) && arraysEqual(compact(prev.rows, 10), compact(nextRows, 10))) return prev;
        return { headers: nextHeaders, rows: nextRows };
      });

      setStudentIdColumn((prev) => {
        if (prev && nextHeaders.includes(prev)) return prev;
        const guess = nextHeaders.find((h) => /student.?id|sid|id/i.test(h));
        return guess ?? nextHeaders[0] ?? '';
      });
    },
    [rawGrid, headerRow, dataStartRow, dataEndRow],
  );

  const onSelectFile = (f: File | null) => {
    setRawGrid(null);
    setPreview(null);
    setStudentIdColumn('');
    if (!f) return;
    Papa.parse(f, {
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as string[][];
        if (!data?.length) { setRawGrid([]); return; }
        setRawGrid(data);
        setHeaderRow(1); setDataStartRow(2); setDataEndRow('');
        recomputePreview({ rawGrid: data, headerRow: 1, dataStartRow: 2, dataEndRow: '' });
      },
      error: () => { setRawGrid(null); setPreview(null); },
    });
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ csv, studentIdColumn }: { csv: string; studentIdColumn: string }) =>
      (await api.uploadSourceDataAssessmentsAssessmentIdSubmissionsSourcePut(assessmentId, {
        data: csv,
        student_id_column: studentIdColumn,
      })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.submissions.source(assessmentId) });
      onNext();
    },
    onError: () => toast.error('Upload failed'),
  });

  const canNext = !!preview && !!studentIdColumn && (!encryptIds || !!passphrase);

  const handleNext = () => {
    void (async () => {
      if (!preview || !studentIdColumn) return;
      if (encryptIds && storePassphrase && passphrase) writePassphrase(storageKey, passphrase);
      const passCtx: PassphraseContext = { passphrase: encryptIds ? passphrase : null };
      const { csv } = await buildSourceCsv(preview, studentIdColumn, passCtx);
      await uploadMutation.mutateAsync({ csv, studentIdColumn });
    })();
  };

  return (
    <div className="space-y-4">
      {hasExistingSource && (
        <div className="alert alert-info flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm">Data from a previous upload is still available.</span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={onNext}
          >
            Continue to Configure &rarr;
          </button>
        </div>
      )}

      <div className="form-control">
        <label className="label"><span className="label-text">Select CSV file</span></label>
        <input
          type="file" accept=".csv,text/csv" className="file-input file-input-bordered w-full"
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {rawGrid && rawGrid.length > 0 && (
        <RowRangeControls
          totalRows={rawGrid.length}
          headerRow={headerRow}
          dataStartRow={dataStartRow}
          dataEndRow={dataEndRow}
          onChange={({ headerRow: h, dataStartRow: s, dataEndRow: e }) => {
            const nh = typeof h === 'number' ? h : headerRow;
            const ns = typeof s === 'number' ? s : dataStartRow;
            const ne = e !== undefined ? e : dataEndRow;
            setHeaderRow(nh); setDataStartRow(ns); setDataEndRow(ne);
            recomputePreview({ headerRow: nh, dataStartRow: ns, dataEndRow: ne });
          }}
        />
      )}

      {preview && (
        <>
          <CsvPreviewTable headers={preview.headers} rows={preview.rows} />

          <div className="form-control mt-4 md:w-80">
            <label className="label"><span className="label-text">Student ID column</span></label>
            <select
              className="select select-bordered w-full"
              value={studentIdColumn}
              onChange={(e) => setStudentIdColumn(e.target.value)}
            >
              <option value="" disabled>Select column</option>
              {preview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox" className="checkbox" checked={encryptIds}
                  onChange={(e) => setEncryptIds(e.target.checked)}
                />
                <span className="label-text">Encrypt student IDs (client-side)</span>
              </label>
              <div className="text-xs opacity-70 mt-1">IDs are encrypted before upload.</div>
            </div>
            <div className="form-control md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="label"><span className="label-text">Passphrase</span></label>
                  <input
                    type="password" className="input input-bordered w-full"
                    value={passphrase} onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Passphrase for encryption" disabled={!encryptIds}
                  />
                </div>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox" className="checkbox" checked={storePassphrase}
                      onChange={(e) => setStorePassphrase(e.target.checked)} disabled={!encryptIds}
                    />
                    <span className="label-text">Store locally</span>
                  </label>
                </div>
              </div>
              <div className="text-xs opacity-70 mt-1">Stored in browser local storage. Avoid on shared devices.</div>
            </div>
          </div>
        </>
      )}

      {uploadMutation.isError && <ErrorAlert error={uploadMutation.error} className="mt-4" />}

      <div className="flex justify-end mt-6">
        <LoadingButton
          type="button" variant="primary" onClick={handleNext}
          disabled={!canNext} isLoading={uploadMutation.isPending}
          leftIcon={<IconChevronRight />}
          title={!canNext ? 'Select a file and choose a Student ID column' : undefined}
        >
          Next
        </LoadingButton>
      </div>
    </div>
  );
};
