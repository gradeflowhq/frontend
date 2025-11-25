import type { ValidateRubricResponse } from '../../rules/types';

/**
 * Returns true if the validation response has no errors.
 */
export const isValidationOk = (resp: ValidateRubricResponse): boolean => {
  const errs = Array.isArray(resp?.errors) ? resp.errors : [];
  return errs.length === 0;
};