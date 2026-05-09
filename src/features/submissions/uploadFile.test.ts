import { utils, write } from '@e965/xlsx';
import { describe, expect, it } from 'vitest';

import {
  parseSubmissionUploadFile,
  SUBMISSION_UPLOAD_ACCEPT,
} from '@features/submissions/uploadFile';

type WorkbookSheet = {
  name: string;
  rows: unknown[][];
};

const makeWorkbookFile = (
  bookType: 'xls' | 'xlsx',
  sheets: WorkbookSheet[]
): File => {
  const workbook = utils.book_new();
  for (const sheet of sheets) {
    utils.book_append_sheet(workbook, utils.aoa_to_sheet(sheet.rows), sheet.name);
  }

  const data = write(workbook, { bookType, type: 'array' }) as ArrayBuffer;
  const mediaType = bookType === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/vnd.ms-excel';

  return new File([data], `submissions.${bookType}`, { type: mediaType });
};

describe('SUBMISSION_UPLOAD_ACCEPT', () => {
  it('accepts CSV and Excel file extensions', () => {
    expect(SUBMISSION_UPLOAD_ACCEPT).toEqual(
      expect.arrayContaining(['.csv', '.xls', '.xlsx'])
    );
  });
});

describe('parseSubmissionUploadFile', () => {
  it('parses CSV files into a grid', async () => {
    const file = new File(
      ['student_id,Q1,Q2\nalice,A,B\n\nbob,C,D\n'],
      'submissions.csv',
      { type: 'text/csv' }
    );

    await expect(parseSubmissionUploadFile(file)).resolves.toMatchObject({
      grid: [
        ['student_id', 'Q1', 'Q2'],
        ['alice', 'A', 'B'],
        ['bob', 'C', 'D'],
      ],
      sheets: [],
    });
  });

  it('parses XLSX files and chooses the first non-empty worksheet', async () => {
    const file = makeWorkbookFile('xlsx', [
      { name: 'Empty', rows: [] },
      {
        name: 'Scores',
        rows: [
          ['student_id', 'Q1'],
          ['alice', 'A'],
        ],
      },
      {
        name: 'Second',
        rows: [
          ['student_id', 'Q1'],
          ['bob', 'B'],
        ],
      },
    ]);

    const parsed = await parseSubmissionUploadFile(file);

    expect(parsed.sheets.map((sheet) => sheet.name)).toEqual(['Scores', 'Second']);
    expect(parsed.grid).toEqual([
      ['student_id', 'Q1'],
      ['alice', 'A'],
    ]);
  });

  it('parses legacy XLS files', async () => {
    const file = makeWorkbookFile('xls', [
      {
        name: 'Legacy',
        rows: [
          ['student_id', 'Q1'],
          ['alice', 'A'],
        ],
      },
    ]);

    await expect(parseSubmissionUploadFile(file)).resolves.toMatchObject({
      grid: [
        ['student_id', 'Q1'],
        ['alice', 'A'],
      ],
      sheets: [
        {
          name: 'Legacy',
          grid: [
            ['student_id', 'Q1'],
            ['alice', 'A'],
          ],
        },
      ],
    });
  });

  it('rejects unsupported file types', async () => {
    const file = new File(['{}'], 'submissions.json', { type: 'application/json' });

    await expect(parseSubmissionUploadFile(file)).rejects.toThrow(
      'Upload a CSV or Excel file'
    );
  });
});
