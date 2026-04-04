import { Skeleton, Stack } from '@mantine/core';
import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useSubmissions, useSourceData } from '@features/submissions';

import { ConfigureStep } from './submissions/ConfigureStep';
import { ListStep } from './submissions/ListStep';
import { StepIndicator } from './submissions/StepIndicator';
import { UploadStep } from './submissions/UploadStep';

import type { Step } from './submissions/StepIndicator';
import type { RawSubmission } from '@api/models';

const SubmissionsTabPage: React.FC = () => {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>();
  const [step, setStep] = useState<Step | null>(null);

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
    if (hasSubmissions) { setStep('list'); return; }
    if (hasSource) { setStep('configure'); return; }
    setStep('upload');
  }, [step, isLoading, sourceLoading, hasSubmissions, hasSource]);

  if (step === null) {
    return (
      <Stack gap="sm">
        <Skeleton height={40} mb="md" />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <StepIndicator
        current={step}
        hasSource={hasSource}
        hasSubmissions={hasSubmissions}
        onNavigate={setStep}
      />

      {step === 'upload' && (
        <UploadStep
          assessmentId={assessmentId}
          hasExistingSource={hasSource}
          onNext={() => setStep('configure')}
        />
      )}

      {step === 'configure' && (
        <ConfigureStep
          assessmentId={assessmentId}
          onSuccess={() => setStep('list')}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'list' && (
        <ListStep
          assessmentId={assessmentId}
          items={items}
          isLoading={isLoading}
          isError={isError}
          error={error}
          hasSubmissions={hasSubmissions}
          onDeleted={() => setStep(sourceData ? 'configure' : 'upload')}
        />
      )}
    </Stack>
  );
};

export default SubmissionsTabPage;
