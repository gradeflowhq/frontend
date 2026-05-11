# GradeFlow Frontend

GradeFlow Frontend is the React + TypeScript web app for GradeFlow. It gives educators
an authenticated workspace for importing submissions, configuring question sets,
building grading rules, running async grading jobs, reviewing results, making manual
adjustments, and publishing grades to Canvas.

The frontend is intentionally thin around grading semantics. GradeFlow Engine owns
question models, rule compatibility, contextual rule schemas, validation, and grading.
The backend owns persistence, authentication, staleness tracking, and async jobs. The
frontend renders those contracts, keeps local browser-only settings, and coordinates the
user workflows.

## Product Surface

- Public landing page plus a Zitadel OIDC-protected application shell.
- Assessment dashboard with creation, search, summary cards, coverage, and member links.
- Assessment workspace for overview, submissions, questions, rules, results, Canvas
  publishing, members, and settings.
- CSV and Excel submission upload (`.csv`, `.xls`, `.xlsx`, `.xlsm`, `.xlsb`) with
  worksheet selection, header/body row controls, source preview, student ID column
  selection, answer-column inference, and pre-grade point-column mapping.
- Optional client-side student ID encryption using PBKDF2-derived AES-GCM keys. The
  passphrase stays in the browser and can be stored locally per assessment.
- Question-set management with inference from submissions, direct editing, examples
  from parsed submissions, YAML upload/export, adapter import, drift detection, sync,
  and staleness acknowledgement.
- Schema-driven rule editing. Compatible rule lists, initial values, nested rule
  contexts, descriptions, suggestions, and JSON Schemas come from the backend/engine.
- Rule workflows for single-question and global rules, including nested rule slots,
  custom code editors, upload/import/export, validation warnings, sync, and repair.
- Async grading jobs with progress estimates, cancellation, stale-result banners, and
  preview runs before saving changes.
- Results views for statistics, students, per-student details, question grouping, manual
  adjustments, bulk adjustments, and CSV/JSON/YAML downloads.
- Answer grouping by answer, feedback, exact/fuzzy text similarity, or optional semantic
  embeddings in the browser.
- Canvas publishing from the browser: course and assignment selection, assignment group
  creation, points/percentage modes, rounding, optional comments, preview, submit, and
  Canvas progress polling.
- Assessment collaboration with owner/editor/viewer roles.
- User settings for account links, appearance, and Canvas integration credentials.

## Tech Stack

### Runtime

- React 19 with TypeScript
- Vite 7
- Mantine 9, Mantine Charts, Mantine Dropzone, Mantine Notifications
- React Router 7
- TanStack Query 5
- Zustand 5
- RJSF 6 with AJV 8 for JSON Schema forms
- Axios with OIDC bearer-token and silent-renew interceptors
- oidc-client-ts and react-oidc-context for Zitadel login
- mantine-datatable for tabular views
- CodeMirror for code fields
- PapaParse and `@e965/xlsx` for browser-side upload parsing
- dayjs for date/time formatting
- `@xenova/transformers` for optional in-browser semantic grouping

### Tooling

- Orval generates the typed GradeFlow API client and model types from backend OpenAPI.
- `scripts/extract-schemas.js` extracts the small static schema set used directly by
  form components.
- Vitest + Testing Library run frontend tests in jsdom.
- ESLint 9 checks TypeScript, React Hooks, React Refresh, and import ordering.

## App Map

Routes are defined in `src/app/App.tsx`, `src/app/routes/paths.ts`, and the route files
under `src/pages`.

```text
/                         Public landing page
/auth/callback            OIDC redirect callback
/settings                 User, Canvas integration, and appearance settings
/assessments              Assessment list
/assessments/:id/overview Setup timeline and grading launcher
/assessments/:id/submissions
/assessments/:id/questions
/assessments/:id/rules
/assessments/:id/results/statistics
/assessments/:id/results/students
/assessments/:id/results/students/:studentId
/assessments/:id/results/groups
/assessments/:id/publish  Canvas publishing
/assessments/:id/members
/assessments/:id/settings
```

Route pages are lazy-loaded with skeleton fallbacks. `src/app/routes/prefetch.ts` warms
registered route chunks during idle time after the protected app layout mounts.

## Project Structure

