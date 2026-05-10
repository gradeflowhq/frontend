import type {
  AdjustableSubmission,
  AdjustableQuestionResult,
  GradingResponse,
  GradingPreviewResponse,
  GradeAdjustmentRequest,
  GradingDownloadRequest,
  GradingDownloadResponse,
} from '@api/models';

export type {
  AdjustableSubmission,
  AdjustableQuestionResult,
  GradingResponse,
  GradingPreviewResponse,
  GradeAdjustmentRequest,
  GradingDownloadRequest,
  GradingDownloadResponse,
};

// View model (optional alias)
export type TotalsRow = { id: string; totalPoints: number; totalMax: number };
