import { Navigate } from 'react-router-dom';

import { lazyRouteElement } from '@app/routes/lazyRouteElement';
import { canvasPushRoute, resultsChildRoutes } from '@pages/results/routes';

import OverviewPageSkeleton from './OverviewPageSkeleton';
import {
  AssessmentSettingsPageSkeleton,
  MembersPageSkeleton,
  QuestionsPageSkeleton,
  RulesPageSkeleton,
  SubmissionsPageSkeleton,
} from './WorkspacePageSkeletons';

import type { RouteObject } from 'react-router-dom';

export const assessmentWorkspaceChildRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="overview" replace /> },
  {
    path: 'overview',
    element: lazyRouteElement(() => import('./OverviewPage'), <OverviewPageSkeleton />),
  },
  {
    path: 'submissions',
    element: lazyRouteElement(() => import('./SubmissionsPage'), <SubmissionsPageSkeleton />),
  },
  {
    path: 'questions',
    element: lazyRouteElement(() => import('./QuestionsPage'), <QuestionsPageSkeleton />),
  },
  {
    path: 'rules',
    element: lazyRouteElement(() => import('./RulesPage'), <RulesPageSkeleton />),
  },
  {
    path: 'results',
    children: [
      { index: true, element: <Navigate to="statistics" replace /> },
      ...resultsChildRoutes,
    ],
  },
  canvasPushRoute,
  {
    path: 'members',
    element: lazyRouteElement(() => import('./MembersPage'), <MembersPageSkeleton />),
  },
  {
    path: 'settings',
    element: lazyRouteElement(() => import('./SettingsPage'), <AssessmentSettingsPageSkeleton />),
  },
];
