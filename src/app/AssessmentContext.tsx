import { createContext, useContext } from 'react';

import type { AssessmentResponse } from '@api/models';

interface AssessmentContextValue {
  assessment: AssessmentResponse | undefined;
  assessmentId: string;
  isLoading: boolean;
}

export const AssessmentContext = createContext<AssessmentContextValue>({
  assessment: undefined,
  assessmentId: '',
  isLoading: false,
});

export const useAssessmentContext = () => useContext(AssessmentContext);
