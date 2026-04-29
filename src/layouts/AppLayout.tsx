import { AppShell, Box, Burger, Center, Loader, Text } from '@mantine/core';
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { prefetchAllOnIdle } from '@app/routes/prefetch';
import ErrorBoundary from '@components/common/ErrorBoundary';
import { SIDEBAR_EXPANDED_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@lib/constants';
import { SIDEBAR_PINNED_STORAGE_KEY } from '@lib/storageKeys';

import { SidebarNav } from './SidebarNav';

const AppLayoutInner: React.FC<{
  expanded: boolean;
  mobileOpened: boolean;
  onToggle: () => void;
  onMobileToggle: () => void;
}> = ({
  expanded,
  mobileOpened,
  onToggle,
  onMobileToggle,
}) => {
  return (
    <AppShell
      navbar={{
        width: expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      transitionDuration={200}
      withBorder={false}
    >
      <SidebarNav
        expanded={expanded}
        onToggle={onToggle}
      />

      <AppShell.Main>
        {/* Mobile-only top bar */}
        <Box
          hiddenFrom="sm"
          px="md"
          py="xs"
          style={{
            borderBottom: '1px solid var(--mantine-color-default-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Burger opened={mobileOpened} onClick={onMobileToggle} size="sm" />
          <Text fw={800} size="sm">GradeFlow</Text>
        </Box>

        <Box
          hiddenFrom="sm"
          onClick={onMobileToggle}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.4)',
            opacity: mobileOpened ? 1 : 0,
            pointerEvents: mobileOpened ? 'auto' : 'none',
            transition: 'opacity 200ms ease',
          }}
        />

        <ErrorBoundary>
          <Suspense fallback={
            <Center style={{ minHeight: '60vh' }}>
              <Loader color="blue" />
            </Center>
          }>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </AppShell.Main>
    </AppShell>
  );
};

const AppLayout: React.FC = () => {
  const [mobileOpened, setMobileOpened] = useState(false);
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const handleToggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    try {
      localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, [expanded]);

  useEffect(() => {
    prefetchAllOnIdle();
  }, []);

  return (
    <AppLayoutInner
      expanded={expanded}
      mobileOpened={mobileOpened}
      onToggle={handleToggle}
      onMobileToggle={() => setMobileOpened((o) => !o)}
    />
  );
};

export default AppLayout;