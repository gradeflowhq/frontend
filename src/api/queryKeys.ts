export const QK = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  assessments: {
    list: ['assessments', 'list'] as const,
    item: (id: string) => ['assessment', id] as const,
    members: (id: string) => ['assessments', id, 'members'] as const,
  },
  submissions: {
    list: (assessmentId: string) => ['submissions', assessmentId] as const,
    source: (assessmentId: string) => ['submissions', assessmentId, 'source'] as const,
    config: (assessmentId: string) => ['submissions', assessmentId, 'config'] as const,
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
    jobStatus: (jobId: string) => ['jobs', 'status', jobId] as const,
    csv: (assessmentId: string, roundingBase: number) => ['grading', 'csv', assessmentId, roundingBase] as const,
  },
  canvas: {
    courses: (baseUrl: string) => ['canvas', 'courses', baseUrl] as const,
    courseData: (courseId: string, baseUrl: string) => ['canvas', 'course-data', courseId, baseUrl] as const,
    progress: (progressUrl: string) => ['canvas', 'progress', progressUrl] as const,
    me: (baseUrl: string) => ['canvas', 'me', baseUrl] as const,
  },
};