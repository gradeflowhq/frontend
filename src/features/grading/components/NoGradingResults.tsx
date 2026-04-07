import {
  Anchor,
  Box,
  Card,
  Center,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAdjustments, IconChartBar, IconInbox, IconPlayerPlay } from '@tabler/icons-react';
import React from 'react';
import { Link } from 'react-router-dom';

interface NoGradingResultsProps {
  assessmentId: string;
}

const NoGradingResults: React.FC<NoGradingResultsProps> = ({ assessmentId }) => (
  <Center py="xl">
    <Stack align="center" gap="md" maw={480} mx="auto">
      <IconChartBar size={40} opacity={0.3} />

      <Title order={4} ta="center">No grading results yet</Title>

      <Text c="dimmed" size="sm" ta="center">
        Grading has not been run for this assessment yet. Complete the setup
        steps below and then run grading to see results here.
      </Text>

      <Stack gap="xs" w="100%">
        <Card withBorder p="sm" radius="md">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <ThemeIcon variant="light" color="blue" size="md" radius="xl" style={{ flexShrink: 0 }}>
              <IconPlayerPlay size={14} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={500}>Run grading</Text>
              <Text size="xs" c="dimmed">
                Once submissions, questions, and rules are configured, run
                grading from the Overview page.{' '}
                <Anchor
                  component={Link}
                  to={`/assessments/${assessmentId}/overview`}
                  size="xs"
                >
                  Go to Overview →
                </Anchor>
              </Text>
            </Box>
          </Group>
        </Card>

        <Card withBorder p="sm" radius="md">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <ThemeIcon variant="light" color="teal" size="md" radius="xl" style={{ flexShrink: 0 }}>
              <IconInbox size={14} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={500}>Make sure submissions are uploaded</Text>
              <Text size="xs" c="dimmed">
                Grading requires student submissions.{' '}
                <Anchor
                  component={Link}
                  to={`/assessments/${assessmentId}/submissions`}
                  size="xs"
                >
                  Go to Submissions →
                </Anchor>
              </Text>
            </Box>
          </Group>
        </Card>

        <Card withBorder p="sm" radius="md">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <ThemeIcon variant="light" color="violet" size="md" radius="xl" style={{ flexShrink: 0 }}>
              <IconAdjustments size={14} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={500}>Make sure rules are configured</Text>
              <Text size="xs" c="dimmed">
                Rules determine how each question is scored.{' '}
                <Anchor
                  component={Link}
                  to={`/assessments/${assessmentId}/rules`}
                  size="xs"
                >
                  Go to Rules →
                </Anchor>
          </Text>
            </Box>
          </Group>
        </Card>
      </Stack>
    </Stack>
  </Center>
);

export default NoGradingResults;