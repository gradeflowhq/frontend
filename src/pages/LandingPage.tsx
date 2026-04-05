import { AppShell, Anchor, Button, Card, Group, Text, Title, SimpleGrid, Box, Center } from '@mantine/core';
import { IconAdjustments, IconBrandGithub, IconChartBar, IconCode, IconGitBranch, IconSend, IconStack2 } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

import PublicNavbar from '@components/common/PublicNavbar';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useAuthStore } from '@state/authStore';

const CURRENT_YEAR = new Date().getFullYear();

type FeatureItem = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const features: FeatureItem[] = [
  {
    icon: <IconAdjustments size={24} />,
    title: 'Rich grading rules',
    description:
      '15+ built-in rule types — text/number equality, regex, keywords, numeric ranges, similarity, length, multiple choice, and more. Handle any question format.',
  },
  {
    icon: <IconGitBranch size={24} />,
    title: 'Assumption and conditional rules',
    description:
      'Assumption sets pick the interpretation that earns the highest score across multiple questions. Conditional rules branch scoring based on earlier answers.',
  },
  {
    icon: <IconCode size={24} />,
    title: 'Programmable rules',
    description:
      'Write custom Python grading logic for anything the built-in rules cannot express. You can also grade code by defining test cases using the programming rule.',
  },
  {
    icon: <IconStack2 size={24} />,
    title: 'Composable rules',
    description:
      'Combine rules with ALL / ANY / PARTIAL aggregation, nest composite rules, and add bonus rules — all without writing a single line of code.',
  },
  {
    icon: <IconChartBar size={24} />,
    title: 'Transparent, auditable results',
    description:
      'See exactly which rules fired for every submission. Per-student and per-question breakdowns let you verify and manually adjust any grade.',
  },
  {
    icon: <IconSend size={24} />,
    title: 'Canvas LMS integration',
    description:
      'Publish final grades directly to Canvas. Choose per-assignment settings, enable rounding, attach comments, and push with a single click.',
  },
];

const howItWorksSteps = [
  { n: '1', label: 'Create an assessment', description: 'Set up the assessment and invite collaborators' },
  { n: '2', label: 'Upload submissions', description: 'Import student answers from Examplify or other platforms' },
  { n: '3', label: 'Define grading rules', description: 'Configure your assessment — questions, rules, and scoring' },
  { n: '4', label: 'Review & export', description: 'Download results or push grades directly to Canvas' },
];

const LandingPage: React.FC = () => {
  useDocumentTitle('GradeFlow \u2014 Automated Assessment Grading');

  // Set meta description for SEO
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content =
      'GradeFlow is an open-source automated assessment grading platform. Define composable grading rules, review every result, and publish grades directly to Canvas LMS.';
  }, []);

  const accessToken = useAuthStore((s) => s.accessToken);

  return (
    <AppShell header={{ height: 60 }} withBorder>
      <AppShell.Header>
        <PublicNavbar />
      </AppShell.Header>

      <AppShell.Main>
        {/* ── Hero ── */}
        <Box
          py={80}
          px="md"
          style={{
            background:
              'linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-gray-0) 100%)',
          }}
        >
          <Center>
            <div style={{ maxWidth: 720, textAlign: 'center' }}>
              <Title order={1} mb="lg" style={{ letterSpacing: '-0.5px' }}>
                Automated grading{' '}
                <Text span c="blue" inherit>
                  with full transparency
                </Text>
              </Title>
              <Text size="lg" mb={40} maw={600} mx="auto">
                Define composable grading rules — exact match, fuzzy text, regex, keywords, numeric
                ranges, custom Python logic, and more. Review every result before it goes to students.
              </Text>

              <Group justify="center" gap="md">
                {accessToken ? (
                  <Button size="xl" component={Link} to="/assessments">
                    Go to my assessments
                  </Button>
                ) : (
                  <>
                    <Button size="xl" component={Link} to="/register">
                      Get started — it&apos;s free
                    </Button>
                    <Button size="xl" variant="default" component={Link} to="/login">
                      Log in
                    </Button>
                  </>
                )}
              </Group>

              <Group justify="center" mt="lg" gap="xs">
                <Anchor
                  href="https://github.com/gradeflowhq"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  aria-label="Open source on GitHub"
                >
                  <IconBrandGithub size={16} />
                  Open source on GitHub
                </Anchor>
              </Group>
            </div>
          </Center>
        </Box>

        {/* ── Features ── */}
        <Box
          component="section"
          aria-labelledby="features-heading"
          py={64}
          px="md"
        >
          <Center mb={48}>
            <Title id="features-heading" order={2}>
              Built for the nuances of real assessments
            </Title>
          </Center>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" maw={980} mx="auto">
            {features.map((feature) => (
              <Card key={feature.title} withBorder shadow="sm" p="lg">
                <Text c="blue" mb="sm">
                  {feature.icon}
                </Text>
                <Title order={5} mb="xs">
                  {feature.title}
                </Title>
                <Text size="sm">
                  {feature.description}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        {/* ── How it works ── */}
        <Box
          component="section"
          aria-labelledby="how-it-works-heading"
          bg="gray.0"
          py={64}
          px="md"
        >
          <Center mb={48}>
            <Title id="how-it-works-heading" order={2}>
              How it works
            </Title>
          </Center>
          <SimpleGrid
            component="ol"
            cols={{ base: 1, sm: 2, md: 4 }}
            spacing="xl"
            maw={900}
            mx="auto"
            style={{ listStyle: 'none', padding: 0, margin: '0 auto' }}
          >
            {howItWorksSteps.map((step) => (
              <Box component="li" key={step.label} ta="center">
                <Box
                  mx="auto"
                  mb="md"
                  aria-label={`Step ${step.n}`}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'var(--mantine-color-blue-6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text c="white" fw={700} size="lg">
                    {step.n}
                  </Text>
                </Box>
                <Text fw={600} mb={4}>
                  {step.label}
                </Text>
                <Text size="sm">
                  {step.description}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        {/* ── CTA ── */}
        <Box py={80} px="md">
          <Center>
            <div style={{ maxWidth: 640, textAlign: 'center' }}>
              <Title order={2} mb="sm">
                Ready to get started?
              </Title>
              <Text mb="xl">
                Set up your first assessment and run automated grading in minutes.
              </Text>
              {accessToken ? (
                <Button size="lg" component={Link} to="/assessments">
                  Go to my assessments
                </Button>
              ) : (
                <Button size="lg" component={Link} to="/register">
                  Create an account
                </Button>
              )}
            </div>
          </Center>
        </Box>

        {/* ── Footer ── */}
        <Box component="footer" bg="gray.0" py="md">
          <Center>
            <Box ta="center">
              <Text size="sm">
                &copy; {CURRENT_YEAR} GradeFlow. Built by educators for educators.
              </Text>
              <Text size="xs" mt={4}>
                Part of{' '}
                <Anchor
                  href="https://edfab.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xs"
                >
                  EdFab - Education Fabrication Lab
                </Anchor>
              </Text>
            </Box>
          </Center>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
};

export default LandingPage;
