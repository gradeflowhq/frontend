import React, { lazy, Suspense } from 'react';

type PageModule = {
  default: React.ComponentType;
};

export const lazyRouteElement = (
  load: () => Promise<PageModule>,
  fallback: React.ReactNode,
): React.ReactElement => {
  const Page = lazy(load);

  return (
    <Suspense fallback={fallback}>
      <Page />
    </Suspense>
  );
};
