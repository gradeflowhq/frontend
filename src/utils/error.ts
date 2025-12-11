import type { AxiosError } from 'axios';

export const getErrorMessages = (error: unknown): string[] => {
  // AxiosError with backend payload
  const axErr = error as AxiosError<any>;
  const data = axErr?.response?.data;

  // Case 1: { errors: string[] }
  if (data && Array.isArray(data.errors)) {
    return data.errors.filter((e: unknown) => typeof e === 'string');
  }

  // Case 2: FastAPI validation error: { detail: [{ msg: string, ... }] }
  if (data && Array.isArray(data.detail)) {
    // extract loc and msg
    const messages: string[] = data.detail
      .map((d: any) => {
        if (d.msg && typeof d.msg === 'string') {
          if (Array.isArray(d.loc)) {
            const locStr = d.loc.slice(1).join(' > '); // skip 'body'
            return `${locStr}: ${d.msg}`;
          }
          return d.msg;
        }
        return null;
      })
      .filter((m: any) => typeof m === 'string');
    if (messages.length > 0) {
      return messages;
    }
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