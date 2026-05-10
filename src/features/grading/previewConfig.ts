import requestsSchema from '@schemas/requests.json';

import type { GradingLimitConfigSelection } from '@api/models';

const limitSchema = requestsSchema.GradingLimitConfig.properties.limit;
const selectionSchema = requestsSchema.GradingLimitConfig.properties.selection;
const selectionValues = selectionSchema.enum as GradingLimitConfigSelection[];

export const GRADING_PREVIEW_LIMIT_STEP = 5;

export const DEFAULT_GRADING_PREVIEW_LIMIT = limitSchema.default;
export const DEFAULT_GRADING_PREVIEW_SELECTION = (
  selectionSchema.default as GradingLimitConfigSelection
);

export const GRADING_PREVIEW_LIMIT_OPTIONS = Array.from(
  { length: Math.floor(limitSchema.maximum / GRADING_PREVIEW_LIMIT_STEP) },
  (_, index) => GRADING_PREVIEW_LIMIT_STEP * (index + 1),
)
  .filter((value) => value >= limitSchema.minimum && value <= limitSchema.maximum)
  .map((value) => ({ value: String(value), label: String(value) }));

export const GRADING_PREVIEW_SELECTION_OPTIONS = selectionValues.map((value) => ({
  value,
  label: value.replace('_', ' '),
}));
