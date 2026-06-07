// Notion 백업 page 생성 payload 변환을 검증합니다.
import { expect, test } from "@playwright/test";
import worker from "../workers/institution-cms-worker";
import { buildNotionBackupPagePayload, parseBackupPayload } from "../workers/notion-backup-page";

test("buildNotionBackupPagePayload stores backup JSON as a disabled data source page", () => {
  const backup = {
    version: 1,
    exportedAt: "2026-06-07T10:20:30.000Z",
    categories: [{ id: "food", name: "식비" }],
    transactions: [{ id: "tx-1", amount: 12000 }],
  };

  const payload = buildNotionBackupPagePayload(
    "3783d76f-8874-8055-af3a-000befc853fc",
    backup,
    "2026-06-07T11:22:33.000Z",
  );

  expect(payload.parent).toEqual({
    data_source_id: "3783d76f-8874-8055-af3a-000befc853fc",
  });
  expect(payload.properties.Name.title[0]?.text.content).toBe("Household account backup 2026-06-07 10:20");
  expect(payload.properties.Enabled).toEqual({ checkbox: false });
  expect(payload.markdown).toContain("거래 1건");
  expect(payload.markdown).toContain("카테고리 1개");
  expect(payload.markdown).toContain("```json");
  expect(payload.markdown).toContain('"transactions"');
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
