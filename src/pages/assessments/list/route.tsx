import { lazyRouteElement } from '@app/routes/lazyRouteElement';

import AssessmentsPageSkeleton from './AssessmentsPageSkeleton';

import type { RouteObject } from 'react-router-dom';

export const assessmentsListRoute: RouteObject = {
  path: '/assessments',
  element: lazyRouteElement(() => import('./AssessmentsPage'), <AssessmentsPageSkeleton />),
};
