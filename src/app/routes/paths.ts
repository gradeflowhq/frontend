/**
 * Centralized route path constants.
 *
 * Use these instead of hardcoded string literals to ensure all navigation targets
 * are defined in one place and can be updated without hunting across files.
 */
export const PATHS = {
  HOME:     '/',
  LOGIN:    '/login',
  REGISTER: '/register',
  ASSESSMENTS: '/assessments',
  SETTINGS: '/settings',
  SETTINGS_INTEGRATIONS: '/settings?tab=integrations',

  /** Build paths for a specific assessment workspace. */
  assessment: (id: string) => ({
    overview:    `/assessments/${id}/overview`,
    submissions: `/assessments/${id}/submissions`,
    questions:   `/assessments/${id}/questions`,
    rules:       `/assessments/${id}/rules`,
    publish:     `/assessments/${id}/publish`,
    members:     `/assessments/${id}/members`,
    settings:    `/assessments/${id}/settings`,
    results: {
      index:               `/assessments/${id}/results`,
      statistics:          `/assessments/${id}/results/statistics`,
      students:            `/assessments/${id}/results/students`,
      groups:              `/assessments/${id}/results/groups`,
      student:  (sid: string) => `/assessments/${id}/results/students/${encodeURIComponent(sid)}`,
      statistic:(sid: string) => `/assessments/${id}/results/statistics/${encodeURIComponent(sid)}`,
    },
  }),
} as const;
