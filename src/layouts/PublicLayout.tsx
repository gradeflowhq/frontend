import { AppShell, Center, Loader } from '@mantine/core';
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import PublicNavbar from '@components/common/PublicNavbar';

const PublicLayout: React.FC = () => (
  <AppShell header={{ height: 60 }} withBorder>
    <AppShell.Header>
      <PublicNavbar />
    </AppShell.Header>
    <AppShell.Main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Suspense fallback={<Center style={{ minHeight: '60vh' }}><Loader color="blue" /></Center>}>
        <Outlet />
      </Suspense>
    </AppShell.Main>
  </AppShell>
);

export default PublicLayout;
