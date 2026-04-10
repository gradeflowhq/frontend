import { Anchor, Box, Button, Center, Group, Stack, Text, Title } from '@mantine/core';
import React from 'react';
import { Link } from 'react-router-dom';

import { PATHS } from '@app/routes/paths';
import { useResolvedColorScheme } from '@hooks/useResolvedColorScheme';

import { getLandingCtaBackground } from '../landing-theme';

const CURRENT_YEAR = new Date().getFullYear();

interface LandingFooterProps {
  accessToken: string | null;
}

const LandingFooter: React.FC<LandingFooterProps> = ({ accessToken }) => {
  const colorScheme = useResolvedColorScheme();
  const ctaBackground = getLandingCtaBackground(colorScheme);

  return (
  <>
    {/* ── CTA ──────────────────────────────────────────────────────────── */}
    <Box
      py={80}
      px="md"
      style={{
        background: ctaBackground,
      }}
    >
      <Center>
        <Stack align="center" gap="lg" style={{ maxWidth: 500, textAlign: 'center' }}>
          <Title order={2} c="white">
            Ready to get started?
          </Title>
          <Text c="rgba(255,255,255,0.85)" size="md">
            Set up your first assessment and run automated grading in minutes.
          </Text>
          <Group justify="center" gap="sm">
            {accessToken ? (
              <Button
                size="lg"
                variant="white"
                color="blue"
                component={Link}
                to={PATHS.ASSESSMENTS}
              >
                Go to my assessments
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="white"
                  color="blue"
                  component={Link}
                  to={PATHS.REGISTER}
                >
                  Create account
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  color="white"
                  component={Link}
                  to={PATHS.LOGIN}
                >
                  Log in
                </Button>
              </>
            )}
          </Group>
        </Stack>
      </Center>
    </Box>

    {/* ── Footer ───────────────────────────────────────────────────────── */}
    <Box component="footer" bg="dark.8" py="lg" px="md">
      <Center>
        <Stack align="center" gap={6}>
          <Text fw={700} c="white" size="sm">GradeFlow</Text>
          <Text size="xs" c="dark.2">
            &copy; {CURRENT_YEAR} GradeFlow. Built by educators for educators.
          </Text>
          <Text size="xs" c="dark.3">
            Part of{' '}
            <Anchor
              href="https://edfab.org"
              target="_blank"
              rel="noopener noreferrer"
              c="dark.2"
              size="xs"
            >
              EdFab — Education Fabrication Lab
            </Anchor>
          </Text>
        </Stack>
      </Center>
    </Box>
  </>
  );
};

export default LandingFooter;
