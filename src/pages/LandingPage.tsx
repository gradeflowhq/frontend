import { AppShell, Avatar, Button, Card, Text, Title, SimpleGrid, Group, Box, Center } from '@mantine/core';
import { IconAdjustments, IconChartBar, IconCode, IconGitBranch, IconStack2 } from '@tabler/icons-react';
import React from 'react';
import { SiCanvas } from 'react-icons/si';
import { Link } from 'react-router-dom';

import PublicNavbar from '@components/common/PublicNavbar';
import { useDocumentTitle } from '@hooks/useDocumentTitle';

type FeatureItem = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const features: FeatureItem[] = [
  {
    icon: <IconAdjustments size={24} />,
    title: 'Rich grading rules',
    description: '15+ built-in rule types — text/number equality, regex, keywords, numeric ranges, similarity, length, multiple choice, and more. Handle any question format.',
  },
  {
    icon: <IconGitBranch size={24} />,
    title: 'Assumption and conditional rules',
    description: 'Assumption sets pick the interpretation that earns the highest score across multiple questions. Conditional rules branch scoring based on earlier answers.',
  },
  {
    icon: <IconCode size={24} />,
    title: 'Programmable rules',
    description: 'Write custom Python grading logic for anything the built-in rules cannot express. You can also grade codes by defining test cases using programming rule.',
  },
  {
    icon: <IconStack2 size={24} />,
    title: 'Composable rules',
    description: 'Combine rules with ALL / ANY / PARTIAL aggregation, nest composite rules, and add bonus rules — all without writing a single line of code.',
  },
  {
    icon: <IconChartBar size={24} />,
    title: 'Transparent, auditable results',
    description: 'See exactly which rules fired for every submission. Per-student and per-question breakdowns let you verify and manually adjust any grade.',
  },
  {
    icon: <SiCanvas size={20} />,
    title: 'Canvas LMS integration',
    description: 'Publish final grades directly to Canvas. Choose per-assignment settings, enable rounding, attach comments, and push with a single click.',
  },
];

const howItWorksSteps = [
  { n: '1', label: 'Create an assessment', description: 'Set up the assessment and invite collaborators' },
  { n: '2', label: 'Upload submissions', description: 'Import student answers via CSV or bulk upload' },
  { n: '3', label: 'Define grading rules', description: 'Configure your rubric — questions, rules, and scoring' },
  { n: '4', label: 'Review & export', description: 'Download results or push grades directly to Canvas' },
];

const LandingPage: React.FC = () => {
  useDocumentTitle('GradeFlow \u2014 Automated Assessment Grading');

  return (
    <AppShell header={{ height: 60 }} withBorder>
      <AppShell.Header>
        <PublicNavbar />
      </AppShell.Header>

      <AppShell.Main>
        {/* Hero */}
        <Box bg="gray.0" py={80} px="md">
          <Center>
            <div style={{ maxWidth: 720, textAlign: 'center' }}>
              <Title order={1} mb="lg" style={{ letterSpacing: '-0.5px' }}>
                Automate grading{' '}
                <Text span c="blue" inherit>without losing control</Text>
              </Title>
              <Text c="dimmed" size="lg" mb={40} maw={600} mx="auto">
                GradeFlow grades digital submissions using composable rules — exact match, fuzzy text, keyword
                detection, running student code, custom logic, and more. For answers that require human judgment,
                GradeFlow lets you review and adjust results before publishing.
              </Text>
              <Group justify="center" gap="md">
                <Button size="lg" component={Link} to="/register">
                  Create an account
                </Button>
                <Button size="lg" variant="outline" component={Link} to="/login">
                  Log in
                </Button>
              </Group>
            </div>
          </Center>
        </Box>

        {/* Features */}
        <Box py={64} px="md">
          <Center mb={48}>
            <Title order={2}>Built for the nuances of real assessments</Title>
          </Center>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" maw={980} mx="auto">
            {features.map((feature) => (
              <Card key={feature.title} withBorder shadow="sm" p="lg">
                <Text c="blue" mb="sm">{feature.icon}</Text>
                <Title order={5} mb="xs">{feature.title}</Title>
                <Text c="dimmed" size="sm">{feature.description}</Text>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* How it works */}
        <Box bg="gray.0" py={64} px="md">
          <Center mb={48}>
            <Title order={2}>How it works</Title>
          </Center>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl" maw={900} mx="auto">
            {howItWorksSteps.map((step) => (
              <Box key={step.label} ta="center">
                <Avatar color="blue" radius="xl" size="lg" mx="auto" mb="md" fw={700}>
                  {step.n}
                </Avatar>
                <Text fw={600} mb={4}>{step.label}</Text>
                <Text size="sm" c="dimmed">{step.description}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* CTA */}
        <Box py={80} px="md">
          <Center>
            <div style={{ maxWidth: 480, textAlign: 'center' }}>
              <Title order={2} mb="sm">Ready to get started?</Title>
              <Text c="dimmed" mb="xl">Create an account and run your first automated grading in minutes.</Text>
              <Group justify="center" gap="md">
                <Button size="lg" component={Link} to="/register">
                  Create an account
                </Button>
                <Button size="lg" variant="outline" component={Link} to="/login">
                  Log in
                </Button>
              </Group>
            </div>
          </Center>
        </Box>

        <Box component="footer" bg="gray.0" py="md">
          <Center>
            <Text size="sm" c="dimmed">
              &copy; {new Date().getFullYear()} GradeFlow. Built by educators for educators.
            </Text>
          </Center>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
};

export default LandingPage;
