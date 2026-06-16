// 공개 shared-data 경로 동기화 정책을 검증합니다.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { defaultGitHubSharedDataSettings } from "../src/features/shared-data/github-shared-data-service";

const testDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDir, "..");

test("default GitHub data target uses the GitHub Pages shared-data path", () => {
  expect(defaultGitHubSharedDataSettings.owner).toBe("asher8554");
  expect(defaultGitHubSharedDataSettings.repo).toBe("Household-Account");
  expect(defaultGitHubSharedDataSettings.path).toBe("public/shared-data.json");
});

test("GitHub Pages shared-data file is not ignored by git", () => {
  const gitignoreSource = readSource(".gitignore");

  expect(gitignoreSource).not.toContain("public/shared-data.json");
});

test("app startup imports published shared-data for other devices", () => {
  const appSource = readSource("src/app/App.tsx");
  const syncHookSource = readSource("src/features/shared-data/use-published-shared-data-sync.ts");

  expect(appSource).toContain("usePublishedSharedDataSync()");
  expect(syncHookSource).toContain("loadPublishedSharedData");
  expect(syncHookSource).toContain("ensureDefaultCategories");
});

test("open app tabs refresh published shared-data after another device pushes", () => {
  const appSource = readSource("src/app/App.tsx");
  const syncHookSource = readSource("src/features/shared-data/use-published-shared-data-sync.ts");

  expect(appSource).toContain("usePublishedSharedDataSync()");
  expect(syncHookSource).toContain("loadPublishedSharedData");
  expect(syncHookSource).toContain("window.addEventListener(\"focus\"");
  expect(syncHookSource).toContain("document.addEventListener(\"visibilitychange\"");
  expect(syncHookSource).toContain("window.setInterval");
  expect(syncHookSource).toContain("publishedSharedDataRefreshIntervalMs");
  expect(syncHookSource).toContain("minimumSharedDataSyncIntervalMs");
});

test("published shared-data auto load merges remote records instead of skipping local-newer records", () => {
  const serviceSource = readSource("src/features/shared-data/shared-data-service.ts");

  expect(serviceSource).toContain("importBackupData");
  expect(serviceSource).not.toContain("replaceWithBackupData");
  expect(serviceSource).not.toContain("skipped-local-newer");
  expect(serviceSource).not.toContain("latestLocalTransactionTimestamp");
});

test("financial import no longer auto-pushes GitHub shared data", () => {
  const importScreenSource = readSource("src/features/import-guide/ShinhanImportGuideScreen.tsx");

  expect(importScreenSource).not.toContain("pushCurrentSharedDataToGitHub");
});

test("GitHub panel does not block the GitHub Pages shared-data path", () => {
  const panelSource = readSource("src/features/shared-data/GitHubSharedDataPanel.tsx");
  const serviceSource = readSource("src/features/shared-data/github-shared-data-service.ts");

  expect(panelSource).not.toContain("public shared-data target");
  expect(serviceSource).not.toContain("isUnsafePublicSharedDataTarget");
});

test("GitHub panel copy explains the Pages public shared-data target", () => {
  const panelSource = readSource("src/features/shared-data/GitHubSharedDataPanel.tsx");

  expect(panelSource).toContain("GitHub Pages 공유 파일로 커밋하고 Notion에도 기록됩니다.");
  expect(panelSource).toContain("GitHub Pages 공유는 public/shared-data.json을 이 repo에 공개 커밋합니다.");
  expect(panelSource).not.toContain("권한은 이 repo의 Contents read/write로 제한하세요.");
});

test("GitHub shared-data push retries conflicts and explains common API failures", () => {
  const serviceSource = readSource("src/features/shared-data/github-shared-data-service.ts");

  expect(serviceSource).toContain("maxGitHubContentUpdateAttempts");
  expect(serviceSource).toContain("fetchExistingContent");
  expect(serviceSource).toContain("importBackupData(existingContent.raw)");
  expect(serviceSource).toContain("decodeBase64Utf8");
  expect(serviceSource).toContain("response.status === 409");
  expect(serviceSource).toContain("토큰이 만료되었거나 잘못되었습니다.");
  expect(serviceSource).toContain("Contents 권한을 Read and write로 설정하세요.");
  expect(serviceSource).toContain("저장 대상");
  expect(serviceSource).toContain("페이지를 새로고침한 뒤 다시 누르세요.");
});

function readSource(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}
