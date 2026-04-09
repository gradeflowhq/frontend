import { Anchor, Center, Stack, Text, Title } from '@mantine/core';
import { IconAdjustments, IconChartBar, IconInbox, IconPlayerPlay } from '@tabler/icons-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { ActionOptionCard } from '@components/common/ActionOptionCard';

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
        <ActionOptionCard
          icon={<IconPlayerPlay size={14} />}
          iconColor="blue"
          title="Run grading"
          description={<>Once submissions, questions, and rules are configured, run grading from the Overview page.{' '}<Anchor component={Link} to={`/assessments/${assessmentId}/overview`} size="xs">Go to Overview →</Anchor></>}
        />
        <ActionOptionCard
          icon={<IconInbox size={14} />}
          iconColor="teal"
          title="Make sure submissions are uploaded"
          description={<>Grading requires student submissions.{' '}<Anchor component={Link} to={`/assessments/${assessmentId}/submissions`} size="xs">Go to Submissions →</Anchor></>}
        />
        <ActionOptionCard
          icon={<IconAdjustments size={14} />}
          iconColor="violet"
          title="Make sure rules are configured"
          description={<>Rules determine how each question is scored.{' '}<Anchor component={Link} to={`/assessments/${assessmentId}/rules`} size="xs">Go to Rules →</Anchor></>}
        />
      </Stack>
    </Stack>
  </Center>
);

export default NoGradingResults;