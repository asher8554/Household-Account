// 달력 격자 높이 안정성을 위해 월과 무관한 고정 셀 수를 검증합니다.
import { expect, test } from "@playwright/test";
import { getMonthGridDays } from "../src/lib/date";

test("month grid always renders six full weeks to keep layout stable", () => {
  for (let month = 0; month < 12; month += 1) {
    const days = getMonthGridDays(new Date(2026, month, 1));

    expect(days.length).toBe(42);
    expect(days[0].date.getDay()).toBe(1);
    expect(days[0].date.getTime()).toBeLessThanOrEqual(new Date(2026, month, 1).getTime());
    expect(days[41].date.getTime()).toBeGreaterThanOrEqual(
      new Date(2026, month + 1, 0).getTime(),
    );
  }
});
