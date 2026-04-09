import type {
  RawSubmission,
  SubmissionsResponse,
} from '@api/models';

// Re-export API types (single source of truth)
export type { RawSubmission, SubmissionsResponse };

// CSV preview (used by the Load Wizard)
export type CsvPreview = {
  headers: string[];
  rows: string[][];
};

// Mapping chosen by user in the wizard
export type CsvMapping = {
  studentIdColumn: string;
  questionColumns: string[];
};

// Result of building the upload CSV
export type UploadCsvResult = {
  csv: string;
  encrypted: boolean;
};

// Helper context for encryption/decryption
export type SubmissionPassphraseConfig = {
  passphrase: string | null;
};