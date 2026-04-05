import { AppShell, Anchor, Button, Card, Group, Text, Title, SimpleGrid, Box, Center, Stack } from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import {
  IconAdjustments,
  IconBrandGithub,
  IconChartBar,
  IconCode,
  IconGitBranch,
  IconSend,
  IconStack2,
} from '@tabler/icons-react';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

import PublicNavbar from '@components/common/PublicNavbar';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useAuthStore } from '@state/authStore';

const CURRENT_YEAR = new Date().getFullYear();

// ── Data ────────────────────────────────────────────────────────────────────

type FeatureItem = {
  icon: React.ReactNode;
  title: string;
  description: string;
  featured?: boolean;
};

const features: FeatureItem[] = [
  {
    icon: <IconAdjustments size={28} />,
    title: 'Rich grading rules',
    description:
      '15+ built-in rule types — text/number equality, regex, keywords, numeric ranges, similarity, length, multiple choice, and more. Handle any question format.',
    featured: true,
  },
  {
    icon: <IconGitBranch size={28} />,
    title: 'Assumption and conditional rules',
    description:
      'Assumption sets pick the interpretation that earns the highest score across multiple questions. Conditional rules branch scoring based on earlier answers.',
    featured: true,
  },
  {
    icon: <IconCode size={28} />,
    title: 'Programmable rules',
    description:
      'Write custom Python grading logic for anything the built-in rules cannot express. You can also grade code by defining test cases using the programming rule.',
  },
  {
    icon: <IconStack2 size={28} />,
    title: 'Composable rules',
    description:
      'Combine rules with ALL / ANY / PARTIAL aggregation, nest composite rules, and add bonus rules — all without writing a single line of code.',
  },
  {
    icon: <IconChartBar size={28} />,
    title: 'Transparent, auditable results',
    description:
      'See exactly which rules fired for every submission. Per-student and per-question breakdowns let you verify and manually adjust any grade.',
  },
  {
    icon: <IconSend size={28} />,
    title: 'Canvas LMS integration',
    description:
      'Publish final grades directly to Canvas. Choose per-assignment settings, enable rounding, attach comments, and push with a single click.',
  },
];

const trustStats = [
  { value: '15+', label: 'Rule types' },
  { value: 'Secure', label: 'Client-side encryption' },
  { value: 'Open source', label: 'MIT licensed' },
  { value: 'Canvas LMS', label: 'Native integration' },
];

const howItWorksSteps = [
  { n: '1', label: 'Create an assessment', description: 'Set up the assessment and invite collaborators.' },
  { n: '2', label: 'Upload submissions', description: 'Import student answers from Examplify or other platforms.' },
  { n: '3', label: 'Define grading rules', description: 'Configure your assessment — questions, rules, and scoring.' },
  { n: '4', label: 'Review & export', description: 'Download results or push grades directly to Canvas.' },
];

const faqs: { q: string; a: string }[] = [
  {
    q: 'Does it work with Examplify?',
    a: 'Yes. Export your Examplify results as a CSV and upload it directly.',
  },
  {
    q: 'Is student data stored on your servers?',
    a: 'Student IDs can be encrypted client-side before upload using AES-GCM. The server only ever sees the ciphertext — your passphrase never leaves the browser.',
  },
  {
    q: 'Can I self-host GradeFlow?',
    a: 'Absolutely. GradeFlow is open source (MIT) and ships with Docker. Point it at your own database and you own all your data.',
  },
  {
    q: 'What if the built-in rules are not enough?',
    a: 'Use the Python rule to write arbitrary grading logic, or the programming rule to run student code against test cases — all sandboxed server-side.',
  },
];

