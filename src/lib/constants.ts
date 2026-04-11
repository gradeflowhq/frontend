// ---------------------------------------------------------------------------
// Polling & async timing
// ---------------------------------------------------------------------------

/** Polling interval for job-status queries and async progress hooks (ms). */
export const POLLING_INTERVAL_MS = 2000;

/** Maximum time to wait for a preview grading job to complete (ms). */
export const PREVIEW_JOB_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// React Query cache durations
// ---------------------------------------------------------------------------

/** staleTime for grading results queries. */
export const CACHE_STALE_TIME_GRADING = 30_000;

/** staleTime for grading-job metadata queries. */
export const CACHE_STALE_TIME_JOB = 5_000;

/** staleTime for Canvas push-progress queries. */
export const CACHE_STALE_TIME_CANVAS = 5 * 60 * 1000;

/** staleTime for assessment list/item queries. */
export const CACHE_STALE_TIME_ASSESSMENTS = 2 * 60 * 1000;

/** staleTime for auth/user queries. */
export const CACHE_STALE_TIME_AUTH = 5 * 60 * 1000;

/** staleTime for Canvas assignment-level queries. */
export const CACHE_STALE_TIME_CANVAS_ASSIGNMENTS = 60 * 1000;

/** staleTime for overview dashboard queries. */
export const CACHE_STALE_TIME_OVERVIEW = 10_000;

// ---------------------------------------------------------------------------
// API configuration
// ---------------------------------------------------------------------------

/** Default request timeout for the Canvas HTTP client (ms). */
export const API_REQUEST_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Layout dimensions (px)
// ---------------------------------------------------------------------------

/** Width of the sidebar in its expanded (pinned) state. */
export const SIDEBAR_EXPANDED_WIDTH = 220;

/** Width of the sidebar in its collapsed (icon-only) state. */
export const SIDEBAR_COLLAPSED_WIDTH = 56;

// ---------------------------------------------------------------------------
// Form dimensions (px)
// ---------------------------------------------------------------------------

/** Maximum width for single-column form containers (settings pages, etc.). */
export const FORM_MAX_WIDTH = 520;
