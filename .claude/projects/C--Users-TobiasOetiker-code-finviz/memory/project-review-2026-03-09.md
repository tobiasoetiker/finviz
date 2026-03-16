# Project Review: Finviz Financial Dashboard

**Date:** 2026-03-09
**Stack:** Next.js 16 + Python Cloud Function + BigQuery + GCS
**Purpose:** Private financial dashboard ingesting Finviz Elite data, visualizing market momentum, sector performance, and Bollinger Band signals.

---

## 10-Dimension Assessment

| # | Dimension | Rating | Notes |
|---|-----------|--------|-------|
| 1 | **Architecture & Design** | 8/10 | Clean separation: Python ingestion → BigQuery → Next.js SSR → Client components. Parallel data fetching in `page.tsx`, pre-aggregated tables for performance. Server/client component boundary is well-drawn. Minor: unused `cachedData` in-memory variable in `finviz.ts:9`. |
| 2 | **Code Quality** | 7/10 | TypeScript strict mode, Zod validation, consistent patterns. Deductions: `(item as any).rsiEqual` cast in `DashboardContent.tsx:63`, `as any[]` casts on BigQuery results in `finviz.ts:281,451`, leftover `console.log("DEBUG QUERY EXECUTION"...)` at `finviz.ts:164`, and case-mapping workarounds (`changeEqual ?? changeequal`) suggest fragile BigQuery ↔ TS coupling. |
| 3 | **Security** | 6/10 | Parameterized queries (good), Zod env validation (good), `.env*` and `env.yaml` gitignored (good). Deductions: `cloudbuild.yaml` had hardcoded API key in git history (fixed now but key needs rotation), Cloud Function endpoint is `--allow-unauthenticated` (anyone can trigger ingestion), no auth on the dashboard itself. |
| 4 | **Error Handling** | 7/10 | Error boundary with retry, Tenacity retries in Python with backoff, `SAFE_CAST`/`COALESCE`/`NULLIF` in SQL, graceful fallback to full rebuild on aggregation failure. Deductions: Bollinger/snapshot queries silently return empty arrays on error (could hide real issues), no alerting when pipeline fails. |
| 5 | **Performance** | 8/10 | Aggregation done in BigQuery (not client-side), ISR caching with 1hr revalidation, parallel `Promise.all` for data fetching, `useMemo` in chart components. Pre-computed industry/sector tables avoid expensive runtime aggregation. Deductions: Bollinger query scans full history table on every request (window functions over all rows). |
| 6 | **Type Safety** | 6/10 | Good type definitions in `types/index.ts`, Zod for env validation. Deductions: heavy use of `as any` and `as any[]` on BigQuery results bypasses type checking at the most critical boundary (data layer). The `changeEqual ?? changeequal` pattern is a symptom — BigQuery returns lowercase column names and the code patches it at runtime instead of having a typed mapping layer. |
| 7 | **Testing** | 2/10 | No automated tests. Only manual verification scripts. The Python pipeline handles financial data and has complex aggregation logic that would benefit greatly from unit tests. The Bollinger band calculations are non-trivial math that should be verified. Acceptable for a private project but risky for correctness. |
| 8 | **DevOps & Deployment** | 7/10 | Cloud Build pipeline, Cloud Functions for serverless backend, proper `.gitignore`. Deductions: no staging environment, no automated linting/build check in CI, the pipeline is a single step (deploy) with no build verification. `dev` script uses Windows-only `set NODE_OPTIONS` syntax. |
| 9 | **Data Integrity** | 7/10 | Atomic pipeline processing (all-or-nothing), `is_current` flag pattern for snapshot management, verification step after aggregation (row count check), fallback rebuild on failure. Deductions: no schema validation on BigQuery results, `autodetect=True` on BigQuery load could drift schema silently, no data freshness monitoring in the UI. |
| 10 | **Maintainability** | 7/10 | Well-organized file structure, clear naming, single responsibility per component. Deductions: `finviz.ts` is doing a lot (477 lines, 5 exports with complex SQL), the SQL strings are large and untestable inline templates, duplicate aggregation logic between `main.py` (lines 82-99 vs 128-157) and `finviz.ts`. |

---

## Overall: 6.5/10 — Solid for a private project

---

## Top 3 Actionable Improvements

1. **Rotate the Finviz API key** — it's been in git history. Generate a new one, store it in GCP Secret Manager.

2. **Add authentication to the Cloud Function** — remove `--allow-unauthenticated` from `cloudbuild.yaml` and use IAM or a Cloud Scheduler service account to trigger it instead. Right now anyone with the URL can trigger (and re-trigger) the pipeline.

3. **Type the BigQuery boundary** — replace `as any[]` casts with a thin mapping function that validates/transforms BigQuery rows into TypeScript types. This would eliminate the `changeEqual ?? changeequal` workarounds and catch schema drift early.

---

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | SSR entry point, parallel data fetching |
| `components/DashboardContent.tsx` | Main dashboard container, client-side filtering |
| `lib/finviz.ts` | All BigQuery data functions, cached with ISR |
| `lib/bigquery.ts` | BigQuery client initialization |
| `lib/config.ts` | Env validation with Zod |
| `types/index.ts` | All TypeScript interfaces |
| `backend/main.py` | Python Cloud Function, data pipeline |
| `components/MomentumMatrix.tsx` | Scatter chart with zoom/pan |
| `components/PerformanceTable.tsx` | Sortable metrics table |
| `components/BollingerBacktest.tsx` | Signal performance tracking |
| `cloudbuild.yaml` | GCP Cloud Build pipeline |
