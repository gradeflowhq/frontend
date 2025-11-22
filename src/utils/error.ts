import type { AxiosError } from 'axios';

export const getErrorMessages = (error: unknown): string[] => {
  // AxiosError with backend payload
  const axErr = error as AxiosError<any>;
  const data = axErr?.response?.data;

  // Case 1: { errors: string[] }
  if (data && Array.isArray(data.errors)) {
    return data.errors.filter((e) => typeof e === 'string');
  }

  // Case 2: FastAPI validation error: { detail: [{ msg: string, ... }] }
  if (data && Array.isArray(data.detail)) {
    const msgs = data.detail
      .map((d: any) => d?.msg)
      .filter((m: any) => typeof m === 'string');
    if (msgs.length) return msgs;
  }

  // Case 3: AxiosError message
  if (axErr?.message) {
    return [axErr.message];
  }

  // Case 4: Generic Error instance
  if (error instanceof Error && error.message) {
    return [error.message];
  }

  // Fallback
  return ['An unexpected error occurred'];
};