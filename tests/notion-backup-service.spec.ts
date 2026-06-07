// Notion 백업 서비스의 cursor 반복 호출을 검증합니다.
import { expect, test } from "@playwright/test";
import { pushBackupToNotion } from "../src/features/backup/notion-backup-service";
import type { BackupFile } from "../src/features/backup/backup-types";

test("pushBackupToNotion follows cursor responses and aggregates counts", async () => {
  const originalFetch = globalThis.fetch;
  const backup = backupWithTransactions(25);
  const requestBodies: unknown[] = [];

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBodies.push(JSON.parse(String(init?.body ?? "{}")));

    if (requestBodies.length === 1) {
      return new Response(
        JSON.stringify({
          version: 1,
          syncedAt: "2026-06-07T10:20:31.000Z",
          created: 20,
          updated: 0,
          legacyRemoved: 0,
          categories: 0,
          transactions: 25,
          processed: 20,
          hasMore: true,
          nextCursor: { phase: "upsert", offset: 20 },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        version: 1,
        syncedAt: "2026-06-07T10:20:32.000Z",
        created: 5,
        updated: 0,
        legacyRemoved: 0,
        categories: 0,
        transactions: 25,
        processed: 5,
        hasMore: false,
        nextCursor: null,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  try {
    const result = await pushBackupToNotion(backup, "secret", "https://worker.test/institutions");

    expect(result).toMatchObject({
      created: 25,
      updated: 0,
      legacyRemoved: 0,
      transactions: 25,
    });
    expect(requestBodies).toEqual([
      { backup },
      { backup, cursor: { phase: "upsert", offset: 20 } },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("pushBackupToNotion rejects hasMore responses without a cursor", async () => {
  const originalFetch = globalThis.fetch;
  const backup = backupWithTransactions(1);

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        version: 1,
        syncedAt: "2026-06-07T10:20:31.000Z",
        created: 1,
        updated: 0,
        legacyRemoved: 0,
        categories: 0,
        transactions: 1,
        processed: 1,
        hasMore: true,
        nextCursor: null,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );

  try {
    await expect(pushBackupToNotion(backup, "secret", "https://worker.test/institutions")).rejects.toThrow(/cursor/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function backupWithTransactions(count: number): BackupFile {
  return {
    version: 1,
    exportedAt: "2026-06-07T10:20:30.000Z",
    categories: [
      {
        id: "expense-food",
        type: "expense",
        name: "식비",
        color: "#c85645",
        isDefault: true,
        isActive: true,
        sortOrder: 0,
        createdAt: "2026-06-07T06:50:48.696Z",
        updatedAt: "2026-06-07T06:50:48.696Z",
      },
    ],
    transactions: Array.from({ length: count }, (_, index) => ({
      id: `tx-${index + 1}`,
      date: "2026-06-07",
      type: "expense",
      amount: 12000 + index,
      categoryId: "expense-food",
      memo: `가맹점 ${index + 1}`,
      source: "shinhan-file",
      createdAt: "2026-06-07T07:00:00.000Z",
      updatedAt: "2026-06-07T07:00:00.000Z",
    })),
  };
}
