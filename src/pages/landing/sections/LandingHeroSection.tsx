import { Box, Button, Center, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconBrandGithub } from '@tabler/icons-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { PATHS } from '@app/routes/paths';
import { useResolvedColorScheme } from '@hooks/useResolvedColorScheme';

import { trustStats } from '../landingData';
import { getLandingHeroBackground, getLandingSourceBadgeStyles } from '../landingTheme';

interface LandingHeroSectionProps {
  accessToken: string | null;
}

const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({ accessToken }) => {
  const colorScheme = useResolvedColorScheme();
  const heroBackground = getLandingHeroBackground(colorScheme);
  const sourceBadgeStyles = getLandingSourceBadgeStyles(colorScheme);

  return (
  <>
    {/* ── Hero ─────────────────────────────────────────────────────────── */}
    <Box
      py={{ base: 64, md: 96 }}
      px="md"
      style={{ background: heroBackground }}
    >
      <Center>
        <Stack align="center" gap="lg" style={{ maxWidth: 680, textAlign: 'center' }}>
          <Group gap="xs" justify="center">
            <Box
              component="a"
              href="https://github.com/gradeflowhq"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 99,
                border: `1px solid ${sourceBadgeStyles.borderColor}`,
                backgroundColor: sourceBadgeStyles.backgroundColor,
                color: sourceBadgeStyles.color,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
              }}
              aria-label="View source on GitHub"
            >
              <IconBrandGithub size={14} />
              Open source · MIT licensed
            </Box>
          </Group>

          <Title
            order={1}
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
            }}
          >
            Grading at scale,{' '}
            <Text
              span
              inherit
              style={{
                background:
                  'linear-gradient(90deg, var(--mantine-color-blue-6), var(--mantine-color-cyan-5))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              without losing the nuance.
            </Text>
          </Title>

          <Text size="lg" c="dimmed" maw={560} mx="auto" lh={1.7}>
            Build composable grading rules that reflect how you actually mark. Cluster similar answers for bulk review. Publish to Canvas instantly.
          </Text>

          <Group justify="center" gap="sm" mt="xs">
            {accessToken ? (
              <Button size="lg" component={Link} to={PATHS.ASSESSMENTS}>
                Go to my assessments
              </Button>
            ) : (
              <>
                <Button size="lg" component={Link} to={PATHS.REGISTER}>
                  Start grading
                </Button>
              </>
            )}
          </Group>

          {!accessToken && (
            <Text size="xs" c="dimmed">
              Always free · Self-hostable · Open source
            </Text>
          )}
        </Stack>
      </Center>
    </Box>

    {/* ── Trust stats bar ───────────────────────────────────────────────── */}
    <Box
      py={28}
      px="md"
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
        borderBottom: '1px solid var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <SimpleGrid cols={{ base: 2, sm: 4 }} maw={860} mx="auto" spacing="xl">
        {trustStats.map((s) => (
          <Stack key={s.label} align="center" gap={2}>
            <Text fw={800} size="xl" c="blue.6">{s.value}</Text>
            <Text size="sm" c="dimmed">{s.label}</Text>
          </Stack>
        ))}
      </SimpleGrid>
    </Box>
  </>
  );
};

export default LandingHeroSection;
