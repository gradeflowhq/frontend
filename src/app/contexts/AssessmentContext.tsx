import { createContext, useContext } from 'react';

import type { AssessmentResponse } from '@api/models';

interface AssessmentContextValue {
  assessment: AssessmentResponse | undefined;
  assessmentId: string;
}

export const AssessmentContext = createContext<AssessmentContextValue>({
  assessment: undefined,
  assessmentId: '',
});

AssessmentContext.displayName = 'AssessmentContext';

export const useAssessmentContext = () => useContext(AssessmentContext);