```text
frontend/
├── Dockerfile                 # Production image: Vite build served by nginx
├── config.js.template         # Runtime config injected by Docker entrypoint
├── entrypoint.sh              # envsubst -> /usr/share/nginx/html/config.js
├── nginx.conf
├── orval.config.ts            # OpenAPI -> typed API client
├── scripts/
│   └── extract-schemas.js     # OpenAPI -> src/schemas/*.json
└── src/
    ├── api/                   # Generated client/models plus axios/canvas/query helpers
    ├── app/                   # Router, auth guards, contexts, route utilities
    ├── auth/                  # Zitadel/OIDC client setup
    ├── components/            # Shared common and schema-form components
    ├── features/              # Assessments, submissions, questions, rules, grading, Canvas
    ├── hooks/                 # Reusable UI/data hooks
    ├── layouts/               # App shell, assessment shell, sidebar nav
    ├── lib/                   # Constants, storage keys, file/import/export helpers
    ├── pages/                 # Route-level pages
    ├── schemas/               # Generated static JSON schemas for selected forms
    ├── state/                 # Zustand user/browser settings
    └── utils/                 # Crypto, dates, errors, formatting, sorting, notifications
```

Generated files:

- `src/api/gradeflowClient.ts`
- `src/api/models/**`
- `src/schemas/questions.json`
- `src/schemas/requests.json`

Do not edit generated files manually. Regenerate them after backend OpenAPI changes.

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0` (required by the current Vite toolchain)
- npm 10 or the npm version bundled with your supported Node release
- A running GradeFlow backend for local app use and code generation
- Zitadel application settings that allow `http://localhost:5173/auth/callback` during
  local development
- Optional: a CORS proxy for Canvas browser API calls

## Setup

Install dependencies:

```bash
cd frontend
npm install
```

Create `frontend/.env` for local development:

```env
VITE_API_URL=http://localhost:8000
VITE_CORS_PROXY_URL=http://localhost:8080
VITE_ZITADEL_AUTHORITY=https://your-zitadel.example.com
VITE_ZITADEL_CLIENT_ID=your-spa-client-id
VITE_ZITADEL_ORG_DOMAIN=
```

Run the dev server:

```bash
npm run dev
```

Expose it on your local network, for example when testing on a mobile browser:

```bash
npm run dev -- --host
```

## Code Generation

Start the backend first, then run:

```bash
cd frontend
npx orval
node scripts/extract-schemas.js
```

Both commands read `OPENAPI_URL` when set. Otherwise they use the local backend:

- Orval: `http://localhost:8000/openapi.json`
- Schema extractor: `http://127.0.0.1:8000/openapi.json`

The extractor writes only the static schemas rendered directly by frontend forms:
assessment create/update, question-set/rubric import/export/upload requests, grading
preview config, grading download config, and question model schemas.

Rule schemas are not generated into `src/schemas`. Rule forms call backend endpoints at
runtime because the valid shape depends on rule context, selected question, and nested
path.

## Environment Variables

Runtime configuration is resolved in this order:

1. `window.__CONFIG__`, injected into `config.js` by the Docker entrypoint
2. Vite build-time values from `VITE_*` variables
3. Development fallbacks in `src/env.ts`

Empty strings are treated as unset so Docker `envsubst` placeholders do not mask
fallbacks.

| Docker/runtime variable | Local Vite variable | Default | Description |
|---|---|---|---|
| `API_URL` | `VITE_API_URL` | `http://localhost:8000` | GradeFlow backend API base URL. |
| `CORS_PROXY_URL` | `VITE_CORS_PROXY_URL` | `http://localhost:8080` | Browser-to-Canvas CORS proxy base URL. |
| `ZITADEL_AUTHORITY` | `VITE_ZITADEL_AUTHORITY` | `http://localhost:8080` | Zitadel issuer/authority URL used by OIDC. |
| `ZITADEL_CLIENT_ID` | `VITE_ZITADEL_CLIENT_ID` | empty | Zitadel SPA client ID. |
| `ZITADEL_ORG_DOMAIN` | `VITE_ZITADEL_ORG_DOMAIN` | empty | Optional org domain. Adds Zitadel org query/scope so users can log in with username only. |

## Authentication

The app uses `react-oidc-context` and `oidc-client-ts`. Unauthenticated users are
redirected from protected routes into Zitadel. The callback route at `/auth/callback`
returns users to `/assessments`.

