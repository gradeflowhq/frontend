import { Alert, Button, Group, Menu, Modal, Skeleton, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAdjustments, IconChevronDown, IconSearch, IconTrash, IconUpload } from '@tabler/icons-react';
import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useAssessmentContext } from '@app/contexts/AssessmentContext';
import PageShell from '@components/common/PageShell';
import { useDeleteSubmissions, useSubmissions, useSourceData } from '@features/submissions';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { getErrorMessage } from '@utils/error';

import { ConfigureStep } from './submissions/ConfigureStep';
import { ListStep } from './submissions/ListStep';
import { StepIndicator } from './submissions/StepIndicator';
import { UploadStep } from './submissions/UploadStep';

import type { Step } from './submissions/StepIndicator';
import type { RawSubmission } from '@api/models';

const SubmissionsPage: React.FC = () => {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();
  const [step, setStep] = useState<Step | null>(null);
  const { assessment } = useAssessmentContext();

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
    if (hasSubmissions) { setStep('list'); return; }
    if (hasSource) { setStep('configure'); return; }
    setStep('upload');
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
        setStep(sourceData ? 'configure' : 'upload');
      },
      onError: () => notifications.show({ color: 'red', message: 'Delete failed' }),
    });
  };

  if (step === null) {
    return (
      <PageShell title="Submissions">
        <Skeleton height={40} mb="md" />
      </PageShell>
    );
  }

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

  return (
    <PageShell title={pageTitle} actions={pageActions}>
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
          <UploadStep
            assessmentId={assessmentId}
            hasExistingSource={hasSource}
            onNext={() => goToStep('configure')}
          />
        )}

        {step === 'configure' && (
          <ConfigureStep
            assessmentId={assessmentId}
            onSuccess={() => setStep('list')}
            onBack={() => goToStep('upload')}
          />
        )}

        {step === 'list' && (
          <ListStep
            items={items}
            isLoading={isLoading}
            isError={isError}
            error={error}
            searchQuery={searchQuery}
          />
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
          <Alert color="red" mt="sm">{getErrorMessage(deleteMutation.error)}</Alert>
        )}
      </Modal>
    </PageShell>
  );
};

export default SubmissionsPage;
