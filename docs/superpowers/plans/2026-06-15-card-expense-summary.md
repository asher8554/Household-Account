# Card Expense Summary Implementation Plan

**Goal:** Show monthly card spending totals on the dashboard alongside the existing monthly summary.

**Assumptions**

- "카드별 사용금액" means expense totals for the currently selected month, grouped by card identifier.
- Existing transactions do not have a separate card field, so grouping should use the imported memo detail `카드 ...` when present and fall back to the institution/source label.
- This is a display-only dashboard improvement. Transaction schema, backup schema, GitHub shared data, and Notion sync should remain unchanged.

**Verification**

- Add a failing Playwright test for monthly card expense aggregation.
- Run the focused test and confirm it fails before production code changes.
- Implement the minimal calculation and UI rendering.
- Run the focused test, the full Playwright test suite, `npm run build`, and browser smoke verification.

**Tasks**

- [x] Add RED test for card expense grouping.
- [x] Add `getCardExpenseStats` and include card stats in `MonthSummary`.
- [x] Render card spending totals in `MonthSummaryCards`.
- [x] Verify tests, build, and browser behavior.
- [x] Commit the completed logical change.

**Results**

- Focused RED failed because `summary.cardExpenses` was `undefined`.
- Focused GREEN passed with the new monthly card expense grouping.
- `npx playwright test` passed 45 tests.
- `npm run build` passed with the existing Vite chunk size warning.
- In-app Browser verification passed on default width and 393px mobile width with no console errors or horizontal overflow.

## Card Company Grouping Correction

**Goal:** Group card spending by card company, not by imported card detail values such as `신용` or `본인`.

**Tasks**

- [x] Add RED test expecting `신한카드` and `현대카드` groups.
- [x] Make card expense labels come from `transaction.source`.
- [x] Verify focused test, full test suite, build, and browser behavior.
- [ ] Verify Pages deployment.
