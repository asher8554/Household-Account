// 공개 shared-data 경로로 거래 내역이 다시 배포되지 않도록 검증합니다.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import {
  defaultGitHubSharedDataSettings,
  isUnsafePublicSharedDataTarget,
  pushCurrentSharedDataToGitHub,
  type GitHubSharedDataSettings,
} from "../src/features/shared-data/github-shared-data-service";

const testDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testDir, "..");

test("default GitHub data target uses a private-data style path", () => {
  expect(defaultGitHubSharedDataSettings.repo).not.toBe("Household-Account");
  expect(defaultGitHubSharedDataSettings.path).toBe("data/household-account.json");
  expect(isUnsafePublicSharedDataTarget(defaultGitHubSharedDataSettings)).toBe(false);
});

test("GitHub push rejects the old public Pages shared-data target", async () => {
  const unsafeSettings: GitHubSharedDataSettings = {
    owner: "asher8554",
    repo: "Household-Account",
    branch: "main",
    path: "public\\shared-data.json",
    token: "test-token",
  };

  expect(isUnsafePublicSharedDataTarget(unsafeSettings)).toBe(true);
  await expect(pushCurrentSharedDataToGitHub(unsafeSettings)).rejects.toThrow(/공개 GitHub Pages/);
});

test("app startup no longer imports published shared-data automatically", () => {
  const appSource = readSource("src/app/App.tsx");

  expect(appSource).not.toContain("loadPublishedSharedData");
});

test("financial import no longer auto-pushes GitHub shared data", () => {
  const importScreenSource = readSource("src/features/import-guide/ShinhanImportGuideScreen.tsx");

  expect(importScreenSource).not.toContain("pushCurrentSharedDataToGitHub");
});

test("public shared-data JSON is not checked into the app assets", () => {
  expect(existsSync(resolve(projectRoot, "public/shared-data.json"))).toBe(false);
});

function readSource(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}
