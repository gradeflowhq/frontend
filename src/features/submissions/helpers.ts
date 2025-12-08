import Papa from 'papaparse';
import { isEncrypted, encryptString, decryptString } from '@utils/crypto';
import { normalizePresent } from '@utils/passphrase';
import { natsort } from '@utils/sort';
import type { RawSubmission, CsvPreview, CsvMapping, UploadCsvResult, PassphraseContext } from './types';

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
 * Build an uploadable CSV string from a CsvPreview + user mapping.
 * Optionally encrypt student IDs using the provided passphrase.
 */
export const buildUploadCsv = async (
  preview: CsvPreview,
  mapping: CsvMapping,
  passphraseCtx?: PassphraseContext
): Promise<UploadCsvResult> => {
  const { headers, rows } = preview;
  const { studentIdColumn, questionColumns } = mapping;

  const sidIdx = headers.indexOf(studentIdColumn);
  if (sidIdx < 0) throw new Error(`Student ID column "${studentIdColumn}" not found`);

  const outHeaders = ['student_id', ...questionColumns];
  const passphrase = normalizePresent(passphraseCtx?.passphrase ?? null);
  const shouldEncrypt = !!passphrase;

  const outRows = await Promise.all(
    rows.map(async (r) => {
      const sid = String(r[sidIdx] ?? '');
      const encSid = shouldEncrypt ? await encryptString(sid, passphrase!) : sid;
      const qVals = questionColumns.map((qc) => {
        const idx = headers.indexOf(qc);
        return idx >= 0 ? String(r[idx] ?? '') : '';
      });
      return [encSid, ...qVals];
    })
  );

  const csv = Papa.unparse([outHeaders, ...outRows]);
  return { csv, encrypted: shouldEncrypt };
};

/**
 * Decode student IDs in a CSV exported by the server (if passphrase available).
 * Returns the decoded CSV string; falls back to original if decode fails.
 */
export const tryDecodeExportCsv = async (csv: string, passphraseCtx?: PassphraseContext): Promise<string> => {
  const passphrase = normalizePresent(passphraseCtx?.passphrase ?? null);
  if (!passphrase) return csv;

  try {
    const parsed = Papa.parse<string[]>(csv, { header: false, skipEmptyLines: true });
    const rows = parsed.data as unknown as string[][];
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

/**
 * Validate a CSV preview + mapping before building upload CSV.
 * Ensures required columns exist and at least one question column is selected.
 */
export const validateCsvMapping = (preview: CsvPreview, mapping: CsvMapping): string[] => {
  const messages: string[] = [];
  const { headers } = preview;
  const { studentIdColumn, questionColumns } = mapping;

  if (!studentIdColumn) messages.push('Select a Student ID column.');
  else if (!headers.includes(studentIdColumn)) messages.push(`Column "${studentIdColumn}" not found.`);

  if (!Array.isArray(questionColumns) || questionColumns.length === 0) {
    messages.push('Select at least one Question column.');
  } else {
    const missing = questionColumns.filter((qc) => !headers.includes(qc));
    if (missing.length) messages.push(`Missing columns: ${missing.join(', ')}`);
  }

  return messages;
};