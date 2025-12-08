import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Papa from 'papaparse';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import { IconUpload } from '@components/ui/Icon';
import { buildPassphraseKey, readPassphrase, writePassphrase } from '@utils/passphrase';
import { validateCsvMapping, buildUploadCsv } from '@features/submissions/helpers';
import type { CsvPreview, CsvMapping, PassphraseContext } from '@features/submissions/types';
import { useInferAndParseQuestionSet } from '@features/questions/hooks';
import {
  arraysEqual,
  computeNextMapping,
  sanitizeQuestions,
} from '@features/submissions/utils/questionColumnInference';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@api';
import { QK } from '@api/queryKeys';
import type { ImportSubmissionsRequest, CsvRawSubmissionsConfig } from '@api/models';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * Preview table: renders header with checkboxes for question selection and first 10 body rows.
 */
const PreviewTable: React.FC<{
  headers: string[];
  rows: string[][];
  studentIdColumn: string;
  selectedQuestions: string[];
  onToggleQuestion: (header: string) => void;
}> = ({ headers, rows, studentIdColumn, selectedQuestions, onToggleQuestion }) => {
  return (
    <div className="overflow-x-auto rounded-box border border-base-300">
      <table className="table table-compact w-full">
        <thead>
          <tr>
            {headers.map((h) => {
              const isSID = studentIdColumn === h;
              const isSelected = selectedQuestions.includes(h);
              return (
                <th key={h}>
                  <label
                    className="inline-flex items-center gap-2 cursor-pointer"
                    title={isSID ? 'Student ID (cannot be selected as a question)' : 'Include this column as a question'}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={isSelected}
                      disabled={isSID}
                      onChange={() => onToggleQuestion(h)}
                    />
                    <span className="font-mono text-xs">{h}</span>
                  </label>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci}>
                  <span className="font-mono text-xs">{c}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Row range controls: header row, body start/end (1-based).
 */
const RowRangeControls: React.FC<{
  totalRows: number;
  headerRow: number;
  dataStartRow: number;
  dataEndRow: number | '';
  onChange: (next: { headerRow?: number; dataStartRow?: number; dataEndRow?: number | '' }) => void;
}> = ({ totalRows, headerRow, dataStartRow, dataEndRow, onChange }) => {
  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="form-control">
        <label className="label"><span className="label-text">Header row (1-based)</span></label>
        <input
          type="number"
          min={1}
          max={totalRows}
          className="input input-bordered w-full"
          value={headerRow}
          onChange={(e) => onChange({ headerRow: Number(e.target.value) || 1 })}
        />
        <div className="text-xs opacity-70 mt-1">Select the row that contains column headers.</div>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Body start row (1-based)</span></label>
        <input
          type="number"
          min={1}
          max={totalRows}
          className="input input-bordered w-full"
          value={dataStartRow}
          onChange={(e) => onChange({ dataStartRow: Number(e.target.value) || 1 })}
        />
        <div className="text-xs opacity-70 mt-1">First data row. Typically header+1.</div>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text">Body end row (1-based, optional)</span></label>
        <input
          type="number"
          min={1}
          max={totalRows}
          className="input input-bordered w-full"
          value={dataEndRow === '' ? '' : dataEndRow}
          onChange={(e) => {
            const val = e.target.value;
            onChange({ dataEndRow: val === '' ? '' : Number(val) });
          }}
          placeholder={`Leave blank to use last row (${totalRows})`}
        />
        <div className="text-xs opacity-70 mt-1">Last data row to include. Leave blank to include all remaining rows.</div>
      </div>
    </div>
  );
};

/**
 * Controls below preview: student ID select on left, select all/clear on right.
 */
const PreviewFooterControls: React.FC<{
  studentChoices: string[];
  studentIdColumn: string;
  onChangeStudentId: (col: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}> = ({ studentChoices, studentIdColumn, onChangeStudentId, onSelectAll, onClearAll }) => {
  return (
    <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div className="form-control md:w-80">
        <label className="label"><span className="label-text">Student ID column</span></label>
        <select
          className="select select-bordered w-full"
          value={studentIdColumn}
          onChange={(e) => onChangeStudentId(e.target.value)}
        >
          <option value="" disabled>Select column</option>
          {studentChoices.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-xs opacity-70 mt-1">
          Choosing a Student ID column will automatically exclude it from question selection.
        </span>
      </div>

      <div className="flex gap-2">
         <label className="label"><span className="label-text">Question columns:</span></label>
        <Button type="button" variant="default" size="sm" onClick={onSelectAll}>
          Select all
        </Button>
        <Button type="button" variant="error" size="sm" onClick={onClearAll}>
          Clear
        </Button>
      </div>
    </div>
  );
};

const SubmissionsLoadWizardModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  // Raw parsed grid (full CSV table)
  const [rawGrid, setRawGrid] = useState<string[][] | null>(null);

  // Derived preview slice
  const [preview, setPreview] = useState<CsvPreview | null>(null);

  // Mapping selection
  const [mapping, setMapping] = useState<CsvMapping>({ studentIdColumn: '', questionColumns: [] });

  // Row selection controls (1-based)
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [dataStartRow, setDataStartRow] = useState<number>(2);
  const [dataEndRow, setDataEndRow] = useState<number | ''>('');

  // Encryption controls
  const [encryptIds, setEncryptIds] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [storePassphrase, setStorePassphrase] = useState(false);

  const storageKey = buildPassphraseKey(assessmentId);
  const inferAndParse = useInferAndParseQuestionSet(assessmentId);

  // Load stored passphrase on open
  useEffect(() => {
    if (!open) return;
    const saved = readPassphrase(storageKey);
    if (saved) {
      setPassphrase(saved);
      setStorePassphrase(true);
    }
  }, [open, storageKey]);

  // Reset on close
  useEffect(() => {
    if (!open) return;
    return () => {
      setRawGrid(null);
      setPreview(null);
      setMapping({ studentIdColumn: '', questionColumns: [] });
      setHeaderRow(1);
      setDataStartRow(2);
      setDataEndRow('');
      setEncryptIds(false);
    };
  }, [open]);

  const headers = preview?.headers ?? [];
  const rows = preview?.rows ?? [];

  // Compute preview and keep mapping stable (avoid loops)
  const recomputePreview = useCallback(() => {
    if (!rawGrid || rawGrid.length === 0) {
      setPreview((prevPrev) => (prevPrev ? null : prevPrev));
      setMapping((prev) =>
        prev.studentIdColumn !== '' || prev.questionColumns.length > 0
          ? { studentIdColumn: '', questionColumns: [] }
          : prev
      );
      return;
    }

    const totalRows = rawGrid.length;

    const hdrRow1b = clamp(headerRow || 1, 1, totalRows);
    const start1b = clamp((dataStartRow || hdrRow1b + 1), 1, totalRows);
    const end1b = typeof dataEndRow === 'number' && dataEndRow > 0 ? clamp(dataEndRow, 1, totalRows) : totalRows;

    const effectiveStart1b = Math.max(start1b, hdrRow1b + 1);
    const effectiveEnd1b = Math.max(end1b, effectiveStart1b - 1);

    const hdrIdx = hdrRow1b - 1;
    const startIdx = effectiveStart1b - 1;
    const endIdx = effectiveEnd1b - 1;

    const nextHeaders = (rawGrid[hdrIdx] ?? []).map((h) => String(h ?? ''));
    const nextRows = rawGrid.slice(startIdx, endIdx + 1).map((r) => r.map((c) => String(c ?? '')));

    // Set preview if changed
    setPreview((prevPrev) => {
      if (!prevPrev) return { headers: nextHeaders, rows: nextRows };
      const sameHeaders = arraysEqual(prevPrev.headers, nextHeaders);
      const compact = (arr: string[][], n: number) => arr.slice(0, n).map((r) => r.join('\u0001'));
      const sameBody = arraysEqual(compact(prevPrev.rows, 10), compact(nextRows, 10));
      if (sameHeaders && sameBody) return prevPrev;
      return { headers: nextHeaders, rows: nextRows };
    });

    // Use heuristics (with rows) to compute the next mapping
    setMapping((prev) => computeNextMapping(nextHeaders, prev, { rowsForHeuristic: nextRows }));
  }, [rawGrid, headerRow, dataStartRow, dataEndRow]);

  // Recompute when inputs change
  useEffect(() => {
    recomputePreview();
  }, [recomputePreview]);

  // File selection
  const onSelectFile = (f: File | null) => {
    setRawGrid(null);
    setPreview(null);
    setMapping({ studentIdColumn: '', questionColumns: [] });
    if (!f) return;
    Papa.parse(f, {
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as string[][];
        if (!data || data.length === 0) {
          setRawGrid([]);
          return;
        }
        setRawGrid(data);
        setHeaderRow(1);
        setDataStartRow(2);
        setDataEndRow('');
      },
      error: () => {
        setRawGrid(null);
        setPreview(null);
      },
    });
  };

  // Under preview: controls
  const studentChoices = useMemo(() => headers, [headers]);

  const onChangeStudentId = (col: string) => {
    setMapping((prev) => {
      if (col === prev.studentIdColumn) return prev;
      // sanitize questions after SID change
      const nextQs = sanitizeQuestions(headers, col, prev.questionColumns);
      if (prev.studentIdColumn === col && arraysEqual(nextQs, prev.questionColumns)) {
        return prev;
      }
      return { ...prev, studentIdColumn: col, questionColumns: nextQs };
    });
  };

  const onToggleQuestion = (header: string) => {
    setMapping((prev) => {
      if (header === prev.studentIdColumn) return prev;
      const set = new Set(prev.questionColumns);
      if (set.has(header)) set.delete(header);
      else set.add(header);
      const nextQs = Array.from(set);
      if (arraysEqual(nextQs, prev.questionColumns)) return prev;
      return { ...prev, questionColumns: nextQs };
    });
  };

  const selectAllQuestions = () => {
    setMapping((prev) => {
      const all = headers.filter((h) => h !== prev.studentIdColumn);
      if (arraysEqual(all, prev.questionColumns)) return prev;
      return { ...prev, questionColumns: all };
    });
  };

  const clearAllQuestions = () => {
    setMapping((prev) => (prev.questionColumns.length ? { ...prev, questionColumns: [] } : prev));
  };

  // Upload readiness
  const canSubmit =
    !!preview &&
    !!mapping.studentIdColumn &&
    mapping.questionColumns.length > 0 &&
    (!encryptIds || !!passphrase);

  // Import submissions via adapter (CSV) with Blob data
  const qc = useQueryClient();
  const importMutation = useMutation({
    mutationKey: ['submissions', assessmentId, 'import-wizard'],
    mutationFn: async (payload: ImportSubmissionsRequest) =>
      (await api.importSubmissionsAssessmentsAssessmentIdSubmissionsImportPut(assessmentId, payload)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QK.submissions.list(assessmentId) });
      onClose();
    },
  });

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} boxClassName="w-full max-w-6xl">
      <h3 className="font-bold text-lg">Import Submissions (CSV)</h3>

      {/* File input */}
      <div className="form-control mt-2">
        <label className="label"><span className="label-text">Select CSV file</span></label>
        <input
          type="file"
          accept=".csv,text/csv"
          className="file-input file-input-bordered w-full"
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Row range */}
      {rawGrid && rawGrid.length > 0 && (
        <RowRangeControls
          totalRows={rawGrid.length}
          headerRow={headerRow}
          dataStartRow={dataStartRow}
          dataEndRow={dataEndRow}
          onChange={({ headerRow: h, dataStartRow: s, dataEndRow: e }) => {
            if (typeof h === 'number') setHeaderRow(h);
            if (typeof s === 'number') setDataStartRow(s);
            if (typeof e !== 'undefined') setDataEndRow(e);
          }}
        />
      )}

      {/* Preview and selection */}
      {preview && (
        <>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Preview and Question Selection</h4>
            <PreviewTable
              headers={headers}
              rows={rows}
              studentIdColumn={mapping.studentIdColumn}
              selectedQuestions={mapping.questionColumns}
              onToggleQuestion={onToggleQuestion}
            />
          </div>

          {/* Footer controls under preview */}
          <PreviewFooterControls
            studentChoices={studentChoices}
            studentIdColumn={mapping.studentIdColumn}
            onChangeStudentId={onChangeStudentId}
            onSelectAll={selectAllQuestions}
            onClearAll={clearAllQuestions}
          />

          {/* Encryption controls */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input type="checkbox" className="checkbox" checked={encryptIds} onChange={(e) => setEncryptIds(e.target.checked)} />
                <span className="label-text">Encrypt student IDs (client-side)</span>
              </label>
              <div className="text-xs opacity-70 mt-1">
                If enabled, IDs are encrypted before upload and stored encrypted on the server.
              </div>
            </div>

            <div className="form-control md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="label"><span className="label-text">Passphrase</span></label>
                  <input
                    type="password"
                    className="input input-bordered w-full"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase to encrypt/decrypt student IDs"
                    disabled={!encryptIds}
                  />
                </div>
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={storePassphrase}
                      onChange={(e) => setStorePassphrase(e.target.checked)}
                      disabled={!encryptIds}
                    />
                    <span className="label-text">Store passphrase locally</span>
                  </label>
                </div>
              </div>
              <div className="text-xs opacity-70 mt-1">
                Stored in your browser’s local storage. Do not use on shared devices.
              </div>
            </div>
          </div>
        </>
      )}

      {importMutation.isError && <ErrorAlert error={importMutation.error} className="mt-4" />}

      <div className="modal-action">
        <Button type="button" variant="ghost" onClick={onClose} disabled={importMutation.isPending}>
          Cancel
        </Button>
        <LoadingButton
          type="button"
          variant="primary"
          onClick={async () => {
          if (!preview) return;

          const errors = validateCsvMapping(preview, mapping);
          if (errors.length) {
            alert(errors.join('\n'));
            return;
          }

          // Persist passphrase (optional)
          if (encryptIds && storePassphrase && passphrase) {
            writePassphrase(storageKey, passphrase);
          }

          // Build CSV (encrypting IDs client-side if chosen)
          const passCtx: PassphraseContext = { passphrase: encryptIds ? passphrase : null };
          const { csv } = await buildUploadCsv(preview, mapping, passCtx);

          // Adapter config for CSV import
          const adapter: CsvRawSubmissionsConfig = {
            name: 'csv',
            format: 'csv',
            student_id_column: 'student_id',
            // Provide question columns explicitly; omit if empty
            answer_columns: mapping.questionColumns.length ? mapping.questionColumns : undefined,
          };

          const payload = { data: csv, adapter } as any;

          await importMutation.mutateAsync(payload);

          // Try to infer and parse questions after import
          try {
            await inferAndParse.mutateAsync();
          } catch (e) {
            console.warn('Inference or parsing failed after upload:', e);
          }
        }}
          disabled={!canSubmit || !preview}
          isLoading={importMutation.isPending}
          title={!canSubmit ? 'Select header/body rows, choose SID and questions, and passphrase (if encrypting)' : 'Upload'}
          leftIcon={<IconUpload />}
        >
          Upload
        </LoadingButton>
      </div>
    </Modal>
  );
};

export default SubmissionsLoadWizardModal;