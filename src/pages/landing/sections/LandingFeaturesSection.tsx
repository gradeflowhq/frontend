import { Box, Button, Card, Center, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import React from 'react';
import { Link } from 'react-router-dom';

import { PATHS } from '@app/routes/paths';
import { useResolvedColorScheme } from '@hooks/useResolvedColorScheme';

import { features } from '../landingData';
import { getLandingFeatureIconColors } from '../landingTheme';

interface LandingFeaturesSectionProps {
  accessToken: string | null;
}

const LandingFeaturesSection: React.FC<LandingFeaturesSectionProps> = ({ accessToken }) => {
  const colorScheme = useResolvedColorScheme();
  const iconColors = getLandingFeatureIconColors(colorScheme);

  return (
  <Box
    component="section"
    aria-labelledby="features-heading"
    py={72}
    px="md"
    style={{ background: 'var(--mantine-color-default-hover)' }}
  >
    <Center mb={52}>
      <Stack align="center" gap="xs">
        <Text
          size="sm"
          fw={600}
          c="blue"
          tt="uppercase"
          style={{ letterSpacing: '0.06em' }}
        >
          Features
        </Text>
        <Title id="features-heading" order={2} ta="center">
          Built for the nuances of real assessments
        </Title>
        <Text c="dimmed" ta="center" maw={520}>
          Everything you need to go from raw submissions to published grades — without
          sacrificing auditability or flexibility.
        </Text>
      </Stack>
    </Center>

    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" maw={1080} mx="auto">
      {features.map((feature) => (
        <Card
          key={feature.title}
          withBorder
          shadow="xs"
          p="xl"
          style={{
            transition: 'transform 150ms ease, box-shadow 150ms ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
            (e.currentTarget as HTMLElement).style.boxShadow =
              'var(--mantine-shadow-md)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = '';
            (e.currentTarget as HTMLElement).style.boxShadow = '';
          }}
        >
          <Box
            mb="md"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 10,
              backgroundColor: iconColors.background,
              color: iconColors.color,
            }}
          >
            {feature.icon}
          </Box>
          <Title order={5} mb="xs">{feature.title}</Title>
          <Text size="sm" c="dimmed" lh={1.65}>
            {feature.description}
          </Text>
        </Card>
      ))}
    </SimpleGrid>

    <Center mt={52}>
      <Button
        size="md"
        variant="light"
        component={Link}
        to={accessToken ? PATHS.ASSESSMENTS : PATHS.REGISTER}
      >
        Start grading →
      </Button>
    </Center>
  </Box>
  );
};

export default LandingFeaturesSection;
