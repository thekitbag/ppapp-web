# EigenTask Web (`ppapp-web`)

Frontend SPA for EigenTask, built with React + Vite + TypeScript.

## Stack
- React 18
- Vite 7
- TypeScript 5
- TailwindCSS 3
- TanStack React Query v5
- Axios

## Quickstart
```bash
npm install
npm run dev
```

App runs on Vite dev server (default `http://localhost:5173`) and proxies `/api` to the FastAPI backend.

## Environment
- `.env.development`
  - `VITE_API_BASE_URL=http://localhost:8000/api/v1`
  - `VITE_OAUTH_BASE_URL=http://localhost:8000`
  - `VITE_REQUIRE_LOGIN=false`
- `.env.production`
  - `VITE_API_BASE_URL=https://api.eigentask.co.uk/api/v1`
  - `VITE_OAUTH_BASE_URL=https://api.eigentask.co.uk`
  - `VITE_REQUIRE_LOGIN=true`

## Scripts
```bash
npm run dev       # local dev server
npm run build     # production build
npm run preview   # preview built output
npm run generate:api # regenerate src/types/api.d.ts from backend openapi.json
npm run test      # vitest
npm run typecheck # tsc checks
```

## App Views
Primary views are controlled in `src/App.tsx` via local state:
- Tasks
- Goals
- Archive
- Insights (reporting)
- Settings (personal access tokens for Claude Code; plaintext shown once)

Goal create/edit forms support an optional, per-user unique plan reference such as `Q4-A4`. MCP supports read and write permissions. Existing read-only tokens continue to query data; create a token with Write permission to create or update tasks and goals. Bulk creation previews changes before an approved atomic commit.

## Reporting Integration
Insights consumes backend reporting endpoints:
- `GET /api/v1/reports/summary?start_date=...&end_date=...`

Date presets in the Insights flow:
- This Week
- Last Week
- Last 30 Days

## Testing Notes
- Component tests use Vitest + Testing Library.
- See `TESTING.md` for coverage and test patterns.

## Local Integration Checklist
1. Start backend (`ppapp-fastapi`) on `localhost:8000`.
2. Start frontend with `npm run dev`.
3. Verify auth flow (`/api/v1/auth/me`).
4. Verify Insights loads summary data without API errors.
