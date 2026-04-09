import { AppShell } from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import React from 'react';

import PublicNavbar from '@components/common/PublicNavbar';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useAuthStore } from '@state/authStore';

import LandingFaqSection from './sections/LandingFaqSection';
import LandingFeaturesSection from './sections/LandingFeaturesSection';
import LandingFooter from './sections/LandingFooter';
import LandingHeroSection from './sections/LandingHeroSection';
import LandingHowItWorksSection from './sections/LandingHowItWorksSection';

const LandingPage: React.FC = () => {
  useDocumentTitle('GradeFlow \u2014 Automated Assessment Grading');

  const [scroll] = useWindowScroll();
  const scrolled = scroll.y > 20;


  const accessToken = useAuthStore((s) => s.accessToken);

  return (
    <AppShell header={{ height: 60 }} withBorder={false}>
      <AppShell.Header
        style={{
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          backgroundColor: scrolled ? 'rgba(255,255,255,0.88)' : 'white',
          borderBottom: scrolled
            ? '1px solid var(--mantine-color-default-border)'
            : '1px solid transparent',
          transition:
            'background-color 200ms ease, border-color 200ms ease, backdrop-filter 200ms ease',
        }}
      >
        <PublicNavbar />
      </AppShell.Header>

      <AppShell.Main>
        <LandingHeroSection accessToken={accessToken} />
        <LandingFeaturesSection accessToken={accessToken} />
        <LandingHowItWorksSection />
        <LandingFaqSection />
        <LandingFooter accessToken={accessToken} />
      </AppShell.Main>
    </AppShell>
  );
};

export default LandingPage;
