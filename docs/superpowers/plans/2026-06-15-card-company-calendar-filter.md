# Card Company Calendar Filter Plan

**Goal:** Let the dashboard calendar show only Shinhan Card or Hyundai Card spending when the user toggles those card company controls.

**Assumptions**

- The controls live in the existing `카드별 사용금액` summary area.
- Both card companies are active by default, so the dashboard starts with the same combined card-file view as today.
- Toggling off one company filters the calendar, monthly summary, category chart, and day details to the remaining selected card company.
- If both card companies are turned off, the filtered card view has no transactions rather than falling back to all transactions.
- Manual, bank, pay, and CSV transactions are outside this card-company filter.

**Verification**

- Add a RED test for the transaction filtering calculation.
- Implement the smallest calculation helper and wire it into the dashboard.
- Run focused test, full Playwright suite, build, Browser QA for local app, push, and verify GitHub Pages.

**Tasks**

- [x] Add RED test for selected card company source filtering.
- [x] Add card-company source metadata and filter helper.
- [x] Render Shinhan/Hyundai controls as toggle buttons.
- [x] Apply selected companies to calendar-driven dashboard data.
- [x] Verify tests, build, and local Browser QA.
- [x] Push and verify Pages deployment.
