// Notion 백업 행 단위 payload 변환을 검증합니다.
import { expect, test } from "@playwright/test";
import worker from "../workers/institution-cms-worker";
import {
  buildNotionBackupRows,
  buildNotionBackupSchemaPatch,
  parseBackupPayload,
} from "../workers/notion-backup-page";

test("buildNotionBackupRows maps categories and transactions to data source row properties", () => {
  const backup = {
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
    transactions: [
      {
        id: "tx-1",
        date: "2026-06-07",
        type: "expense",
        amount: 12000,
        categoryId: "expense-food",
        memo: "스타벅스",
        source: "shinhan-file",
        createdAt: "2026-06-07T07:00:00.000Z",
        updatedAt: "2026-06-07T07:00:00.000Z",
      },
    ],
  };

  const rows = buildNotionBackupRows(backup, "id");

  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    id: "expense-food",
    recordType: "category",
  });
  expect(rows[0].properties.id.title[0]?.text.content).toBe("expense-food");
  expect(rows[0].properties.recordType.select.name).toBe("category");
  expect(rows[0].properties.type.select.name).toBe("expense");
  expect(rows[0].properties.name.rich_text[0]?.text.content).toBe("식비");
  expect(rows[0].properties.color.rich_text[0]?.text.content).toBe("#c85645");
  expect(rows[0].properties.isDefault.checkbox).toBe(true);
  expect(rows[0].properties.isActive.checkbox).toBe(true);
  expect(rows[0].properties.sortOrder.number).toBe(0);
  expect(rows[0].properties.createdAt.rich_text[0]?.text.content).toBe("2026-06-07T06:50:48.696Z");
  expect(rows[0].properties.updatedAt.rich_text[0]?.text.content).toBe("2026-06-07T06:50:48.696Z");

  expect(rows[1]).toMatchObject({
    id: "tx-1",
    recordType: "transaction",
  });
  expect(rows[1].properties.id.title[0]?.text.content).toBe("tx-1");
  expect(rows[1].properties.recordType.select.name).toBe("transaction");
  expect(rows[1].properties.date.rich_text[0]?.text.content).toBe("2026-06-07");
  expect(rows[1].properties.type.select.name).toBe("expense");
  expect(rows[1].properties.amount.number).toBe(12000);
  expect(rows[1].properties.categoryId.rich_text[0]?.text.content).toBe("expense-food");
  expect(rows[1].properties.name.rich_text[0]?.text.content).toBe("스타벅스");
  expect(rows[1].properties.memo.rich_text[0]?.text.content).toBe("스타벅스");
  expect(rows[1].properties.source.select.name).toBe("shinhan-file");
});

test("buildNotionBackupSchemaPatch adds missing meaningful backup columns", () => {
  const patch = buildNotionBackupSchemaPatch({
    id: { type: "title" },
    type: { type: "select" },
    name: { type: "rich_text" },
  });

  expect(patch).toMatchObject({
    properties: {
      recordType: { select: {} },
      amount: { number: {} },
      categoryId: { rich_text: {} },
      memo: { rich_text: {} },
      source: { select: {} },
      date: { rich_text: {} },
    },
  });
  expect(patch.properties).not.toHaveProperty("id");
  expect(patch.properties).not.toHaveProperty("type");
  expect(patch.properties).not.toHaveProperty("name");
});

test("parseBackupPayload accepts only backup JSON shape", () => {
  expect(parseBackupPayload({ version: 1, exportedAt: "now", categories: [], transactions: [] })).toEqual({
    version: 1,
    exportedAt: "now",
    categories: [],
    transactions: [],
  });
  expect(parseBackupPayload({ version: 1, exportedAt: "now", categories: [] })).toBeNull();
  expect(parseBackupPayload({ version: 2, exportedAt: "now", categories: [], transactions: [] })).toBeNull();
});

test("backup endpoint requires the Worker write key", async () => {
  const response = await worker.fetch(
    new Request("https://worker.test/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: 1, exportedAt: "now", categories: [], transactions: [] }),
    }),
    {
      NOTION_TOKEN: "ntn_test",
      NOTION_DATA_SOURCE_ID: "3783d76f-8874-8055-af3a-000befc853fc",
      NOTION_BACKUP_WRITE_KEY: "secret",
    },
  );

  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toMatchObject({ error: "unauthorized" });
  expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  expect(response.headers.get("Access-Control-Allow-Headers")).toContain("X-Household-Backup-Key");
});

test("backup endpoint reports data source schema update failures", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push(`${method} ${url}`);

    if (method === "GET" && url.includes("/v1/data_sources/")) {
      return new Response(JSON.stringify({ properties: { id: { type: "title" } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "PATCH" && url.includes("/v1/data_sources/")) {
      return new Response(
        JSON.stringify({
          object: "error",
          status: 403,
          code: "restricted_resource",
          message: "Insufficient permissions.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  };

  try {
    const response = await worker.fetch(
      new Request("https://worker.test/backups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Household-Backup-Key": "secret",
        },
        body: JSON.stringify({
          version: 1,
          exportedAt: "2026-06-07T10:20:30.000Z",
          categories: [],
          transactions: [],
        }),
      }),
      {
        NOTION_TOKEN: "ntn_test",
        NOTION_DATA_SOURCE_ID: "3783d76f-8874-8055-af3a-000befc853fc",
        NOTION_BACKUP_WRITE_KEY: "secret",
      },
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "notion_backup_schema_update_failed",
      notionStatus: 403,
    });
    expect(calls).toEqual([
      "GET https://api.notion.com/v1/data_sources/3783d76f-8874-8055-af3a-000befc853fc",
      "PATCH https://api.notion.com/v1/data_sources/3783d76f-8874-8055-af3a-000befc853fc",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
