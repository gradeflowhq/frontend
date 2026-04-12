# GradeFlow Frontend

A React + TypeScript frontend for GradeFlow — an automated assessment grading platform built for educators.

## Key Features

- **Schema-driven forms** — all request/response forms are generated from backend JSON schemas, keeping the frontend in sync with the API automatically.
- **Encryption** — student IDs can be encrypted client-side using AES-GCM (PBKDF2-derived key) before being sent to the server. The passphrase never leaves the browser.
- **Live grading preview** — rules can be tested against real submissions before saving.
- **Answer grouping** — cluster similar answers by exact match, fuzzy similarity, or semantic embedding for bulk review and adjustment. Semantic grouping runs an in-browser embedding model via WebAssembly; see [Semantic Grouping](#semantic-grouping) below.
- **Canvas LMS grade publishing** — a multi-step workflow for publishing grades directly to Canvas: course and assignment selection (with new group creation), points or percentage mode, configurable rounding, comment inclusion, and async push-progress polling.
- **Role-based collaboration** — invite collaborators by email as owner, editor, or viewer on a per-assessment basis.
- **Stale-data warnings** — a cross-cutting `SectionStatusBadge` component tracks whether questions, rules, or grading results are out of date after upstream changes, and surfaces one-click synchronisation actions.
- **Unsaved-changes guard** — a unified hook (`useUnsavedChangesGuard`) blocks React Router navigations, in-page selection changes, and browser tab close/refresh whenever there are unsaved edits.
- **Responsive master-detail layout** — side-by-side on desktop, stacked with a back button on mobile.

## Tech Stack

### Runtime

- **React** with TypeScript
- **Mantine** — component library
- **TanStack Query** — server state management
- **React Router** — routing
- **Zustand** — client-side state (auth, user settings, Canvas push config)
- **RJSF** (React JSON Schema Form) — schema-driven forms
- **CodeMirror** — code editor widgets
- **dayjs** — date formatting

### Developer Tooling

- **Vite** — bundler and dev server
- **Vitest** — unit testing
- **Orval** — generates the typed API client and model types from the backend OpenAPI spec

## Project Structure

```
frontend/src/
├── api/                  # Generated API client, models, and query keys
├── app/                  # Router configuration and context providers
├── components/           # Shared UI components (forms, layout, common)
├── features/             # Feature modules (assessments, grading, questions, rules, …)
├── hooks/                # Reusable React hooks
├── layouts/              # App shell, sidebar, and page layout components
├── lib/                  # Utility libraries (constants, file helpers, schemas)
├── pages/                # Route-level page components
├── schemas/              # Generated JSON schemas from backend
├── state/                # Zustand stores
└── utils/                # Pure utility functions (crypto, datetime, sort, error, …)
```

> `src/api/` and `src/schemas/` are **generated** — do not edit them manually. Re-run the codegen commands below after any backend change.

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- A running GradeFlow backend (required for the codegen step)

## Setup

### Install dependencies

```bash
npm install
```

### Generate API client and schemas

Make sure the backend is running, then run:

```bash
npx orval
node scripts/extract-schemas.js
```

This generates the typed API client (`src/api/`), model types, and the JSON schemas consumed by the form components (`src/schemas/`). Re-run these commands whenever the backend API changes.

### Run the development server

```bash
npm run dev
```

Add `-- --host` to expose the server on your local network (useful for testing on mobile devices):

```bash
npm run dev -- --host
```

## Using the Docker Container

The container serves the production build on port 80. The example below maps it to port 8080 on the host:

```bash
docker run -d -p 8080:80 \
  -e API_URL=https://api.example.com \
  -e CORS_PROXY_URL=https://cors-proxy.example.com \
  ghcr.io/gradeflowhq/gradeflow-frontend:latest
```

## Environment Variables

Runtime configuration is resolved in the following priority order:

1. `window.__CONFIG__` — injected at container start by `config.js` via `envsubst`
2. Vite build-time variables — `VITE_*` entries in `.env` files
3. Hardcoded development fallbacks

Note: `envsubst` leaves unset variables as empty strings, so empty strings are treated as "not set" and the next source in the priority chain is tried.

| Variable | Default | Description |
|---|---|---|
| `API_URL` | `http://localhost:8000` | Backend API base URL |
| `CORS_PROXY_URL` | `http://localhost:8080` | CORS proxy URL for Canvas API requests |

Create a `frontend/.env` file to override defaults during local development:

```env
VITE_API_URL=http://localhost:8000
VITE_CORS_PROXY_URL=http://localhost:8080
```

## Canvas Integration

Canvas API requests originate from the browser and are proxied through a Caddy-based `cors-proxy` service to avoid CORS restrictions. Set `CORS_PROXY_URL` in `frontend/.env` or via the Docker environment variable to point at your proxy instance.

Canvas credentials (base URL and personal access token) are stored only in the browser's `localStorage` and are never sent to the GradeFlow backend.

## Semantic Grouping

The Groups results page offers an optional semantic grouping mode that clusters student answers by meaning rather than exact or fuzzy text match. This feature runs an in-browser sentence-embedding model using WebAssembly (via `@xenova/transformers`).

**What happens on first use:**
The embedding model (~20–80 MB depending on the selected model) is downloaded from the Hugging Face CDN on demand and cached in the browser's Cache API. The Groups page displays a `loading-model` state during this download. Subsequent uses load from cache instantly.

**Browser compatibility:**
WebAssembly is required and is supported in all modern browsers. WebGPU acceleration is used automatically when available (Chromium-based browsers), falling back to WASM-only inference otherwise. WASM-only inference is slower but fully functional.

## Development

### Lint and auto-fix

```bash
npm run lint -- --fix
```

### Run tests

```bash
npm run test
```

### Build for production

```bash
npm run build
```

### Preview the production build locally

Serves the output of `npm run build` locally for manual testing before deployment:

```bash
npm run preview
```

## License

MIT License.
