import { lazyRouteElement } from '@app/routes/lazyRouteElement';

import UserSettingsPageSkeleton from './UserSettingsPageSkeleton';

import type { RouteObject } from 'react-router-dom';

export const userSettingsRoute: RouteObject = {
  path: '/settings',
  element: lazyRouteElement(() => import('./UserSettingsPage'), <UserSettingsPageSkeleton />),
};
