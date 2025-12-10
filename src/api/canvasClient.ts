import axios from 'axios';

import type { AxiosInstance, AxiosResponse } from 'axios';

export type CanvasUser = {
  id: number;
  name?: string;
  short_name?: string;
  sortable_name?: string;
};

export type CanvasGradeInput = {
  posted_grade?: number | string;
  text_comment?: string;
};

export type CanvasBulkUpdateRequest = {
  grade_data: Record<string, CanvasGradeInput>;
};

export type CanvasAssignment = {
  id: number;
  name: string;
  points_possible?: number;
  assignment_group_id?: number;
};

export type CanvasAssignmentInput = {
  name: string;
  points_possible?: number;
  assignment_group_id?: number;
  published?: boolean;
  grading_type?: 'points' | 'percent' | 'pass_fail' | 'letter_grade' | 'gpa_scale' | 'not_graded';
  submission_types?: string[];
};

export type CanvasAssignmentGroup = {
  id: number;
  name: string;
  position?: number;
  group_weight?: number;
};

export type CanvasUserSummary = {
  id: number;
  name?: string;
  short_name?: string;
  sortable_name?: string;
  login_id?: string;
  sis_user_id?: string;
  integration_id?: string;
};

export type CanvasCourse = {
  id: number;
  name: string;
  course_code?: string;
  sis_course_id?: string;
};

export type CanvasAssignmentSummary = Pick<CanvasAssignment, 'id' | 'name' | 'points_possible' | 'assignment_group_id'>;

export type CanvasProgress = {
  id: number;
  context_id: number;
  context_type: string;
  user_id: number | null;
  tag: string;
  completion: number | null;
  workflow_state: 'queued' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  message: string | null;
  url: string;
};

export type CanvasClientConfig = {
  canvasBaseUrl: string;
  token: string;
  corsProxyBaseUrl?: string;
  timeoutMs?: number;
};

const DEFAULT_PROXY_BASE = import.meta.env.VITE_CORS_PROXY_URL ?? 'http://localhost:8080';

export const sanitizeCanvasBaseInput = (value: string) => value.trim().replace(/\/+$/, '');

export const normalizeCanvasBaseUrl = (value: string) => {
  const sanitized = sanitizeCanvasBaseInput(value);
  if (!sanitized) return '';
  return /^https?:\/\//i.test(sanitized) ? sanitized : `https://${sanitized}`;
};

const buildAxiosClient = ({
  canvasBaseUrl,
  token,
  corsProxyBaseUrl,
  timeoutMs = 10000,
}: CanvasClientConfig): AxiosInstance => {
  const normalizedBase = normalizeCanvasBaseUrl(canvasBaseUrl);
  if (!normalizedBase) throw new Error('Canvas base URL is required');
  if (!token.trim()) throw new Error('Canvas access token is required');

  const parsed = new URL(normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`);
  const proxyBase = (corsProxyBaseUrl ?? DEFAULT_PROXY_BASE).replace(/\/+$/, '') || DEFAULT_PROXY_BASE;
  const pathPrefix = parsed.pathname.replace(/\/$/, '');
  const proxyBaseUrl = `${proxyBase}${pathPrefix}`;

  return axios.create({
    baseURL: proxyBaseUrl || proxyBase,
    timeout: timeoutMs,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Host': parsed.hostname,
    },
  });
};

export const createCanvasClient = (config: CanvasClientConfig) => {
  const client = buildAxiosClient(config);

  const fetchAllPages = async <T,>(fetchPage: (page: number) => Promise<T[]>): Promise<T[]> => {
    const acc: T[] = [];
    let page = 1;
    while (true) {
      const chunk = await fetchPage(page);
      acc.push(...chunk);
      if (!chunk.length || chunk.length < 100) break;
      page += 1;
      if (page > 50) break; // safety guard
    }
    return acc;
  };

  return {
    getCurrentUser: () => client.get<CanvasUser>('/api/v1/users/self'),
    getAssignment: (courseId: string | number, assignmentId: string | number) =>
      client.get<CanvasAssignment>(`/api/v1/courses/${courseId}/assignments/${assignmentId}`),
    findAssignmentByName: async (courseId: string | number, name: string) => {
      const res = await client.get<CanvasAssignment[]>(`/api/v1/courses/${courseId}/assignments`, {
        params: { search_term: name, per_page: 50 },
      });
      const lowered = name.trim().toLowerCase();
      return res.data.find((a) => a.name?.trim().toLowerCase() === lowered) ?? null;
    },
    createAssignment: (
      courseId: string | number,
      assignment: CanvasAssignmentInput
    ): Promise<AxiosResponse<CanvasAssignment>> =>
      client.post(`/api/v1/courses/${courseId}/assignments`, {
        assignment: {
          submission_types: ['none'],
          grading_type: 'points',
          published: true,
          ...assignment,
        },
      }),
    updateGrades: (
      courseId: string | number,
      assignmentId: string | number,
      gradeData: CanvasBulkUpdateRequest['grade_data']
    ): Promise<AxiosResponse<CanvasProgress>> =>
      client.post(`/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/update_grades`, {
        grade_data: gradeData,
      }),
    getProgress: (progressUrl: string): Promise<AxiosResponse<CanvasProgress>> => {
      // Extract the path from the full URL (Canvas returns full URLs like https://canvas.example.com/api/v1/progress/123)
      try {
        const url = new URL(progressUrl);
        return client.get(url.pathname);
      } catch {
        // If not a full URL, use as-is
        return client.get(progressUrl);
      }
    },
    listAssignmentGroups: (courseId: string | number) =>
      client.get<CanvasAssignmentGroup[]>(`/api/v1/courses/${courseId}/assignment_groups`, {
        params: { per_page: 50 },
      }),
    listCourseUsers: (courseId: string | number, page = 1) =>
      client.get<CanvasUserSummary[]>(`/api/v1/courses/${courseId}/users`, {
        params: {
          enrollment_type: ['student'],
          include: ['login_id', 'integration_id', 'sis_user_id'],
          per_page: 100,
          page,
        },
      }),
    listAllCourseUsers: async (courseId: string | number) =>
      fetchAllPages((page) =>
        client
          .get<CanvasUserSummary[]>(`/api/v1/courses/${courseId}/users`, {
            params: {
              enrollment_type: ['student'],
              include: ['login_id', 'integration_id', 'sis_user_id'],
              per_page: 100,
              page,
            },
          })
          .then((r) => r.data)
      ),
    listCourses: (page = 1) =>
      client.get<CanvasCourse[]>(`/api/v1/courses`, {
        params: { enrollment_state: ['available'], per_page: 100, page },
      }),
    listAllCourses: async () =>
      fetchAllPages((page) =>
        client
          .get<CanvasCourse[]>(`/api/v1/courses`, {
            params: { enrollment_state: ['available'], per_page: 100, page },
          })
          .then((r) => r.data)
      ),
    listAssignments: (courseId: string | number, page = 1) =>
      client.get<CanvasAssignmentSummary[]>(`/api/v1/courses/${courseId}/assignments`, {
        params: { per_page: 100, order_by: 'name', page },
      }),
    listAllAssignments: async (courseId: string | number) =>
      fetchAllPages((page) =>
        client
          .get<CanvasAssignmentSummary[]>(`/api/v1/courses/${courseId}/assignments`, {
            params: { per_page: 100, order_by: 'name', page },
          })
          .then((r) => r.data)
      ),
  };
};
