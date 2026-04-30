/**
 * Route-level prefetching utilities.
 * Calling prefetch() for a route triggers the dynamic import so the chunk
 * is downloaded while the user is still hovering – reducing the "freeze"
 * they'd otherwise experience on first navigation.
 */

type PrefetchFn = () => void;

type RouteKey =
  | 'assessments'
  | 'overview'
  | 'submissions'
  | 'submissionDetail'
  | 'questions'
  | 'rules'
  | 'statistics'
  | 'students'
  | 'groups'
  | 'publish'
  | 'members'
  | 'settings'
  | 'userSettings';

const prefetchers: Record<RouteKey, PrefetchFn> = {
  assessments: () => void import('@pages/assessments/list/AssessmentsPage'),
  overview: () => void import('@pages/assessments/workspace/OverviewPage'),
  submissions: () => void import('@pages/assessments/workspace/SubmissionsPage'),
  questions: () => void import('@pages/assessments/workspace/QuestionsPage'),
  rules: () => void import('@pages/assessments/workspace/RulesPage'),
  statistics: () => void import('@pages/results/StatisticsPage'),
  students: () => void import('@pages/results/StudentsPage'),
  submissionDetail: () => void import('@pages/results/SubmissionDetailPage'),
  groups: () => void import('@pages/results/GroupViewPage'),
  publish: () => void import('@pages/results/CanvasPushPage'),
  members: () => void import('@pages/assessments/workspace/MembersPage'),
  settings: () => void import('@pages/assessments/workspace/SettingsPage'),
  userSettings: () => void import('@pages/settings/UserSettingsPage'),
};

/**
 * Eagerly prefetch all registered route chunks during idle time so that
 * navigations to never-visited pages are instant.
 */
export const prefetchAllOnIdle = (): void => {
  const run = () => {
    Object.values(prefetchers).forEach((fn) => {
      try { fn(); } catch { /* ignore */ }
    });
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run);
  } else {
    setTimeout(run, 2000);
  }
};