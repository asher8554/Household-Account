// 대시보드 push 버튼과 숨김 가져오기 진입 정책을 검증합니다.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { secretImportHash, visibleAppViews } from "../src/app/app-navigation";

const testDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDir, "..");

test("financial import is hidden from the normal app navigation", () => {
  expect(visibleAppViews).toEqual(["dashboard", "annual-trend"]);
  expect(visibleAppViews).not.toContain("shinhan-import");
  expect(secretImportHash).toBe("#admin-import");

  const appShellSource = readSource("src/app/AppShell.tsx");
  expect(appShellSource).toContain("visibleAppViews.map");
  expect(appShellSource).not.toContain("Object.keys(appViewLabels)");
});

test("secret hash opens the financial import screen", () => {
  const appSource = readSource("src/app/App.tsx");

  expect(appSource).toContain("window.location.hash === secretImportHash");
  expect(appSource).toContain('setCurrentView("shinhan-import")');
  expect(appSource).toContain('window.addEventListener("hashchange", syncViewFromHash)');
});

test("transaction form shows current record update below transaction add", () => {
  const transactionFormSource = readSource("src/features/transactions/TransactionForm.tsx");
  const pushButtonSource = readSource("src/features/shared-data/CurrentPcRecordPushButton.tsx");

  expect(transactionFormSource).toContain('import { CurrentPcRecordPushButton } from "../shared-data/CurrentPcRecordPushButton";');
  expect(transactionFormSource.indexOf("거래 추가")).toBeLessThan(
    transactionFormSource.indexOf("<CurrentPcRecordPushButton />"),
  );
  expect(pushButtonSource).toContain("현재 기록 업데이트");
  expect(pushButtonSource).not.toContain("현재 PC 기록 push");
});

test("header copy uses household calendar wording", () => {
  const appShellSource = readSource("src/app/AppShell.tsx");

  expect(appShellSource).toContain("가계부 달력");
  expect(appShellSource).not.toContain("로컬 저장 가계부 달력");
  expect(appShellSource).not.toContain("로컬 저장 가게부 달력");
});

function readSource(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}
