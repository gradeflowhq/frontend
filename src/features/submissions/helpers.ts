import Papa from 'papaparse';

import { isEncrypted, encryptString, decryptString } from '@utils/crypto';
import { normalizePresent } from '@utils/passphrase';
import { natsort } from '@utils/sort';

import type { RawSubmission, CsvPreview, UploadCsvResult, SubmissionPassphraseConfig } from './types';

/**
 * Extract unique question keys from raw submissions (sorted).
 */
export const extractQuestionKeys = (items: RawSubmission[]): string[] => {
  const keys = new Set<string>();
  items.forEach((row) => {
    Object.keys(row.raw_answer_map ?? {}).forEach((k) => keys.add(k));
  });
  return Array.from(keys).sort(natsort);
};

/**
 * Build an uploadable CSV string keeping all original columns.
 * Only the student ID values are optionally encrypted — column names are preserved.
 * This is used for the "upload source" step where full column data is sent to the server.
 */
export const buildSourceCsv = async (
  preview: CsvPreview,
  studentIdColumn: string,
  passphraseCtx?: SubmissionPassphraseConfig
): Promise<UploadCsvResult> => {
  const { headers, rows } = preview;
  const sidIdx = headers.indexOf(studentIdColumn);
  if (sidIdx < 0) throw new Error(`Student ID column "${studentIdColumn}" not found`);

  const passphrase = normalizePresent(passphraseCtx?.passphrase ?? null);
  const shouldEncrypt = !!passphrase;

  const outRows = await Promise.all(
    rows.map(async (r) => {
      const row = r.map(String);
      const sid = row[sidIdx] ?? '';
      row[sidIdx] = shouldEncrypt ? await encryptString(sid, passphrase!) : sid;
      return row;
    })
  );

  const csv = Papa.unparse([headers, ...outRows]);
  return { csv, encrypted: shouldEncrypt };
};

/**
 * Decode student IDs in a CSV exported by the server (if passphrase available).
 * Returns the decoded CSV string; falls back to original if decode fails.
 */
export const tryDecodeExportCsv = async (csv: string, passphraseCtx?: SubmissionPassphraseConfig): Promise<string> => {
  const passphrase = normalizePresent(passphraseCtx?.passphrase ?? null);
  if (!passphrase) return csv;

  try {
    const parsed = Papa.parse<string[]>(csv, { header: false, skipEmptyLines: true });
    const rows = parsed.data;
    if (!rows || rows.length < 2) return csv;

    const headerRow = rows[0];
    const studentIdx = headerRow.findIndex((h) => String(h).trim().toLowerCase() === 'student_id');
    if (studentIdx < 0) return csv;

    const bodyRows = rows.slice(1);
    const decodedBody = await Promise.all(
      bodyRows.map(async (r) => {
        const sid = r[studentIdx];
        if (sid && isEncrypted(sid)) {
          try {
            const plain = await decryptString(sid, passphrase);
            const next = [...r];
            next[studentIdx] = plain;
            return next;
          } catch {
            return r;
          }
        }
        return r;
      })
    );

    const rebuilt = [headerRow, ...decodedBody];
    return Papa.unparse(rebuilt);
  } catch {
    return csv;
  }
};