Axios is configured globally in `src/api/axiosSetup.ts`:

- attaches the current non-expired access token as `Authorization: Bearer ...`;
- coalesces concurrent `401` responses into a single silent-renew attempt;
- retries the original request with the renewed token;
- clears local auth state and redirects to `/` if silent renewal fails.

## Backend And Engine Contracts

The backend wraps the engine and exposes API-friendly resources. The frontend relies on
that split:

- Backend OpenAPI generates typed client functions and model types.
- Backend `SectionStatus` responses drive stale-data warnings for submissions,
  questions, rules, and grading results.
- Engine question schemas power the question editor.
- Engine contextual rule schemas power the rule editor.
- Backend async jobs power full grading and preview grading progress.

Important backend/engine behaviors surfaced in the UI:

- Source changes can make question sets stale.
- Question-set changes can make rubrics stale.
- Rubric changes can make grading results stale.
- Question-set drift can add missing questions, remove extras, and expand choice
  options.
- Rubric sync/repair can remove stale or invalid rule references.

## Rule Editing

Rule editing is presentation-only in frontend code:

- `GET /assessments/{id}/rules/list` supplies compatible rule labels/types for global,
  question, value, and nested contexts.
- `GET /assessments/{id}/rules/schema` supplies the selected rule JSON Schema plus
  `initial_value`.
- Engine metadata under `x-gradeflow` drives custom rendering hints such as `code`,
  `string-list`, `rule`, `rule-list`, and answer suggestions with counts.
- The frontend merges context-owned initial values when a selected question or nested
  context changes, but does not duplicate rule compatibility or validation logic.

## Submissions And Encryption

Submissions are uploaded as source data first, then converted to raw submissions using a
saved import config.

The upload workflow:

1. Parse CSV or Excel in the browser.
2. Choose worksheet when a workbook has multiple populated sheets.
3. Pick header row, body start row, and optional body end row.
4. Select the student ID column.
5. Optionally encrypt student IDs before sending source data to the backend.
6. Configure answer columns and optional pre-grade point columns.

Encrypted values use this envelope:

```text
enc:v1:<session_salt_b64>:<iv_b64>:<cipher_b64>
```

The same passphrase is used to decrypt IDs in tables, detail pages, group views, and CSV
downloads when available. If no passphrase is present, encrypted IDs remain masked or are
shown in their encrypted form depending on context.

## Results And Review

The results area includes:

- Statistics cards and charts for score distributions.
- Student result tables with filters, search, downloads, and decrypted IDs when possible.
- Per-student detail pages with question-level answers, feedback, rule descriptions,
  previous/next navigation, keyboard navigation, and manual adjustments.
- Group view for question-centered review and bulk adjustment.

Grouping modes can cluster by answer or feedback. Text clustering supports exact/fuzzy
thresholds with normalization options. Semantic grouping uses `@xenova/transformers` in
the browser and downloads the embedding model on first use.

## Canvas Integration

Canvas credentials live only in browser local storage:

- `canvas_base_url`
- `canvas_token`

Canvas API requests go from the browser through the configured CORS proxy. The frontend
sets `Authorization: Bearer <token>` and an `X-Host` header for the proxy target host.

The publishing workflow can:

- test Canvas credentials from user settings;
- list courses, students, assignments, and assignment groups;
- create assignments and assignment groups;
- publish points or percentage grades;
- include comments;
- poll Canvas progress URLs until the bulk grade update finishes.

## Docker

The production image builds the Vite app and serves it with nginx on port 80. Runtime
configuration is injected into `/config.js` at container startup.

```bash
docker run -d -p 8080:80 \
  -e API_URL=https://api.example.com \
  -e CORS_PROXY_URL=https://cors-proxy.example.com \
  -e ZITADEL_AUTHORITY=https://zitadel.example.com \
  -e ZITADEL_CLIENT_ID=your-spa-client-id \
  -e ZITADEL_ORG_DOMAIN=example.org \
  ghcr.io/gradeflowhq/gradeflow-frontend:latest
```

## Development Commands

```bash
npm run lint
npm run lint -- --fix
npm run test
npm run test:watch
npm run test:coverage
npm run build
npm run preview
```

`npm run build` runs `tsc -b` before bundling. The Dockerfile runs `npx vite build`
directly because type-checking is expected to happen earlier in CI.

## License

MIT License.
