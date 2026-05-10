import { lazyRouteElement } from '@app/routes/lazyRouteElement';

import type { RouteObject } from 'react-router-dom';

export const landingRoute: RouteObject = {
  path: '/',
  element: lazyRouteElement(() => import('./LandingPage'), null),
};
