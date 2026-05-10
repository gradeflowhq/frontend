import { Button, Group, Menu, Modal, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAdjustments, IconChevronDown, IconSearch, IconTrash, IconUpload } from '@tabler/icons-react';
import React, { lazy, Suspense, useMemo, useState, useEffect } from 'react';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import ErrorAlert from '@components/common/ErrorAlert';
import PageShell from '@components/common/PageShell';
import { useDeleteSubmissions, useSubmissions, useSourceData } from '@features/submissions';
import {
  ConfigureStepSkeleton,
  ListStep,
  StepIndicator,
  SubmissionsStepSkeleton,
  SubmissionsTableSkeleton,
  UploadStepSkeleton,
} from '@features/submissions/components';
import { useDocumentTitle } from '@hooks/useDocumentTitle';

import type { RawSubmission } from '@api/models';
import type { Step } from '@features/submissions/components';

const UploadStep = lazy(
  () => import('@features/submissions/components/UploadStep').then((m) => ({ default: m.UploadStep })),
);
const ConfigureStep = lazy(
  () => import('@features/submissions/components/ConfigureStep').then((m) => ({ default: m.ConfigureStep })),
);

const resolveSubmissionsStep = ({
  hasSubmissions,
  hasSource,
}: {
  hasSubmissions: boolean;
  hasSource: boolean;
}): Step => {
  if (hasSubmissions) return 'list';
  if (hasSource) return 'configure';
  return 'upload';
};

const resolveLoadingSubmissionsStep = ({
  hasSubmissions,
  hasSource,
  isLoadingSubmissions,
  isLoadingSource,
}: {
  hasSubmissions: boolean;
  hasSource: boolean;
  isLoadingSubmissions: boolean;
  isLoadingSource: boolean;
}): Step | null => {
  if (hasSubmissions) return 'list';
  if (hasSource) return 'configure';
  if (isLoadingSubmissions || isLoadingSource) return null;
  return 'upload';
};

const hasSubmissionSummary = (assessment: ReturnType<typeof useAssessmentContext>['assessment']): boolean =>
  (assessment?.summary?.submission_count ?? 0) > 0;

const SubmissionsPage: React.FC = () => {
  const { assessmentId, assessment } = useAssessmentContext();
  const [step, setStep] = useState<Step | null>(null);

  useDocumentTitle(`Submissions - ${assessment?.name ?? 'Assessment'} - GradeFlow`);

  // isConfiguring tracks whether the user has been through the upload/configure flow
  // this session — keeps steps visible until a fresh page load
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const deleteMutation = useDeleteSubmissions(assessmentId);

  const {
    data: sourceData,
    isLoading: sourceLoading,
    isError: sourceError,
  } = useSourceData(assessmentId);
  const { data, isLoading, isError, error } = useSubmissions(assessmentId);

  const items: RawSubmission[] = useMemo(() => data?.raw_submissions ?? [], [data]);
  const hasSubmissions = items.length > 0;
  const hasSource = !sourceError && !!sourceData;

  useEffect(() => {
    if (step !== null) return;
    if (isLoading || sourceLoading) return;
    // No submissions on initial load → user needs to configure
    if (!hasSubmissions) setIsConfiguring(true);
    setStep(resolveSubmissionsStep({ hasSubmissions, hasSource }));
  }, [step, isLoading, sourceLoading, hasSubmissions, hasSource]);

  // Navigate to a step; always marks the session as "actively configuring"
  const goToStep = (next: Step) => {
    setIsConfiguring(true);
    setStep(next);
  };

  // Steps are visible while configuring or not yet at list
  const showSteps = step !== 'list' || isConfiguring;

  const handleDeleteAll = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmDeleteAll(false);
        setIsConfiguring(true);
        notifications.show({ color: 'green', message: 'Submissions deleted' });
        // Deletion clears source data and config too (backend behaviour),
        // so always return to the upload step.
        setStep('upload');
      },
      onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
    });
  };

  const pageTitle = 'Submissions';

  const pageActions = hasSubmissions ? (
    <Group gap="xs" align="center">
      <TextInput
        leftSection={<IconSearch size={14} />}
        placeholder="Search by Student ID"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          // Typing in search navigates to the list view
          if (step !== 'list') setStep('list');
        }}
        size="sm"
        w={200}
      />
      <Menu position="bottom-end" withArrow>
        <Menu.Target>
          <Button size="sm" variant="default" rightSection={<IconChevronDown size={14} />}>
            Manage
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconAdjustments size={14} />}
            onClick={() => goToStep('configure')}
          >
            Reconfigure columns
          </Menu.Item>
          <Menu.Item
            leftSection={<IconUpload size={14} />}
            onClick={() => goToStep('upload')}
          >
            Re-upload CSV
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconTrash size={14} />}
            color="red"
            onClick={() => setConfirmDeleteAll(true)}
          >
            Delete all submissions
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  ) : undefined;

  if (step === null) {
    const hasOptimisticSubmissions = hasSubmissions || (isLoading && hasSubmissionSummary(assessment));
    const hasOptimisticSource = hasSource || (sourceLoading && Boolean(assessment?.source_updated_at));
    const skeletonStep = resolveLoadingSubmissionsStep({
      hasSubmissions: hasOptimisticSubmissions,
      hasSource: hasOptimisticSource,
      isLoadingSubmissions: isLoading,
      isLoadingSource: sourceLoading,
    });
    const showSkeletonSteps = skeletonStep !== 'list' || isConfiguring;

    return (
      <PageShell title={pageTitle} actions={pageActions} updatedAt={assessment?.source_updated_at}>
        <SubmissionsStepSkeleton step={skeletonStep} showSteps={showSkeletonSteps} />
      </PageShell>
    );
  }

  return (
    <PageShell title={pageTitle} actions={pageActions} updatedAt={assessment?.source_updated_at}>
      <Stack gap="md">
        {showSteps && (
          <StepIndicator
            current={step}
            hasSource={hasSource}
            hasSubmissions={hasSubmissions}
            onNavigate={goToStep}
          />
        )}

        {step === 'upload' && (
          <Suspense fallback={<UploadStepSkeleton />}>
            <UploadStep
              assessmentId={assessmentId}
              hasExistingSource={hasSource}
              onNext={() => goToStep('configure')}
            />
          </Suspense>
        )}

        {step === 'configure' && (
          <Suspense fallback={<ConfigureStepSkeleton />}>
            <ConfigureStep
              assessmentId={assessmentId}
              onSuccess={() => setStep('list')}
              onBack={() => goToStep('upload')}
            />
          </Suspense>
        )}

        {step === 'list' && (
          isLoading ? (
            <SubmissionsTableSkeleton />
          ) : (
            <ListStep
              items={items}
              isError={isError}
              error={error}
              searchQuery={searchQuery}
            />
          )
        )}
      </Stack>

      <Modal
        opened={confirmDeleteAll}
        onClose={() => setConfirmDeleteAll(false)}
        title="Delete All Submissions"
      >
        <Text mb="md">Are you sure you want to delete all submissions for this assessment?</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirmDeleteAll(false)}>Cancel</Button>
          <Button
            color="red"
            loading={deleteMutation.isPending}
            onClick={handleDeleteAll}
          >
            Delete
          </Button>
        </Group>
        {deleteMutation.isError && (
          <ErrorAlert error={deleteMutation.error} mt="sm" />
        )}
      </Modal>
    </PageShell>
  );
};

export default SubmissionsPage;
