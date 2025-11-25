import React, { useMemo, useState, useEffect } from 'react';
import Papa from 'papaparse';
import Modal from '@components/common/Modal';
import ErrorAlert from '@components/common/ErrorAlert';
import LoadingButton from '@components/ui/LoadingButton';
import { Button } from '@components/ui/Button';
import { IconUpload } from '@components/ui/Icon';
import { buildPassphraseKey, readPassphrase, writePassphrase } from '@utils/passphrase';
import { validateCsvMapping, buildUploadCsv } from '@features/submissions/helpers';
import type { CsvPreview, CsvMapping, PassphraseContext } from '@features/submissions/types';
import { useLoadSubmissionsCSV } from '@features/submissions/hooks';
import { useInferAndParseQuestionSet } from '@features/questions/hooks';

type Props = {
  open: boolean;
  assessmentId: string;
  onClose: () => void;
};

const PreviewTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-box border border-base-300">
    <table className="table table-compact w-full">
      <thead>
        <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.slice(0, 10).map((r, ri) => (
          <tr key={ri}>
            {r.map((c, ci) => (
              <td key={ci}><span className="font-mono text-xs">{c}</span></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SubmissionsLoadWizardModal: React.FC<Props> = ({ open, assessmentId, onClose }) => {
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({ studentIdColumn: '', questionColumns: [] });
  const [encryptIds, setEncryptIds] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [storePassphrase, setStorePassphrase] = useState(false);

  const storageKey = buildPassphraseKey(assessmentId);
  const loadMutation = useLoadSubmissionsCSV(assessmentId);
  const inferAndParse = useInferAndParseQuestionSet(assessmentId);

  useEffect(() => {
    if (!open) return;
    const saved = readPassphrase(storageKey);
    if (saved) {
      setPassphrase(saved);
      setStorePassphrase(true);
    }
  }, [open, storageKey]);

  const headers = preview?.headers ?? [];
  const rows = preview?.rows ?? [];

  const onSelectFile = (f: File | null) => {
    setPreview(null);
    setMapping({ studentIdColumn: '', questionColumns: [] });
    if (!f) return;
    Papa.parse(f, {
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as string[][];
        if (!data || data.length === 0) return;
        const hdrs = (data[0] as string[]).map((h) => String(h));
        const body = data.slice(1).map((r) => r.map((c) => String(c ?? '')));
        setPreview({ headers: hdrs, rows: body });
        setMapping({ studentIdColumn: hdrs[0] ?? '', questionColumns: hdrs.slice(1, Math.min(hdrs.length, 6)) });
      },
      error: () => setPreview(null),
    });
  };

  const canSubmit = preview && mapping.studentIdColumn && mapping.questionColumns.length > 0 && (!encryptIds || !!passphrase);

  const persistPassphraseIfNeeded = () => {
    if (encryptIds && storePassphrase && passphrase) {
      writePassphrase(storageKey, passphrase);
    }
  };

  const questionChoices = useMemo(() => headers.filter((h) => h !== mapping.studentIdColumn), [headers, mapping.studentIdColumn]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} boxClassName="w-full max-w-6xl">
      <h3 className="font-bold text-lg">Load Submissions (CSV)</h3>

      <div className="form-control mt-2">
        <label className="label"><span className="label-text">Select CSV file</span></label>
        <input
          type="file"
          accept=".csv,text/csv"
          className="file-input file-input-bordered w-full"
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {preview && (
        <>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Preview</h4>
            <PreviewTable headers={headers} rows={rows} />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Student ID column</span></label>
              <select
                className="select select-bordered w-full"
                value={mapping.studentIdColumn}
                onChange={(e) => {
                  const val = e.target.value;
                  setMapping((prev) => ({ ...prev, studentIdColumn: val, questionColumns: prev.questionColumns.filter((qc) => qc !== val) }));
                }}
              >
                <option value="" disabled>Select column</option>
                {headers.map((h) => (<option key={h} value={h}>{h}</option>))}
              </select>
            </div>

            <div className="form-control md:col-span-2">
              <label className="label"><span className="label-text">Question columns</span></label>
              <select
                className="select select-bordered w-full"
                multiple
                value={mapping.questionColumns}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setMapping((prev) => ({ ...prev, questionColumns: opts }));
                }}
              >
                {questionChoices.map((h) => (<option key={h} value={h}>{h}</option>))}
              </select>
              <span className="text-xs opacity-70 mt-1">Hold Ctrl/Cmd to select multiple columns.</span>
            </div>
          </div>

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

      {loadMutation.isError && <ErrorAlert error={loadMutation.error} className="mt-4" />}

      <div className="modal-action">
        <Button type="button" variant="ghost" onClick={onClose} disabled={loadMutation.isPending}>
          Cancel
        </Button>
        <LoadingButton
          type="button"
          variant="primary"
          onClick={async () => {
            if (!preview) return;
            const errors = validateCsvMapping(preview, mapping);
            if (errors.length) {
              // Present errors inline via ErrorAlert by setting a local error state if desired.
              // For simplicity, use alert. You can wire a local error state for better UX.
              alert(errors.join('\n'));
              return;
            }
            persistPassphraseIfNeeded();
            const passCtx: PassphraseContext = { passphrase: encryptIds ? passphrase : null };
            const { csv } = await buildUploadCsv(preview, mapping, passCtx);
            await loadMutation.mutateAsync(csv);
            try {
              await inferAndParse.mutateAsync();
            } catch (e) {
              console.warn('Inference or parsing failed after upload:', e);
            }
            onClose();
          }}
          disabled={!canSubmit}
          isLoading={loadMutation.isPending}
          title={!canSubmit ? 'Select file, mapping, and passphrase (if encrypting)' : 'Upload'}
          leftIcon={<IconUpload />}
        >
          Upload
        </LoadingButton>
      </div>
    </Modal>
  );
};

export default SubmissionsLoadWizardModal;