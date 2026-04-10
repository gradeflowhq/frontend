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
  groups: () => void import('@pages/results/GroupViewPage'),
  publish: () => void import('@pages/results/CanvasPushPage'),
  members: () => void import('@pages/assessments/workspace/MembersPage'),
  settings: () => void import('@pages/assessments/workspace/SettingsPage'),
  userSettings: () => void import('@pages/settings/UserSettingsPage'),
};

export const prefetchRoute = (key: RouteKey): void => {
  try {
    prefetchers[key]?.();
  } catch {
    // silently ignore prefetch errors – they should not affect UX
  }
};
