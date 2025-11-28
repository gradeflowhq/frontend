export const QK = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  assessments: {
    list: ['assessments', 'list'] as const,
    item: (id: string) => ['assessment', id] as const,
  },
  submissions: {
    list: (assessmentId: string) => ['submissions', assessmentId] as const,
  },
  questionSet: {
    item: (assessmentId: string) => ['questionSet', assessmentId] as const,
    parsed: (assessmentId: string) => ['parsedSubmissions', assessmentId] as const,
  },
  rubric: {
    item: (assessmentId: string) => ['rubric', assessmentId] as const,
    coverage: (assessmentId: string) => ['rubricCoverage', assessmentId] as const,
  },
  grading: {
    item: (assessmentId: string) => ['grading', assessmentId] as const,
    export: (assessmentId: string) => ['grading', assessmentId, 'export'] as const,
    job: (assessmentId: string) => ['grading', assessmentId, 'job'] as const,
    previewJob: (assessmentId: string) => ['grading', assessmentId, 'preview', 'job'] as const,
  },
  registry: {
    submissionsSavers: ['registry', 'submissionsSavers'] as const,
  },
};