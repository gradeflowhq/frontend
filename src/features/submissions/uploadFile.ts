import Papa from 'papaparse';

export const SUBMISSION_UPLOAD_ACCEPT = [
  '.csv',
  '.xls',
  '.xlsx',
  '.xlsm',
  '.xlsb',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
];

export type SubmissionUploadSheet = {
  name: string;
  grid: string[][];
};

type ParsedSubmissionUpload = {
  grid: string[][];
  sheets: SubmissionUploadSheet[];
};

const CSV_EXTENSIONS = new Set(['csv']);
const SPREADSHEET_EXTENSIONS = new Set(['xls', 'xlsx', 'xlsm', 'xlsb']);
const CSV_MEDIA_TYPES = new Set(['text/csv', 'application/csv']);
const SPREADSHEET_MEDIA_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
]);

const extensionOf = (filename: string): string => {
  const match = /\.([^.]+)$/.exec(filename.trim().toLowerCase());
  return match?.[1] ?? '';
};

const hasContent = (row: string[]) => row.some((cell) => cell.trim().length > 0);

const normalizeGrid = (rows: unknown[][]): string[][] =>
  rows
    .map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
    .filter(hasContent);

const parseCsvFile = async (file: File): Promise<string[][]> => {
  const parsed = Papa.parse<string[]>(await file.text(), {
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? 'Could not parse CSV file');
  }

  return normalizeGrid(parsed.data);
};

const parseSpreadsheetFile = async (file: File): Promise<ParsedSubmissionUpload> => {
  const xlsx = await import('@e965/xlsx');
  const workbook = xlsx.read(await file.arrayBuffer(), {
    cellDates: false,
    type: 'array',
  });

  const sheets = workbook.SheetNames.map((name) => {
    const worksheet = workbook.Sheets[name];
    const rows = worksheet
      ? xlsx.utils.sheet_to_json<unknown[]>(worksheet, {
        blankrows: false,
        defval: '',
        header: 1,
        raw: false,
      })
      : [];

    return { name, grid: normalizeGrid(rows) };
  }).filter((sheet) => sheet.grid.length > 0);

  const firstSheet = sheets[0];
  if (!firstSheet) {
    throw new Error('No rows found in the uploaded spreadsheet');
  }

  return {
    grid: firstSheet.grid,
    sheets,
  };
};

export const parseSubmissionUploadFile = async (
  file: File
): Promise<ParsedSubmissionUpload> => {
  const extension = extensionOf(file.name);
  const mediaType = file.type.trim().toLowerCase();

  if (CSV_EXTENSIONS.has(extension) || CSV_MEDIA_TYPES.has(mediaType)) {
    return {
      grid: await parseCsvFile(file),
      sheets: [],
    };
  }

  if (
    SPREADSHEET_EXTENSIONS.has(extension) ||
    SPREADSHEET_MEDIA_TYPES.has(mediaType)
  ) {
    return parseSpreadsheetFile(file);
  }

  throw new Error('Upload a CSV or Excel file (.csv, .xls, .xlsx, .xlsm, or .xlsb)');
};
