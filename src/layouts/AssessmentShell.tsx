import React, { useMemo } from 'react';
import { Outlet, useParams } from 'react-router-dom';

import { AssessmentContext } from '@app/contexts/AssessmentContext';
import { useAssessment } from '@features/assessments/api';
import { AssessmentPassphraseProvider } from '@features/encryption/AssessmentPassphraseProvider';

const AssessmentShellInner: React.FC<{ assessmentId: string }> = ({ assessmentId }) => {
  const { data: assessment } = useAssessment(assessmentId, !!assessmentId);

  const ctxValue = useMemo(
    () => ({ assessment, assessmentId }),
    [assessment, assessmentId],
  );

  return (
    <AssessmentContext.Provider value={ctxValue}>
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
