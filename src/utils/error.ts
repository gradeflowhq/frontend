import type { AxiosError } from 'axios';

type ErrorDetail = { type?: string; loc?: unknown; msg?: unknown; ctx?: Record<string, unknown> };

type ErrorPayload = {
  errors?: unknown;
  detail?: ErrorDetail[];
};

/**
 * Return `true` when the given error represents an HTTP 404 (Not Found) response.
 * Works with Axios errors as well as plain objects carrying the same shape.
 */
export const isNotFoundError = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
  return status === 404;
};

/** Map known backend error types to user-friendly messages. */
const friendlyMessage = (d: ErrorDetail): string | null => {
  if (d.type === 'union_tag_not_found' && typeof d.msg === 'string') {
    // Discriminator error — typically means a nested rule was not selected.
    const path = Array.isArray(d.loc) ? d.loc.slice(1) : [];
    const ruleIndex = path.findIndex((p) => p === 'rule' || p === 'rules');
    if (ruleIndex >= 0) {
      return 'Please select a rule type for all nested rules before saving.';
    }
  }
  return null;
};

export const getErrorMessages = (error: unknown): string[] => {
  // AxiosError with backend payload
  const axErr = error as AxiosError<ErrorPayload>;
  const data = axErr?.response?.data;

  // Case 1: { errors: string[] }
  if (data && Array.isArray(data.errors)) {
    return data.errors.filter((e: unknown) => typeof e === 'string');
  }

  // Case 2: FastAPI validation error: { detail: [{ msg: string, ... }] }
  if (data && Array.isArray(data.detail)) {
    const seen = new Set<string>();
    const messages: string[] = data.detail
      .map((d) => {
        // Try user-friendly message first
        const friendly = friendlyMessage(d);
        if (friendly) {
          if (seen.has(friendly)) return null;
          seen.add(friendly);
          return friendly;
        }
        if (d.msg && typeof d.msg === 'string') {
          if (Array.isArray(d.loc)) {
            const locStr = d.loc.slice(1).join(' > '); // skip 'body'
            return `${locStr}: ${d.msg}`;
          }
          return d.msg;
        }
        return null;
      })
      .filter((m): m is string => typeof m === 'string');
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

/**
 * Convenience function that returns a single error string (messages joined with a newline).
 */
export const getErrorMessage = (error: unknown): string =>
  getErrorMessages(error).join('\n');