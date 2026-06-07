// Notion 백업 행 단위 payload 변환을 검증합니다.
import { expect, test } from "@playwright/test";
import worker from "../workers/institution-cms-worker";
import {
  buildNotionBackupRows,
  buildNotionBackupSchemaPatch,
  parseBackupPayload,
} from "../workers/notion-backup-page";

test("buildNotionBackupRows maps only transactions to data source row properties", () => {
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

  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    id: "tx-1",
    recordType: "transaction",
  });
  expect(rows[0].properties.id.title[0]?.text.content).toBe("tx-1");
  expect(rows[0].properties.recordType.select.name).toBe("transaction");
  expect(rows[0].properties.date.rich_text[0]?.text.content).toBe("2026-06-07");
  expect(rows[0].properties.type.select.name).toBe("expense");
  expect(rows[0].properties.amount.number).toBe(12000);
  expect(rows[0].properties.categoryId.rich_text[0]?.text.content).toBe("expense-food");
  expect(rows[0].properties.name.rich_text[0]?.text.content).toBe("스타벅스");
  expect(rows[0].properties.memo.rich_text[0]?.text.content).toBe("스타벅스");
  expect(rows[0].properties.source.select.name).toBe("shinhan-file");
});

test("buildNotionBackupRows uses multi_select values for existing multi-select Notion fields", () => {
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

  const rows = buildNotionBackupRows(backup, "id", {
    recordType: { type: "multi_select" },
    type: { type: "multi_select" },
    source: { type: "multi_select" },
  });

  expect(rows).toHaveLength(1);
  expect(rows[0].properties.recordType).toEqual({ multi_select: [{ name: "transaction" }] });
  expect(rows[0].properties.type).toEqual({ multi_select: [{ name: "expense" }] });
  expect(rows[0].properties.source).toEqual({ multi_select: [{ name: "shinhan-file" }] });
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
      type: {
        select: {
          options: [
            { name: "expense", color: "red" },
            { name: "income", color: "green" },
          ],
        },
      },
    },
  });
  expect(patch.properties).not.toHaveProperty("id");
  expect(patch.properties).not.toHaveProperty("name");
});

test("buildNotionBackupSchemaPatch preserves existing select options and adds missing backup options", () => {
  const patch = buildNotionBackupSchemaPatch({
    id: { type: "title" },
    source: {
      type: "select",
      select: {
        options: [{ id: "existing-option", name: "manual", color: "red" }],
      },
    },
  });

  expect(patch.properties.source).toMatchObject({
    select: {
      options: expect.arrayContaining([
        { id: "existing-option", name: "manual", color: "red" },
        { name: "shinhan-file", color: "blue" },
        { name: "hyundai-card-file", color: "purple" },
      ]),
    },
  });
});

