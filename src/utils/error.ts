import type { AxiosError } from 'axios';

type ErrorDetail = { type?: string; loc?: unknown; msg?: unknown; ctx?: Record<string, unknown> };

type ErrorPayload = {
  code?: unknown;
  message?: unknown;
  errors?: unknown;
  detail?: unknown;
};

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  request?: unknown;
  response?: {
    status?: number;
    data?: ErrorPayload;
  };
};

export type ApiErrorKind =
  | 'server_down'
  | 'internal_server_error'
  | 'specific'
  | 'unexpected';

export type ApiErrorInfo = {
  kind: ApiErrorKind;
  title: string;
  message: string;
  messages: string[];
  status?: number;
  code?: string;
};

const SERVER_DOWN_MESSAGE =
  'Cannot reach the GradeFlow API. Check that the backend is running and try again.';

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

const isErrorDetail = (value: unknown): value is ErrorDetail =>
  typeof value === 'object' && value !== null;

const compactMessages = (messages: (string | null | undefined)[]): string[] =>
  messages
    .map((message) => message?.trim())
    .filter((message): message is string => Boolean(message));

const getBackendMessages = (data: ErrorPayload | undefined): string[] => {
  if (!data) return [];

  // Case 1: { errors: string[] }
  if (Array.isArray(data.errors)) {
    const messages = compactMessages(
      data.errors.map((e: unknown) => (typeof e === 'string' ? e : null)),
    );
    if (messages.length > 0) return messages;
  }

  // Case 2: FastAPI validation error: { detail: [{ msg: string, ... }] }
  if (Array.isArray(data.detail)) {
    const seen = new Set<string>();
    const messages = compactMessages(
      data.detail.map((d) => {
        if (!isErrorDetail(d)) return null;

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
      }),
    );
    if (messages.length > 0) return messages;
  }

  // Case 3: structured backend summary: { message: string }
  if (typeof data.message === 'string' && data.message.trim()) {
    return [data.message.trim()];
  }

  return [];
};

const getBackendCode = (data: ErrorPayload | undefined): string | undefined =>
  typeof data?.code === 'string' && data.code.trim() ? data.code.trim() : undefined;

const getResponseTitle = (status: number | undefined, code: string | undefined): string => {
  if (status === 500) return 'Internal server error';
  if (status === 401) return 'Authentication required';
  if (status === 403) return 'Permission denied';
  if (status === 404) return 'Not found';
  if (code === 'VALIDATION_ERROR') return 'Validation error';
  return 'Request failed';
};

export const getErrorInfo = (error: unknown): ApiErrorInfo => {
  const axErr = error as AxiosError<ErrorPayload>;
  const err = error as ErrorLike | undefined;
  const response = err?.response ?? axErr?.response;

  if (response) {
    const status = response.status;
    const data = response.data;
    const code = getBackendCode(data);
    const messages = getBackendMessages(data);
    const fallback =
      status === 500
        ? 'Internal server error.'
        : `Request failed${status ? ` (${status})` : ''}.`;
    const finalMessages = messages.length > 0 ? messages : [fallback];
    return {
      kind: status === 500 ? 'internal_server_error' : 'specific',
      title: getResponseTitle(status, code),
      message: finalMessages.join('\n'),
      messages: finalMessages,
      status,
      code,
    };
  }

  const message = typeof err?.message === 'string' ? err.message : '';
  const code = typeof err?.code === 'string' ? err.code : undefined;
  const looksLikeNetworkError =
    code === 'ERR_NETWORK' ||
    message === 'Network Error' ||
    Boolean(err?.request && !err.response);

  if (looksLikeNetworkError) {
    return {
      kind: 'server_down',
      title: 'Backend unavailable',
      message: SERVER_DOWN_MESSAGE,
      messages: [SERVER_DOWN_MESSAGE],
      code,
    };
  }

  if (error instanceof Error && error.message) {
    return {
      kind: 'unexpected',
      title: 'Unexpected error',
      message: error.message,
      messages: [error.message],
    };
  }

  return {
    kind: 'unexpected',
    title: 'Unexpected error',
    message: 'An unexpected error occurred',
    messages: ['An unexpected error occurred'],
  };
};

export const getErrorMessages = (error: unknown): string[] => {
  return getErrorInfo(error).messages;
};

/**
 * Convenience function that returns a single error string (messages joined with a newline).
 */
export const getErrorMessage = (error: unknown): string =>
  getErrorInfo(error).message;
