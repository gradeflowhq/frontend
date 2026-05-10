import {
  Alert, Button, Card, Checkbox, Group, NumberInput, PasswordInput,
  Select, SimpleGrid, Stack, Text, Divider,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconChevronRight, IconUpload, IconFile, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from 'mantine-datatable';
import React, { useState, useCallback, useMemo, useRef } from 'react';

import { api } from '@api';
import { invalidateSubmissionQueries } from '@api/queryInvalidation';
import ErrorAlert from '@components/common/ErrorAlert';
import { buildSourceCsv } from '@features/submissions/helpers';
import { arraysEqual } from '@features/submissions/questionColumnInference';
import {
  parseSubmissionUploadFile,
  SUBMISSION_UPLOAD_ACCEPT,
} from '@features/submissions/uploadFile';
import { getErrorMessage } from '@utils/error';
import { buildPassphraseKey, readPassphrase, writePassphrase } from '@utils/passphrase';

import type { CsvPreview, SubmissionPassphraseConfig } from '@features/submissions/types';
import type { SubmissionUploadSheet } from '@features/submissions/uploadFile';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const PAGE_SIZE = 10;

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
  <SimpleGrid cols={{ base: 1, md: 3 }} mt="md">
    <NumberInput
      label="Header row (1-based)"
      description="Row containing column headers."
      min={1} max={totalRows}
      value={headerRow}
      onChange={(v) => onChange({ headerRow: typeof v === 'number' ? v : 1 })}
    />
    <NumberInput
      label="Body start row (1-based)"
      description="First data row (typically header+1)."
      min={1} max={totalRows}
      value={dataStartRow}
      onChange={(v) => onChange({ dataStartRow: typeof v === 'number' ? v : 1 })}
    />
    <NumberInput
      label="Body end row (optional)"
      description="Last row to include. Blank = all."
      min={1} max={totalRows}
      placeholder={`Blank = last row (${totalRows})`}
      value={dataEndRow === '' ? '' : dataEndRow}
      onChange={(v) => onChange({ dataEndRow: v === '' ? '' : (typeof v === 'number' ? v : '') })}
    />
  </SimpleGrid>
);

// ---------------------------------------------------------------------------
// CSV preview table (paginated)
// ---------------------------------------------------------------------------
type CsvRow = Record<string, string>;

const CsvPreviewTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => {
  const [page, setPage] = useState(1);

  const allData = useMemo<CsvRow[]>(
    () => rows.map((r) => Object.fromEntries(r.map((v, i) => [`col${i}`, v]))),
    [rows],
  );

  const pagedData = useMemo(
    () => allData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allData, page],
  );

  const columns = useMemo(
    () =>
      headers.map((h, i) => ({
        accessor: `col${i}` as keyof CsvRow,
        title: h,
        render: (row: CsvRow) => (
          <Text ff="monospace" size="xs">{row[`col${i}`]}</Text>
        ),
      })),
    [headers],
  );

  return (
    <DataTable
      mt="md"
      records={pagedData}
      columns={columns}
      totalRecords={allData.length}
      recordsPerPage={PAGE_SIZE}
      page={page}
      onPageChange={setPage}
      withTableBorder
      borderRadius="sm"
      striped
    />
  );
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
  const [sheets, setSheets] = useState<SubmissionUploadSheet[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [studentIdColumn, setStudentIdColumn] = useState('');
  const [headerRow, setHeaderRow] = useState(1);
  const [dataStartRow, setDataStartRow] = useState(2);
  const [dataEndRow, setDataEndRow] = useState<number | ''>('');

  const storageKey = buildPassphraseKey(assessmentId);
  const [encryptIds, setEncryptIds] = useState(false);
  const [passphrase, setPassphrase] = useState(() => readPassphrase(storageKey) ?? '');
  const [storePassphrase, setStorePassphrase] = useState(() => !!readPassphrase(storageKey));
  const parseRequestId = useRef(0);

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

      const rawHeaders = (grid[hdrRow1b - 1] ?? []).map(String);
      const seen = new Set<string>();
      const nextHeaders = rawHeaders.map((h, i) => {
        const base = h.trim() || `col_${i + 1}`;
        if (!seen.has(base)) { seen.add(base); return base; }
        let n = 2;
        while (seen.has(`${base}_${n}`)) n++;
        const uniq = `${base}_${n}`;
        seen.add(uniq);
        return uniq;
      });
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

  const applyGrid = useCallback(
    (data: string[][]) => {
      setRawGrid(data);
      setHeaderRow(1);
      setDataStartRow(2);
      setDataEndRow('');

      if (data.length === 0) {
        setPreview(null);
        setStudentIdColumn('');
        return;
      }

      recomputePreview({ rawGrid: data, headerRow: 1, dataStartRow: 2, dataEndRow: '' });
    },
    [recomputePreview],
  );

  const onSelectFile = (f: File | null) => {
    const requestId = parseRequestId.current + 1;
    parseRequestId.current = requestId;
    setRawGrid(null);
    setPreview(null);
    setStudentIdColumn('');
    setSheets([]);
    setSelectedSheetName(null);
    setFileError(null);
    if (!f) return;

    setIsParsingFile(true);
    void (async () => {
      try {
        const parsed = await parseSubmissionUploadFile(f);
        if (parseRequestId.current !== requestId) return;
        setSheets(parsed.sheets);
        setSelectedSheetName(parsed.sheets[0]?.name ?? null);
        applyGrid(parsed.grid);
      } catch (error) {
        if (parseRequestId.current !== requestId) return;
        setRawGrid(null);
        setPreview(null);
        setStudentIdColumn('');
        setFileError(getErrorMessage(error));
      } finally {
        if (parseRequestId.current === requestId) {
          setIsParsingFile(false);
        }
      }
    })();
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ csv, studentIdColumn }: { csv: string; studentIdColumn: string }) =>
      (await api.uploadSourceDataAssessmentsAssessmentIdSubmissionsSourcePut(assessmentId, {
        data: csv,
        student_id_column: studentIdColumn,
      })).data,
    onSuccess: async () => {
      await invalidateSubmissionQueries(qc, assessmentId);
      onNext();
    },
  });

  const canNext = !isParsingFile && !!preview && !!studentIdColumn && (!encryptIds || !!passphrase);

  const handleNext = () => {
    void (async () => {
      if (!preview || !studentIdColumn) return;
      if (encryptIds && storePassphrase && passphrase) writePassphrase(storageKey, passphrase);
      const passCtx: SubmissionPassphraseConfig = { passphrase: encryptIds ? passphrase : null };
      const { csv } = await buildSourceCsv(preview, studentIdColumn, passCtx);
      await uploadMutation.mutateAsync({ csv, studentIdColumn });
    })();
  };

  return (
    <Stack gap="md">
      {hasExistingSource && (
        <Alert color="blue">
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="sm">Data from a previous upload is still available.</Text>
            <Button type="button" size="xs" variant="outline" onClick={onNext}>
              Continue to Configure &rarr;
            </Button>
          </Group>
        </Alert>
      )}

      <Dropzone
        onDrop={(files) => onSelectFile(files[0] ?? null)}
        onReject={() => {
          onSelectFile(null);
          setFileError('Upload a CSV or Excel file up to 50 MB');
        }}
        accept={SUBMISSION_UPLOAD_ACCEPT}
        disabled={isParsingFile}
        maxFiles={1}
        maxSize={50 * 1024 * 1024}
      >
        <Group justify="center" gap="xl" style={{ pointerEvents: 'none', minHeight: 80 }}>
          <Dropzone.Accept><IconUpload size={40} color="var(--mantine-color-blue-6)" stroke={1.5} /></Dropzone.Accept>
          <Dropzone.Reject><IconX size={40} color="var(--mantine-color-red-6)" stroke={1.5} /></Dropzone.Reject>
          <Dropzone.Idle><IconFile size={40} color="var(--mantine-color-dimmed)" stroke={1.5} /></Dropzone.Idle>
          <div>
            <Text size="lg" fw={500}>Drop CSV or Excel file here or click to select</Text>
            <Text size="sm" c="dimmed">.csv, .xls, .xlsx, .xlsm, or .xlsb files up to 50 MB</Text>
          </div>
        </Group>
      </Dropzone>

      {fileError && (
        <Alert color="red">{fileError}</Alert>
      )}

      {sheets.length > 1 && (
        <Select
          label="Worksheet"
          value={selectedSheetName}
          onChange={(name) => {
            const sheet = sheets.find((item) => item.name === name);
            setSelectedSheetName(name);
            if (sheet) applyGrid(sheet.grid);
          }}
          data={sheets.map((sheet) => ({ value: sheet.name, label: sheet.name }))}
        />
      )}

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

          <SimpleGrid cols={{ base: 1, md: 2 }} mt="sm">
            <Select
              label="Student ID column"
              placeholder="Select column"
              value={studentIdColumn || null}
              onChange={(v) => setStudentIdColumn(v ?? '')}
              data={preview.headers.map((h) => ({ value: h, label: h }))}
            />
          </SimpleGrid>

          <Card withBorder mt="sm" p="md">
            <Text fw={600} mb="sm">Student ID Encryption</Text>
            <Divider mb="sm" />
            <Checkbox
              checked={encryptIds}
              onChange={(e) => setEncryptIds(e.currentTarget.checked)}
              label="Encrypt student IDs before upload (client-side only)"
              mb="sm"
            />
            <SimpleGrid cols={{ base: 1, md: 2 }} style={{ opacity: encryptIds ? 1 : 0.4 }}>
              <PasswordInput
                label="Passphrase"
                placeholder="Enter passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.currentTarget.value)}
                disabled={!encryptIds}
              />
              <Stack gap="xs" justify="flex-end">
                <Checkbox
                  checked={storePassphrase}
                  onChange={(e) => setStorePassphrase(e.currentTarget.checked)}
                  disabled={!encryptIds}
                  label="Store passphrase locally (browser)"
                />
                <Text size="xs" c="dimmed">Stored in localStorage. Avoid on shared devices.</Text>
              </Stack>
            </SimpleGrid>
          </Card>
        </>
      )}

      {uploadMutation.isError && (
        <ErrorAlert error={uploadMutation.error} mt="sm" />
      )}

      <Group justify="flex-end" mt="md">
        <Button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          loading={isParsingFile || uploadMutation.isPending}
          leftSection={<IconChevronRight size={16} />}
          title={!canNext ? 'Select a file and choose a Student ID column' : undefined}
        >
          Next
        </Button>
      </Group>
    </Stack>
  );
};