// ── Sub-components ───────────────────────────────────────────────────────────

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Box
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'white',
      }}
    >
      <Box
        component="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 12,
        }}
        aria-expanded={open}
      >
        <Text fw={500} size="sm" style={{ flex: 1 }}>{q}</Text>
        <Text c="dimmed" style={{ flexShrink: 0, fontSize: 18, lineHeight: 1 }}>{open ? '−' : '+'}</Text>
      </Box>
      {open && (
        <Box px={18} pb={14}>
          <Text size="sm" c="dimmed">{a}</Text>
        </Box>
      )}
    </Box>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  useDocumentTitle('GradeFlow \u2014 Automated Assessment Grading');

  const [scroll] = useWindowScroll();
  const scrolled = scroll.y > 20;

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
    <AppShell
      header={{ height: 60 }}
      withBorder={false}
    >
      <AppShell.Header
        style={{
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          backgroundColor: scrolled ? 'rgba(255,255,255,0.88)' : 'white',
          borderBottom: scrolled
            ? '1px solid var(--mantine-color-default-border)'
            : '1px solid transparent',
          transition: 'background-color 200ms ease, border-color 200ms ease, backdrop-filter 200ms ease',
        }}
      >
        <PublicNavbar />
      </AppShell.Header>

      <AppShell.Main>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <Box
          py={{ base: 64, md: 96 }}
          px="md"
          style={{
            background:
              'linear-gradient(150deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-gray-0) 60%, white 100%)',
          }}
        >
          <Center>
            <Stack align="center" gap="lg" style={{ maxWidth: 740, textAlign: 'center' }}>

              {/* Badge row */}
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
                    border: '1px solid var(--mantine-color-default-border)',
                    backgroundColor: 'white',
                    textDecoration: 'none',
                    color: 'var(--mantine-color-dark-6)',
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
                Grade smarter.{' '}
                <Text
                  span
                  inherit
                  style={{
                    background: 'linear-gradient(90deg, var(--mantine-color-blue-6), var(--mantine-color-cyan-5))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Publish faster.
                </Text>
              </Title>

              <Text size="lg" c="dimmed" maw={480} mx="auto" lh={1.7}>
                Build composable rules that reflect how you actually mark. Review every result. Publish to Canvas instantly.
              </Text>

              <Group justify="center" gap="sm" mt="xs">
                {accessToken ? (
                  <Button size="lg" component={Link} to="/assessments">
                    Go to my assessments
                  </Button>
                ) : (
                  <>
                    <Button size="lg" component={Link} to="/register">
                      Start grading
                    </Button>
                    <Button size="lg" variant="default" component={Link} to="/login">
                      Log in
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
            backgroundColor: 'white',
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

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <Box
          component="section"
          aria-labelledby="features-heading"
          py={72}
          px="md"
          bg="gray.0"
        >
          <Center mb={52}>
            <Stack align="center" gap="xs">
              <Text size="sm" fw={600} c="blue" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
                Features
              </Text>
              <Title id="features-heading" order={2} ta="center">
                Built for the nuances of real assessments
              </Title>
              <Text c="dimmed" ta="center" maw={480}>
                Everything you need to go from raw submissions to published grades — without sacrificing auditability.
              </Text>
            </Stack>
          </Center>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" maw={980} mx="auto">
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
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--mantine-shadow-md)';
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
                    backgroundColor: 'var(--mantine-color-blue-0)',
                    color: 'var(--mantine-color-blue-6)',
                  }}
                >
                  {feature.icon}
                </Box>
                <Title order={5} mb="xs">{feature.title}</Title>
                <Text size="sm" c="dimmed" lh={1.65}>{feature.description}</Text>
              </Card>
            ))}
          </SimpleGrid>

          <Center mt={52}>
            <Button
              size="md"
              variant="light"
              component={Link}
              to={accessToken ? '/assessments' : '/register'}
            >
              Start grading →
            </Button>
          </Center>
        </Box>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <Box
          component="section"
          aria-labelledby="how-it-works-heading"
          bg="white"
          py={64}
          px="md"
        >
          <Center mb={12}>
            <Text size="xs" fw={700} tt="uppercase" c="blue" style={{ letterSpacing: '0.1em' }}>
              How it works
            </Text>
          </Center>
          <Center mb={48}>
            <Title id="how-it-works-heading" order={2} ta="center">
              From raw submissions to published grades
            </Title>
          </Center>

          <Box maw={860} mx="auto">
            <Box style={{ position: 'relative' }}>
              <Box
                visibleFrom="sm"
                style={{
                  position: 'absolute',
                  top: 24,
                  left: 'calc(100% / 8)',
                  right: 'calc(100% / 8)',
                  height: 0,
                  borderTop: '2px dashed var(--mantine-color-blue-3)',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              />

              <Box
                component="ol"
                data-hiw="steps"
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'grid',
                  gap: '2rem',
                }}
              >
                {howItWorksSteps.map((step) => (
                  <Box
                    component="li"
                    key={step.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    <Box
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
                        flexShrink: 0,
                        boxShadow: '0 0 0 6px white',
                      }}
                    >
                      <Text c="white" fw={700} size="lg">{step.n}</Text>
                    </Box>

                    <Text fw={600} mb={4}>{step.label}</Text>
                    <Text size="sm" c="dimmed" maw={180}>{step.description}</Text>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          <style>{`
            [data-hiw="steps"] { grid-template-columns: repeat(1, 1fr); }
            @media (min-width: 768px) {
              [data-hiw="steps"] { grid-template-columns: repeat(4, 1fr); }
            }
          `}</style>
        </Box>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <Box
          component="section"
          aria-labelledby="faq-heading"
          py={72}
          px="md"
          bg="gray.0"
        >
          <Center mb={48}>
            <Stack align="center" gap="xs">
              <Text size="sm" fw={600} c="blue" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
                FAQ
              </Text>
              <Title id="faq-heading" order={2} ta="center">
                Common questions
              </Title>
            </Stack>
          </Center>

          <Stack gap="sm" maw={680} mx="auto">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </Stack>
        </Box>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <Box
          py={80}
          px="md"
          style={{
            background:
              'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-cyan-6) 100%)',
          }}
        >
          <Center>
            <Stack align="center" gap="lg" style={{ maxWidth: 560, textAlign: 'center' }}>
              <Title order={2} c="white">
                Ready to get started?
              </Title>
              <Text c="rgba(255,255,255,0.85)" size="md">
                Set up your first assessment and run automated grading in minutes.
                It&apos;s absolutely free to use.
              </Text>
              <Group justify="center" gap="sm">
                {accessToken ? (
                  <Button size="lg" variant="white" color="blue" component={Link} to="/assessments">
                    Go to my assessments
                  </Button>
                ) : (
                  <>
                    <Button size="lg" variant="white" color="blue" component={Link} to="/register">
                      Create account
                    </Button>
                    <Button size="lg" variant="outline" color="white" component={Link} to="/login">
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

      </AppShell.Main>
    </AppShell>
  );
};

export default LandingPage;
