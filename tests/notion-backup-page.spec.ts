// Notion 백업 행 단위 payload 변환을 검증합니다.
import { expect, test } from "@playwright/test";
import worker from "../workers/institution-cms-worker";
import { pushBackupToNotion } from "../src/features/backup/notion-backup-service";
import {
  buildNotionBackupRows,
  buildNotionBackupSchemaPatch,
  parseBackupPayload,
} from "../workers/notion-backup-page";

test("buildNotionBackupRows maps transactions and complete category definitions to data source rows", () => {
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
  expect(rows[1]).toMatchObject({
    id: "tx-1",
    recordType: "transaction",
  });
  expect(rows[1].properties.id.title[0]?.text.content).toBe("스타벅스");
  expect(rows[1].properties.recordId.rich_text[0]?.text.content).toBe("tx-1");
  expect(rows[1].properties.recordType.select.name).toBe("transaction");
  expect(rows[1].properties.date.rich_text[0]?.text.content).toBe("2026-06-07");
  expect(rows[1].properties["날짜"].date.start).toBe("2026-06-07");
  expect(rows[1].properties.type.select.name).toBe("expense");
  expect(rows[1].properties.amount.number).toBe(12000);
  expect(rows[1].properties.categoryId.rich_text[0]?.text.content).toBe("expense-food");
  expect(rows[1].properties.categoryName).toEqual({ rich_text: [{ type: "text", text: { content: "식비" } }] });
  expect(rows[0]).toMatchObject({
    id: "expense-food",
    recordType: "category",
    properties: {
      id: { title: [{ type: "text", text: { content: "식비" } }] },
      recordId: { rich_text: [{ type: "text", text: { content: "expense-food" } }] },
      name: { rich_text: [{ type: "text", text: { content: "식비" } }] },
      color: { rich_text: [{ type: "text", text: { content: "#c85645" } }] },
      type: { select: { name: "expense" } },
      isDefault: { checkbox: true },
      isActive: { checkbox: true },
      sortOrder: { number: 0 },
      createdAt: { rich_text: [{ type: "text", text: { content: backup.categories[0].createdAt } }] },
      updatedAt: { rich_text: [{ type: "text", text: { content: backup.categories[0].updatedAt } }] },
    },
  });
  expect(rows[0].properties).not.toHaveProperty("날짜");
  expect(rows[1].properties.name.rich_text[0]?.text.content).toBe("스타벅스");
  expect(rows[1].properties.memo.rich_text[0]?.text.content).toBe("스타벅스");
  expect(rows[1].properties.source.select.name).toBe("shinhan-file");
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

  expect(rows).toHaveLength(2);
  expect(rows[1].properties.recordType).toEqual({ multi_select: [{ name: "transaction" }] });
  expect(rows[1].properties.type).toEqual({ multi_select: [{ name: "expense" }] });
  expect(rows[1].properties.source).toEqual({ multi_select: [{ name: "shinhan-file" }] });
  expect(rows[0].properties.recordType).toEqual({ multi_select: [{ name: "category" }] });
  expect(rows[0].properties.type).toEqual({ multi_select: [{ name: "expense" }] });
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
      categoryName: { rich_text: {} },
      color: { rich_text: {} },
      isDefault: { checkbox: {} },
      isActive: { checkbox: {} },
      sortOrder: { number: {} },
      memo: { rich_text: {} },
      source: { select: {} },
      date: { rich_text: {} },
      "날짜": { date: {} },
      recordId: { rich_text: {} },
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

test("category formula matches exact IDs even when names repeat and updates renamed categories", () => {
  const categories = [{ id: "expense-grocery", name: "장보기" }, { id: "cat_custom", name: "장보기" }];
  const patch = buildNotionBackupSchemaPatch({}, categories);
  expect(patch.properties["카테고리"]).toEqual({ formula: { expression:
    'ifs(prop("categoryId") == "expense-grocery", "장보기", prop("categoryId") == "cat_custom", "장보기", prop("categoryId"))',
  } });
  const expression = (patch.properties["카테고리"] as { formula: { expression: string } }).formula.expression;
  expect(buildNotionBackupSchemaPatch({ "카테고리": { type: "formula", formula: { expression } } }, categories)
    .properties).not.toHaveProperty("카테고리");
  const renamed = buildNotionBackupSchemaPatch({}, [{ id: "cat_custom", name: "식료품" }]);
  expect(JSON.stringify(renamed.properties["카테고리"])).toContain("식료품");
});

test("category formula escapes labels and preserves unknown IDs", () => {
  const name = '해외 "직구" \\ 택배';
  const patch = buildNotionBackupSchemaPatch({}, [{ id: "cat_1", name }]);
  expect(patch.properties["카테고리"]).toEqual({ formula: {
    expression: `ifs(prop("categoryId") == "cat_1", ${JSON.stringify(name)}, prop("categoryId"))`,
  } });
  expect(buildNotionBackupSchemaPatch({}, []).properties["카테고리"])
    .toEqual({ formula: { expression: 'prop("categoryId")' } });
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

test("backup endpoint reports Worker exceptions with stage and safe message", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new Error("Notion pagination limit exceeded.");
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

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "notion_backup_worker_exception",
      workerStage: "schema_read",
      workerMessage: "Notion pagination limit exceeded.",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("backup endpoint chunks upserts to stay under the Worker subrequest limit", async () => {
  const originalFetch = globalThis.fetch;
  const createCalls: unknown[] = [];
  const backup = backupWithTransactions(25);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (method === "PATCH" && url.includes("/v1/data_sources/")) {
      return Response.json({ properties: {} });
    }

    if (method === "GET" && url.includes("/v1/data_sources/")) {
      return new Response(JSON.stringify({ properties: completeBackupSchema() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && url.includes("/v1/data_sources/") && url.endsWith("/query")) {
      const query = JSON.parse(String(init?.body));
      expect(query.filter.or).toHaveLength(41);
      expect(query.filter.or).toContainEqual({ property: "recordId", rich_text: { equals: "tx-19" } });
      expect(query.filter.or).not.toContainEqual({ property: "recordId", rich_text: { equals: "tx-20" } });
      return new Response(
        JSON.stringify({
          results: [],
          has_more: false,
          next_cursor: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (method === "POST" && url === "https://api.notion.com/v1/pages") {
      createCalls.push(JSON.parse(String(init?.body ?? "{}")));

      return new Response(JSON.stringify({ id: `created-${createCalls.length}` }), {
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
        body: JSON.stringify({ backup }),
      }),
      {
        NOTION_TOKEN: "ntn_test",
        NOTION_DATA_SOURCE_ID: "3783d76f-8874-8055-af3a-000befc853fc",
        NOTION_BACKUP_WRITE_KEY: "secret",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      created: 20,
      updated: 0,
      legacyRemoved: 0,
      categories: 1,
      transactions: 25,
      processed: 19,
      hasMore: true,
      nextCursor: { phase: "upsert", offset: 20 },
    });
    expect(createCalls).toHaveLength(20);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("backup endpoint skips already migrated rows and continues pending title updates", async () => {
  const originalFetch = globalThis.fetch;
  const patchCalls: Array<{ url: string; body: unknown }> = [];
  const backup = backupWithTransactions(25);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (method === "PATCH" && url.includes("/v1/data_sources/")) {
      return Response.json({ properties: {} });
    }

    if (method === "GET" && url.includes("/v1/data_sources/")) {
      return new Response(JSON.stringify({ properties: completeBackupSchema() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && url.includes("/v1/data_sources/") && url.endsWith("/query")) {
      return new Response(
        JSON.stringify({
          results: [{
            id: "page-category",
            properties: buildNotionBackupRows({ ...backup, transactions: [] }, "id")[0].properties,
          }, ...backup.transactions.map((transaction, index) => ({
            id: `page-${index + 1}`,
            last_edited_time: `2026-06-07T07:${String(index).padStart(2, "0")}:00.000Z`,
            properties: index < 20 ? currentTransactionPageProperties(transaction) : legacyTransactionPageProperties(transaction),
          }))],
          has_more: false,
          next_cursor: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
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
        body: JSON.stringify({ backup, cursor: { phase: "upsert", offset: 20 } }),
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
      updated: 5,
      processed: 6,
      transactions: 25,
      hasMore: false,
      nextCursor: null,
    });
    expect(patchCalls).toHaveLength(5);
    expect(patchCalls.map((call) => call.url.split("/").pop())).toEqual([
      "page-21",
      "page-22",
      "page-23",
      "page-24",
      "page-25",
    ]);
    expect(patchCalls[0].body).toMatchObject({
      properties: {
        id: { title: [{ type: "text", text: { content: "가맹점 21" } }] },
        recordId: { rich_text: [{ type: "text", text: { content: "tx-21" } }] },
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("backup endpoint chunks legacy cleanup before upserting rows", async () => {
  const originalFetch = globalThis.fetch;
  const patchCalls: Array<{ url: string; body: unknown }> = [];
  const backup = backupWithTransactions(1);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (method === "PATCH" && url.includes("/v1/data_sources/")) {
      return Response.json({ properties: {} });
    }

    if (method === "GET" && url.includes("/v1/data_sources/")) {
      return new Response(JSON.stringify({ properties: completeBackupSchema() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && url.includes("/v1/data_sources/") && url.endsWith("/query")) {
      return new Response(
        JSON.stringify({
          results: Array.from({ length: 25 }, (_, index) => ({
            id: `page-category-${index}`,
            last_edited_time: "2026-06-07T07:00:00.000Z",
            properties: {
              id: { title: [{ plain_text: `Household account backup ${index}` }] },
              recordType: { select: { name: "category" } },
            },
          })),
          has_more: false,
          next_cursor: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
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
        body: JSON.stringify({ backup }),
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
      updated: 0,
      legacyRemoved: 20,
      categories: 1,
      transactions: 1,
      processed: 0,
      hasMore: true,
      nextCursor: { phase: "cleanup" },
    });
    expect(patchCalls).toHaveLength(20);
    expect(patchCalls.every((call) => JSON.stringify(call.body) === JSON.stringify({ in_trash: true }))).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("backup endpoint preserves category rows while removing duplicate transaction rows", async () => {
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
                id: { title: [{ plain_text: "스타벅스" }] },
                recordId: { rich_text: [{ plain_text: "tx-1" }] },
                recordType: { select: { name: "transaction" } },
              },
            },
            {
              id: "page-duplicate-new",
              last_edited_time: "2026-06-07T07:02:00.000Z",
              properties: {
                id: { title: [{ plain_text: "스타벅스" }] },
                recordId: { rich_text: [{ plain_text: "tx-1" }] },
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
      updated: 2,
      legacyRemoved: 1,
      categories: 1,
      transactions: 1,
    });
    expect(patchCalls).toEqual([
      {
        url: "https://api.notion.com/v1/pages/page-duplicate-old",
        body: { in_trash: true },
      },
      {
        url: "https://api.notion.com/v1/pages/page-category",
        body: expect.objectContaining({
          properties: expect.objectContaining({
            recordId: { rich_text: [{ type: "text", text: { content: "expense-food" } }] },
            name: { rich_text: [{ type: "text", text: { content: "식비" } }] },
            color: { rich_text: [{ type: "text", text: { content: "#c85645" } }] },
          }),
        }),
      },
      {
        url: "https://api.notion.com/v1/pages/page-duplicate-new",
        body: expect.objectContaining({
          properties: expect.objectContaining({
            id: { title: [{ type: "text", text: { content: "스타벅스" } }] },
            recordId: { rich_text: [{ type: "text", text: { content: "tx-1" } }] },
            recordType: { select: { name: "transaction" } },
          }),
        }),
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("backup endpoint completes category batches and updates renamed or reassigned categories without duplicates", async () => {
  const originalFetch = globalThis.fetch;
  const backup = backupWithTransactions(25);
  backup.categories.push({ ...backup.categories[0], id: "cat_unused", name: "여행", isDefault: false, isActive: false, sortOrder: 9 });
  const pages = new Map<string, { id: string; properties: Record<string, unknown> }>();
  // 현재 백업에 없는 과거 카테고리도 삭제하지 않는다.
  pages.set("historical-category", { id: "historical-category", properties: {
    id: title("cat_historical"), recordType: { select: { name: "category" } },
  } });
  let nextId = 0;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "PATCH" && url.includes("/v1/data_sources/")) {
      return Response.json({ properties: {} });
    }
    if (method === "GET" && url.includes("/v1/data_sources/")) {
      return Response.json({ properties: completeBackupSchema() });
    }
    if (method === "POST" && url.endsWith("/query")) {
      return Response.json({ results: [...pages.values()], has_more: false, next_cursor: null });
    }
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (method === "POST" && url === "https://api.notion.com/v1/pages") {
      const id = `page-${++nextId}`;
      pages.set(id, { id, properties: body.properties });
      return Response.json({ id });
    }
    if (method === "PATCH" && url.includes("/v1/pages/")) {
      expect(body).not.toHaveProperty("in_trash");
      const id = url.split("/").pop()!;
      pages.set(id, { id, properties: body.properties });
      return Response.json({ id });
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  };

  let cursor: unknown = null;
  const runBatch = async () => {
    const response = await worker.fetch(new Request("https://worker.test/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Household-Backup-Key": "secret" },
      body: JSON.stringify({ backup, cursor }),
    }), {
      NOTION_TOKEN: "ntn_test", NOTION_DATA_SOURCE_ID: "test-source", NOTION_BACKUP_WRITE_KEY: "secret",
    });
    expect(response.status).toBe(201);
    const result = await response.json();
    cursor = result.nextCursor;
    return result;
  };

  try {
    expect(await runBatch()).toMatchObject({ created: 20, categories: 2, processed: 18, hasMore: true });
    expect(await runBatch()).toMatchObject({ created: 7, categories: 2, processed: 7, hasMore: false });
    expect(await runBatch()).toMatchObject({ created: 0, updated: 0, hasMore: true });
    expect(await runBatch()).toMatchObject({ created: 0, updated: 0, hasMore: false });
    expect(pages.size).toBe(28);
    const unusedCategory = [...pages.values()].find((page) => JSON.stringify(page.properties.recordId ?? "").includes("cat_unused"));
    expect(unusedCategory?.properties).toMatchObject({ isActive: { checkbox: false }, sortOrder: { number: 9 } });

    backup.categories[0].name = "외식";
    backup.transactions[0].categoryId = "cat_unused";
    expect(await runBatch()).toMatchObject({ created: 0, updated: 19, hasMore: true });
    expect(await runBatch()).toMatchObject({ created: 0, updated: 7, hasMore: false });
    expect(await runBatch()).toMatchObject({ created: 0, updated: 0, hasMore: true });
    expect(await runBatch()).toMatchObject({ created: 0, updated: 0, hasMore: false });
    expect(pages.size).toBe(28);
    expect(pages.has("historical-category")).toBe(true);
    expect(pages.get("page-3")?.properties).toMatchObject({
      categoryId: { rich_text: [{ type: "text", text: { content: "cat_unused" } }] },
      categoryName: { rich_text: [{ type: "text", text: { content: "여행" } }] },
    });
    expect(pages.get("page-4")?.properties).toMatchObject({
      categoryName: { rich_text: [{ type: "text", text: { content: "외식" } }] },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("planning excludes identical records and saves only new or changed rows with full category context", async () => {
  const originalFetch = globalThis.fetch;
  const backup = backupWithTransactions(3);
  const pages = new Map(buildNotionBackupRows(backup, "id", completeBackupSchema()).map(row =>
    [row.id, { id: `page-${row.id}`, properties: row.properties }]));
  const saveTargets: string[][] = [];
  const writes: string[] = [];
  let planningQueries = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (url === "https://worker.test/backups") {
      if (body.action !== "plan") saveTargets.push(body.recordIds);
      return worker.fetch(new Request(url, init), {
        NOTION_TOKEN: "ntn_test", NOTION_DATA_SOURCE_ID: "test-source", NOTION_BACKUP_WRITE_KEY: "secret",
      });
    }
    if (method === "GET" && url.includes("/v1/data_sources/")) return Response.json({ properties: completeBackupSchema() });
    if (method === "PATCH" && url.includes("/v1/data_sources/")) return Response.json({});
    if (url.endsWith("/query")) {
      if (body.filter) {
        const ids = new Set(body.filter.or.flatMap((f: { rich_text?: { equals: string } }) => f.rich_text ? [f.rich_text.equals] : []));
        return Response.json({ results: [...pages.entries()].filter(([id]) => ids.has(id)).map(([, page]) => page), has_more: false });
      }
      planningQueries += 1;
      const offset = Number(body.start_cursor ?? 0);
      const all = [...pages.values()];
      return Response.json({ results: all.slice(offset, offset + 2), has_more: offset + 2 < all.length,
        next_cursor: offset + 2 < all.length ? String(offset + 2) : null });
    }
    if (url.includes("/v1/pages")) {
      expect(body).not.toHaveProperty("in_trash");
      const id = body.properties.recordId.rich_text[0].text.content;
      writes.push(id);
      pages.set(id, { id: `page-${id}`, properties: body.properties });
      return Response.json({ id: `page-${id}` });
    }
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  };
  const run = () => pushBackupToNotion(backup, "secret", "https://worker.test/institutions");
  try {
    expect(await run()).toMatchObject({ transactions: 0, categories: 0, skipped: 4, created: 0, updated: 0 });
    expect(planningQueries).toBe(2);
    expect(saveTargets.pop()).toEqual([]);
    expect(writes).toEqual([]);

    backup.transactions[0].amount += 100;
    backup.transactions.push({ ...backup.transactions[1], id: "tx-new" });
    expect(await run()).toMatchObject({ transactions: 2, categories: 0, skipped: 3, created: 1, updated: 1 });
    expect(saveTargets.pop()).toEqual(["tx-1", "tx-new"]);
    expect(writes.splice(0)).toEqual(["tx-1", "tx-new"]);

    backup.categories[0].name = "외식";
    expect(await run()).toMatchObject({ transactions: 4, categories: 1, skipped: 0, updated: 5 });
    expect(pages.get("tx-2")?.properties.categoryName).toEqual({ rich_text: [{ type: "text", text: { content: "외식" } }] });
    writes.length = 0;
    expect(await run()).toMatchObject({ transactions: 0, skipped: 5, updated: 0 });
    expect(writes).toEqual([]);

    // Notion에서 직접 바꾼 금액도 캐시에 가려지지 않고 다시 갱신한다.
    pages.get("tx-3")!.properties.amount = { number: 1 };
    expect(await run()).toMatchObject({ transactions: 1, skipped: 4, updated: 1 });
    expect(saveTargets.pop()).toEqual(["tx-3"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function completeBackupSchema() {
  return {
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
    "날짜": { type: "date" },
    recordId: { type: "rich_text" },
    amount: { type: "number" },
    categoryId: { type: "rich_text" },
    categoryName: { type: "rich_text" },
    color: { type: "rich_text" },
    isDefault: { type: "checkbox" },
    isActive: { type: "checkbox" },
    sortOrder: { type: "number" },
    memo: { type: "rich_text" },
    source: {
      type: "select",
      select: {
        options: [
          { name: "manual", color: "default" },
          { name: "csv", color: "gray" },
          { name: "shinhan-file", color: "blue" },
          { name: "hyundai-card-file", color: "purple" },
          { name: "shinhan-notification", color: "yellow" },
          { name: "bank-file", color: "green" },
          { name: "naver-pay-file", color: "orange" },
        ],
      },
    },
  };
}

function backupWithTransactions(count: number) {
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

function currentTransactionPageProperties(transaction: ReturnType<typeof backupWithTransactions>["transactions"][number]) {
  return {
    id: title(transaction.memo),
    recordId: richText(transaction.id),
    recordType: { select: { name: "transaction" } },
    date: richText(transaction.date),
    "날짜": { date: { start: transaction.date } },
    type: { multi_select: [{ name: transaction.type }] },
    amount: { number: transaction.amount },
    categoryId: richText(transaction.categoryId),
    categoryName: richText("식비"),
    name: richText(transaction.memo),
    memo: richText(transaction.memo),
    source: { select: { name: transaction.source } },
    createdAt: richText(transaction.createdAt),
    updatedAt: richText(transaction.updatedAt),
  };
}

function legacyTransactionPageProperties(transaction: ReturnType<typeof backupWithTransactions>["transactions"][number]) {
  return {
    ...currentTransactionPageProperties(transaction),
    id: title(transaction.id),
    recordId: { rich_text: [] },
  };
}

function title(value: string) {
  return { title: [{ plain_text: value }] };
}

function richText(value: string) {
  return { rich_text: [{ plain_text: value }] };
}
