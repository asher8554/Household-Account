# Annual Category Trend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add category-level annual spending changes to the existing annual spending trend page.

**Architecture:** Extract annual trend aggregation into `src/features/dashboard/annual-trend-calculations.ts`. Keep `AnnualTrendScreen.tsx` responsible for rendering only. Use Recharts stacked bars for category changes and a compact summary list for category-level insights.

**Tech Stack:** React, TypeScript, Recharts, Playwright test runner.

---

### Task 1: Category Trend Aggregation

**Files:**
- Create: `tests/annual-trend-calculations.spec.ts`
- Create: `src/features/dashboard/annual-trend-calculations.ts`
- Modify: `src/features/dashboard/AnnualTrendScreen.tsx`

- [x] **Step 1: Write the failing test**

Create `tests/annual-trend-calculations.spec.ts` with tests for `buildAnnualCategoryTrends`.

- [x] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/annual-trend-calculations.spec.ts`.
Expected: fail because `annual-trend-calculations.ts` does not exist yet.

- [x] **Step 3: Write minimal implementation**

Create `annual-trend-calculations.ts` with exported `buildAnnualMonthTrends`, `getAnnualTrendSummary`, and `buildAnnualCategoryTrends`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/annual-trend-calculations.spec.ts`.
Expected: pass.

### Task 2: Annual Trend UI

**Files:**
- Modify: `src/features/dashboard/AnnualTrendScreen.tsx`

- [x] **Step 1: Import extracted calculations**

Replace local calculation functions with imports from `annual-trend-calculations.ts`.

- [x] **Step 2: Add stacked category chart**

Render a `카테고리별 소비 변화` section with stacked bars by category.

- [x] **Step 3: Add category summary list**

Render category total, share, peak month, and recent 3-month delta.

- [x] **Step 4: Verify build**

Run: `npm run build`.
Expected: exit code 0.

### Task 3: Browser Verification

**Files:**
- No source files.

- [x] **Step 1: Start local server**

Run: `npm run dev -- --host 127.0.0.1 --port 5175`.

- [x] **Step 2: Verify rendered flow**

Use Playwright to open the app, click `연간 소비 추세`, verify `카테고리별 소비 변화`, stacked chart SVG, summary rows, and no console errors.

- [x] **Step 3: Commit**

Commit message: `연간 카테고리별 소비 변화 추가`.
