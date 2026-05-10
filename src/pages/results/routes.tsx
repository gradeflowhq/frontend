import { lazyRouteElement } from '@app/routes/lazyRouteElement';

import {
  CanvasPushPageSkeleton,
  GroupViewPageSkeleton,
  StatisticsPageSkeleton,
  StudentsPageSkeleton,
} from './ResultsPageSkeletons';
import SubmissionDetailPageSkeleton from './SubmissionDetailPageSkeleton';

import type { RouteObject } from 'react-router-dom';

export const resultsChildRoutes: RouteObject[] = [
  {
    path: 'statistics',
    element: lazyRouteElement(() => import('./StatisticsPage'), <StatisticsPageSkeleton />),
  },
  {
    path: 'students',
    element: lazyRouteElement(() => import('./StudentsPage'), <StudentsPageSkeleton />),
  },
  {
    path: 'students/:studentId',
    element: lazyRouteElement(() => import('./SubmissionDetailPage'), <SubmissionDetailPageSkeleton />),
  },
  {
    path: 'groups',
    element: lazyRouteElement(() => import('./GroupViewPage'), <GroupViewPageSkeleton />),
  },
];

export const canvasPushRoute: RouteObject = {
  path: 'publish',
  element: lazyRouteElement(() => import('./CanvasPushPage'), <CanvasPushPageSkeleton />),
};
