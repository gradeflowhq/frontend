import { Alert, Badge, Box, Button, Card, Divider, Group, SimpleGrid, Text } from '@mantine/core';
import { IconListCheck, IconSend } from '@tabler/icons-react';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { PATHS } from '@app/routes/paths';
import SectionLabel from '@components/common/SectionLabel';
import { buildTotals, computeStats } from '@features/grading/helpers';

import StatCard from './StatCard';

import type { AdjustableSubmission, GradingResponse } from '@api/models';

interface Props {
  assessmentId: string;
  hasGrading: boolean;
  hasGradingJob: boolean;
  submissions: AdjustableSubmission[];
  gradingData: GradingResponse | null | undefined;
}

const GradingResultsCard: React.FC<Props> = ({
  assessmentId,
  hasGrading,
  hasGradingJob,
  submissions,
  gradingData,
}) => {
  const navigate = useNavigate();

  const quickStats = useMemo(() => {
    if (!hasGrading || submissions.length === 0) return null;
    const totals = buildTotals(submissions);
    const pcts = totals.map((t) => (t.totalMax > 0 ? (t.totalPoints / t.totalMax) * 100 : 0));
    return computeStats(pcts);
  }, [hasGrading, submissions]);

  if (!hasGrading && !hasGradingJob) return null;

  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between" align="center" mb="xs">
        <Box>
          <SectionLabel c="dimmed">
            Grading Results
          </SectionLabel>
          <Group gap="xs" mt={2} align="center">
            <Text size="sm">
              {hasGrading ? `${submissions.length} students graded` : 'Job queued'}
            </Text>
            {gradingData?.status?.is_stale && (
              <Badge size="xs" variant="light" color="yellow">
                Stale
              </Badge>
            )}
          </Group>
        </Box>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconListCheck size={13} />}
            onClick={() => void navigate(PATHS.assessment(assessmentId).results.statistics)}
          >
            View Results
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconSend size={13} />}
            onClick={() => void navigate(PATHS.assessment(assessmentId).publish)}
          >
            Publish
          </Button>
        </Group>
      </Group>

      {gradingData?.status?.is_stale && (
        <Alert color="yellow" variant="light" mb="sm" p="xs">
          <Text size="xs">
            Results may be out of date — submissions or rules have changed since the last
            grading run.
          </Text>
        </Alert>
      )}

      {quickStats && quickStats.count > 0 && (
        <>
          <Divider my="md" />
          <Text
            size="xs"
            fw={600}
            tt="uppercase"
            c="dimmed"
            mb="sm"
            style={{ letterSpacing: '0.05em' }}
          >
            Score Distribution
          </Text>
          <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="xs">
            <StatCard
              title="Mean"
              value={`${quickStats.mean.toFixed(1)}%`}
              sub={`± ${quickStats.stdev.toFixed(1)}%`}
            />
            <StatCard title="Median"  value={`${quickStats.q2.toFixed(1)}%`} />
            <StatCard title="Std Dev" value={quickStats.stdev.toFixed(1)} />
            <StatCard title="Min"     value={`${quickStats.min.toFixed(1)}%`} />
            <StatCard title="Max"     value={`${quickStats.max.toFixed(1)}%`} />
          </SimpleGrid>
        </>
      )}
    </Card>
  );
};

export default GradingResultsCard;
