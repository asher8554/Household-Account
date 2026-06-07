// 현재 PC 기록 push가 GitHub와 Notion 기록을 함께 실행하는지 검증합니다.
import { expect, test } from "@playwright/test";
import {
  formatCurrentPcRecordPushResult,
  pushCurrentPcRecords,
} from "../src/features/shared-data/current-pc-record-push-service";
import type { GitHubSharedDataSettings } from "../src/features/shared-data/github-shared-data-service";

const settings: GitHubSharedDataSettings = {
  owner: "asher8554",
  repo: "Household-Account",
  branch: "main",
  path: "public/shared-data.json",
  token: "github-token",
};

test("pushCurrentPcRecords pushes GitHub data and then records the same backup to Notion", async () => {
  const calls: string[] = [];

  const result = await pushCurrentPcRecords(settings, {
    loadNotionBackupWriteKey: () => {
      calls.push("load-notion-key");
      return "notion-key";
    },
    pushGitHub: async (receivedSettings) => {
      calls.push(`github:${receivedSettings.repo}`);
      return {
        exportedAt: "2026-06-07T12:00:00.000Z",
        transactions: 3,
        commitSha: "abc123",
        commitUrl: "https://github.test/commit/abc123",
      };
    },
    pushNotion: async (writeKey) => {
      calls.push(`notion:${writeKey}`);
      return {
        version: 1,
        syncedAt: "2026-06-07T12:00:01.000Z",
        created: 2,
        updated: 1,
        legacyRemoved: 0,
        categories: 0,
        transactions: 3,
        processed: 3,
        hasMore: false,
        nextCursor: null,
      };
    },
  });

  expect(calls).toEqual(["github:Household-Account", "load-notion-key", "notion:notion-key"]);
  expect(result.notion.status).toBe("success");
  expect(formatCurrentPcRecordPushResult(result)).toBe(
    "현재 PC 기록 3건을 GitHub Pages 공유 파일에 push했고 Notion에도 거래 백업 3건을 기록했습니다.",
  );
});

test("pushCurrentPcRecords keeps the GitHub success result when Notion backup fails", async () => {
  const result = await pushCurrentPcRecords(settings, {
    loadNotionBackupWriteKey: () => "",
    pushGitHub: async () => ({
      exportedAt: "2026-06-07T12:00:00.000Z",
      transactions: 3,
      commitSha: "abc123",
      commitUrl: "https://github.test/commit/abc123",
    }),
    pushNotion: async () => {
      throw new Error("Notion 백업 키를 입력하세요.");
    },
  });

  expect(result.notion).toEqual({
    status: "failed",
    message: "Notion 백업 키를 입력하세요.",
  });
  expect(formatCurrentPcRecordPushResult(result)).toBe(
    "현재 PC 기록 3건을 GitHub Pages 공유 파일에 push했습니다. Notion 기록은 실패했습니다. Notion 백업 키를 입력하세요.",
  );
});
