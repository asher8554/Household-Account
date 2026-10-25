// Notion 백업 서비스의 cursor 반복 호출을 검증합니다.
import { expect, test } from "@playwright/test";
import { pushBackupToNotion } from "../src/features/backup/notion-backup-service";
import type { BackupFile } from "../src/features/backup/backup-types";

test("pushBackupToNotion follows cursor responses and aggregates counts", async () => {
  const originalFetch = globalThis.fetch;
  const backup = backupWithTransactions(25);
  const requestBodies: unknown[] = [];
  const progressUpdates: Array<{ processed?: number; hasMore?: boolean }> = [];

  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (JSON.parse(String(init?.body)).action === "plan") return Response.json({ version: 1, records: [], nextCursor: null });
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
    const result = await pushBackupToNotion(backup, "secret", "https://worker.test/institutions", {
      onBatchComplete: (progress) => {
        progressUpdates.push({
          processed: progress.processed,
          hasMore: progress.hasMore,
        });
      },
    });

    expect(result).toMatchObject({
      created: 25,
      updated: 0,
      legacyRemoved: 0,
      transactions: 25,
    });
    expect(requestBodies).toEqual([
      { backup, recordIds: [...backup.categories, ...backup.transactions].map(row => row.id), cursor: null },
      { backup, recordIds: [...backup.categories, ...backup.transactions].map(row => row.id), cursor: { phase: "upsert", offset: 20 } },
    ]);
    expect(progressUpdates).toEqual([
      { processed: 25, hasMore: undefined },
      { processed: 20, hasMore: true },
      { processed: 25, hasMore: false },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("pushBackupToNotion rejects hasMore responses without a cursor", async () => {
  const originalFetch = globalThis.fetch;
  const backup = backupWithTransactions(1);

  globalThis.fetch = async (_input, init) => {
    if (JSON.parse(String(init?.body)).action === "plan") return Response.json({ version: 1, records: [], nextCursor: null });
    return new Response(
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
  };

  try {
    await expect(pushBackupToNotion(backup, "secret", "https://worker.test/institutions")).rejects.toThrow(/cursor/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Notion backup respects Retry-After and retries the same batch", async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const delays: number[] = [];
  const requests: string[] = [];
  globalThis.setTimeout = ((callback: () => void, delay: number) => {
    delays.push(delay);
    callback();
    return 0;
  }) as typeof setTimeout;
  globalThis.fetch = async (_url, init) => {
    if (JSON.parse(String(init?.body)).action === "plan") return Response.json({ version: 1, records: [], nextCursor: null });
    requests.push(String(init?.body));
    if (requests.length === 1) {
      return Response.json({ error: "notion_rate_limited" }, { status: 429, headers: { "Retry-After": "12" } });
    }
    return Response.json({ version: 1, syncedAt: "now", created: 0, updated: 1, legacyRemoved: 0,
      categories: 1, transactions: 1, processed: 1, hasMore: false, nextCursor: null });
  };
  try {
    expect(await pushBackupToNotion(backupWithTransactions(1), "test-key", "https://worker.test/institutions"))
      .toMatchObject({ categories: 1, transactions: 1, updated: 1 });
    expect(requests).toHaveLength(2);
    expect(requests[1]).toBe(requests[0]);
    expect(delays[0]).toBeGreaterThanOrEqual(12_000);
    expect(delays[0]).toBeLessThan(12_250);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("planning rejects repeated cursors and failures before any save request", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    expect(JSON.parse(String(init?.body)).action).toBe("plan");
    calls += 1;
    return Response.json({ version: 1, records: [], nextCursor: "repeated" });
  };
  try {
    await expect(pushBackupToNotion(backupWithTransactions(1), "secret", "https://worker.test/institutions"))
      .rejects.toThrow("cursor");
    expect(calls).toBe(2);
    globalThis.fetch = async (_url, init) => {
      expect(JSON.parse(String(init?.body)).action).toBe("plan");
      return Response.json({ error: "notion_backup_page_query_failed" }, { status: 502 });
    };
    await expect(pushBackupToNotion(backupWithTransactions(1), "secret", "https://worker.test/institutions"))
      .rejects.toThrow("행 조회에 실패");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Notion backup stops after five rate-limit retries and never retries authentication errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((callback: () => void) => { callback(); return 0; }) as typeof setTimeout;
  let calls = 0;
  let status = 429;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ error: status === 429 ? "notion_rate_limited" : "unauthorized" }, { status });
  };
  try {
    await expect(pushBackupToNotion(backupWithTransactions(1), "test-key", "https://worker.test/institutions"))
      .rejects.toThrow("요청 제한");
    expect(calls).toBe(6);
    status = 401;
    calls = 0;
    await expect(pushBackupToNotion(backupWithTransactions(1), "test-key", "https://worker.test/institutions"))
      .rejects.toThrow("백업 키가 맞지 않습니다");
    expect(calls).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
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
