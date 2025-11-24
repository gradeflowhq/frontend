import React, { useMemo, useState, useEffect } from 'react';
import { IconUpload } from '../ui/Icon';
import { Button } from '../ui/Button';
import Papa from 'papaparse';
import Modal from '../common/Modal';
import ErrorAlert from '../common/ErrorAlert';
import { encryptString } from '../../utils/crypto';
import { buildPassphraseKey, readPassphrase, writePassphrase } from '../../utils/passphrase';

type Props = {
  open: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  error: unknown;
  onSubmitCsv: (csv: string) => Promise<void> | void;
  assessmentId: string;
};

type ParsedCsv = { headers: string[]; rows: string[][] };

const PreviewTable: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-box border border-base-300">
    <table className="table table-compact w-full">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i}>{h}</th>
          ))}
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

const SubmissionsLoadWizardModal: React.FC<Props> = ({
  open,
  onClose,
  isSubmitting,
  error,
  onSubmitCsv,
  assessmentId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [studentCol, setStudentCol] = useState<string>('');
  const [questionCols, setQuestionCols] = useState<string[]>([]);
  const [encryptIds, setEncryptIds] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [storePassphrase, setStorePassphrase] = useState(false);

  const storageKey = buildPassphraseKey(assessmentId);

  // Initialise passphrase from localStorage if present (do not auto-remove later)
  useEffect(() => {
    const saved = readPassphrase(storageKey);
    if (saved) {
      setPassphrase(saved);
      setStorePassphrase(true);
    }
  }, [storageKey]);

  const headers = parsed?.headers ?? [];
  const rows = parsed?.rows ?? [];

  const onSelectFile = (f: File | null) => {
    setFile(f);
    setParsed(null);
    setStudentCol('');
    setQuestionCols([]);
    if (!f) return;
    Papa.parse(f, {
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as string[][];
        if (!data || data.length === 0) return;
        const hdrs = (data[0] as string[]).map((h) => String(h));
        const body = data.slice(1).map((r) => r.map((c) => String(c ?? '')));
        setParsed({ headers: hdrs, rows: body });
        setStudentCol(hdrs[0] ?? '');
        const autoQ = hdrs.slice(1, Math.min(hdrs.length, 6));
        setQuestionCols(autoQ);
      },
      error: () => setParsed(null),
    });
  };

  const canSubmit = parsed && studentCol && questionCols.length > 0 && (!encryptIds || !!passphrase);

  const persistPassphraseIfNeeded = () => {
    // Write only if user opted in and encryption is enabled
    if (encryptIds && storePassphrase && passphrase) {
      writePassphrase(storageKey, passphrase);
    }
  };

  const onSubmit = async () => {
    if (!parsed) return;
    const sIdx = headers.indexOf(studentCol);
    if (sIdx < 0) return;

    persistPassphraseIfNeeded();

    const outHeaders = ['student_id', ...questionCols];
    const outRows = await Promise.all(
      rows.map(async (r) => {
        const sid = r[sIdx] ?? '';
        const encSid = encryptIds ? await encryptString(sid, passphrase) : sid;
        const qVals = questionCols.map((qc) => {
          const idx = headers.indexOf(qc);
          return idx >= 0 ? r[idx] : '';
        });
        return [encSid, ...qVals];
      })
    );

    const csv = Papa.unparse([outHeaders, ...outRows]);
    await onSubmitCsv(csv);
  };

  const questionChoices = useMemo(
    () => headers.filter((h) => h !== studentCol),
    [headers, studentCol]
  );

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

      {parsed && (
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
                value={studentCol}
                onChange={(e) => {
                  const val = e.target.value;
                  setStudentCol(val);
                  setQuestionCols((prev) => prev.filter((qc) => qc !== val));
                }}
              >
                <option value="" disabled>Select column</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="form-control md:col-span-2">
              <label className="label"><span className="label-text">Question columns</span></label>
              <select
                className="select select-bordered w-full"
                multiple
                value={questionCols}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setQuestionCols(opts);
                }}
              >
                {questionChoices.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span className="text-xs opacity-70 mt-1">
                Hold Ctrl/Cmd to select multiple columns.
              </span>
            </div>
          </div>

          {/* Encryption section */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={encryptIds}
                  onChange={(e) => setEncryptIds(e.target.checked)}
                />
                <span className="label-text">Encrypt student IDs (client-side)</span>
              </label>
              <span className="text-xs opacity-70 mt-1">
                If enabled, IDs are encrypted before upload and stored encrypted on the server.
              </span>
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
              <span className="text-xs opacity-70 mt-1">
                Stored in your browser’s local storage. Do not use on shared devices.
              </span>
            </div>
          </div>
        </>
      )}

      {error && <ErrorAlert error={error} className="mt-4" />}

      <div className="modal-action">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={isSubmitting || !canSubmit}
          title={!canSubmit ? 'Select file, mapping, and passphrase (if encrypting)' : 'Upload'}
          loading={isSubmitting}
          leftIcon={<IconUpload />}
        >
          Upload
        </Button>
      </div>
    </Modal>
  );
};

export default SubmissionsLoadWizardModal;