test("buildNotionBackupSchemaPatch preserves existing multi-select options and adds missing backup options", () => {
  const patch = buildNotionBackupSchemaPatch({
    id: { type: "title" },
    type: {
      type: "multi_select",
      multi_select: {
        options: [{ id: "existing-option", name: "expense", color: "red" }],
      },
    },
  });

  expect(patch.properties.type).toMatchObject({
    multi_select: {
      options: expect.arrayContaining([
        { id: "existing-option", name: "expense", color: "red" },
        { name: "income", color: "green" },
      ]),
    },
  });
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

test("backup endpoint includes safe Notion error details for page update failures", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (method === "GET" && url.includes("/v1/data_sources/")) {
      return new Response(
        JSON.stringify({
          properties: {
            id: { type: "title" },
            recordType: {
              type: "select",
              select: { options: [{ name: "category", color: "blue" }, { name: "transaction", color: "green" }] },
            },
            type: {
              type: "select",
              select: { options: [{ name: "expense", color: "red" }, { name: "income", color: "green" }] },
            },
            name: { type: "rich_text" },
            color: { type: "rich_text" },
            isDefault: { type: "checkbox" },
            isActive: { type: "checkbox" },
            sortOrder: { type: "number" },
            createdAt: { type: "rich_text" },
            updatedAt: { type: "rich_text" },
            date: { type: "rich_text" },
            amount: { type: "number" },
            categoryId: { type: "rich_text" },
            memo: { type: "rich_text" },
            source: {
              type: "select",
              select: { options: [{ name: "shinhan-file", color: "blue" }] },
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (method === "POST" && url.includes("/v1/data_sources/") && url.endsWith("/query")) {
      return new Response(
        JSON.stringify({
          results: [
            {
              id: "page-transaction",
              properties: {
                id: {
                  title: [{ plain_text: "tx-1" }],
                },
                recordType: { select: { name: "transaction" } },
              },
            },
          ],
          has_more: false,
          next_cursor: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (method === "PATCH" && url.includes("/v1/data_sources/")) {
      return new Response(JSON.stringify({ properties: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "PATCH" && url.includes("/v1/pages/page-transaction")) {
      return new Response(
        JSON.stringify({
          object: "error",
          status: 400,
          code: "validation_error",
          message: "body.properties.name.rich_text should be defined, instead was undefined.",
        }),
        {
          status: 400,
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
          transactions: [
            {
              id: "tx-1",
              date: "2026-06-07",
              type: "expense",
              amount: 12000,
              categoryId: "expense-food",
              memo: "스타벅스",
              source: "shinhan-file",
              createdAt: "2026-06-07T06:50:48.696Z",
              updatedAt: "2026-06-07T06:50:48.696Z",
            },
          ],
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
      error: "notion_backup_page_update_failed",
      notionStatus: 400,
      notionCode: "validation_error",
      notionMessage: "body.properties.name.rich_text should be defined, instead was undefined.",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("backup endpoint removes category rows and duplicate transaction rows before upsert", async () => {
  const originalFetch = globalThis.fetch;
  const patchCalls: Array<{ url: string; body: unknown }> = [];

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (method === "GET" && url.includes("/v1/data_sources/")) {
      return new Response(
        JSON.stringify({
          properties: {
            id: { type: "title" },
            recordType: {
              type: "select",
              select: { options: [{ name: "category", color: "blue" }, { name: "transaction", color: "green" }] },
            },
            type: {
              type: "select",
              select: { options: [{ name: "expense", color: "red" }, { name: "income", color: "green" }] },
            },
            name: { type: "rich_text" },
            createdAt: { type: "rich_text" },
            updatedAt: { type: "rich_text" },
            date: { type: "rich_text" },
            amount: { type: "number" },
            categoryId: { type: "rich_text" },
            memo: { type: "rich_text" },
            source: {
              type: "select",
              select: { options: [{ name: "shinhan-file", color: "blue" }] },
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (method === "POST" && url.includes("/v1/data_sources/") && url.endsWith("/query")) {
      return new Response(
        JSON.stringify({
          results: [
            {
              id: "page-category",
              last_edited_time: "2026-06-07T07:00:00.000Z",
              properties: {
                id: { title: [{ plain_text: "expense-food" }] },
                recordType: { select: { name: "category" } },
              },
            },
            {
              id: "page-duplicate-old",
              last_edited_time: "2026-06-07T07:01:00.000Z",
              properties: {
                id: { title: [{ plain_text: "tx-1" }] },
                recordType: { select: { name: "transaction" } },
              },
            },
            {
              id: "page-duplicate-new",
              last_edited_time: "2026-06-07T07:02:00.000Z",
              properties: {
                id: { title: [{ plain_text: "tx-1" }] },
                recordType: { select: { name: "transaction" } },
              },
            },
          ],
          has_more: false,
          next_cursor: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (method === "PATCH" && url.includes("/v1/data_sources/")) {
      return new Response(JSON.stringify({ properties: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "PATCH" && url.includes("/v1/pages/")) {
      patchCalls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });

      return new Response(JSON.stringify({ id: url.split("/").pop() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
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
        }),
      }),
      {
        NOTION_TOKEN: "ntn_test",
        NOTION_DATA_SOURCE_ID: "3783d76f-8874-8055-af3a-000befc853fc",
        NOTION_BACKUP_WRITE_KEY: "secret",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      created: 0,
      updated: 1,
      legacyRemoved: 2,
      categories: 0,
      transactions: 1,
    });
    expect(patchCalls).toEqual([
      {
        url: "https://api.notion.com/v1/pages/page-category",
        body: { in_trash: true },
      },
      {
        url: "https://api.notion.com/v1/pages/page-duplicate-old",
        body: { in_trash: true },
      },
      {
        url: "https://api.notion.com/v1/pages/page-duplicate-new",
        body: expect.objectContaining({
          properties: expect.objectContaining({
            id: { title: [{ type: "text", text: { content: "tx-1" } }] },
            recordType: { select: { name: "transaction" } },
          }),
        }),
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
