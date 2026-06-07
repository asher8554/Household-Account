// 백업 패널이 금융기관 가져오기 화면에 배치되는지 검증합니다.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { expect, test } from "@playwright/test";

const testDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDir, "..");

test("BackupPanel lives in the financial import screen instead of the dashboard sidebar", () => {
  const dashboardScreen = readSource("src/features/dashboard/DashboardScreen.tsx");
  const importGuideScreen = readSource("src/features/import-guide/ShinhanImportGuideScreen.tsx");

  expect(dashboardScreen).not.toContain("BackupPanel");
  expect(importGuideScreen).toContain('import { BackupPanel } from "../backup/BackupPanel";');
  expect(importGuideScreen).toContain("<BackupPanel />");
});

function readSource(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}
