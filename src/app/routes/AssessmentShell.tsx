import React from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { AssessmentContext } from '@app/AssessmentContext';
import { useAssessment } from '@features/assessments/hooks';
import { AssessmentPassphraseProvider } from '@features/encryption/AssessmentPassphraseProvider';

const AssessmentShellInner: React.FC<{ assessmentId: string }> = ({ assessmentId }) => {
  const { data: assessment, isLoading } = useAssessment(assessmentId, !!assessmentId);

  return (
    <AssessmentContext.Provider value={{ assessment, assessmentId, isLoading }}>
      <AssessmentPassphraseProvider assessmentId={assessmentId}>
        <Outlet />
      </AssessmentPassphraseProvider>
    </AssessmentContext.Provider>
  );
};

const AssessmentShell: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  if (!assessmentId) return null;
  return <AssessmentShellInner assessmentId={assessmentId} />;
};

export default AssessmentShell;
