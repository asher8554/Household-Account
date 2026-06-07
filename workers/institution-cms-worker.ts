// Notion 기관 카탈로그를 HTTP JSON API로 제공하는 Cloudflare Worker입니다.
import { normalizeNotionInstitutionPages } from "./notion-institution-normalizer";
import {
  buildNotionBackupRows,
  buildNotionBackupSchemaPatch,
  getTitlePropertyName,
  parseBackupPayload,
  type NotionBackupRow,
  type NotionPropertySchema,
} from "./notion-backup-page";
import type { NotionInstitutionPage } from "./notion-institution-types";

interface WorkerEnv {
  NOTION_TOKEN?: string;
  NOTION_DATA_SOURCE_ID?: string;
  NOTION_BACKUP_WRITE_KEY?: string;
  NOTION_VERSION?: string;
  ALLOWED_ORIGIN?: string;
}

interface NotionQueryResponse {
  results?: NotionInstitutionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
}

interface NotionDataSourceResponse {
  properties?: Record<string, NotionPropertySchema>;
}

interface NotionPageResponse {
  id?: string;
  url?: string;
  properties?: Record<string, NotionInstitutionPage["properties"][string] | undefined>;
}

const DEFAULT_NOTION_VERSION = "2026-03-11";
const DEFAULT_ALLOWED_ORIGIN = "*";
const MAX_NOTION_PAGE_COUNT = 50;
const NOTION_REQUEST_FAILED_MESSAGE = "Notion request failed.";
const NOTION_RATE_LIMITED_MESSAGE = "Notion request was rate limited.";

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env),
      });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/institutions") {
      return handleInstitutionsRequest(env);
    }

    if (request.method === "POST" && url.pathname === "/backups") {
      return handleBackupRequest(request, env);
    }

    return jsonResponse({ error: "not_found" }, 404, env);
  },
} satisfies ExportedHandler<WorkerEnv>;

async function handleInstitutionsRequest(env: WorkerEnv): Promise<Response> {
  if (!env.NOTION_TOKEN || !env.NOTION_DATA_SOURCE_ID) {
    return jsonResponse({ error: "worker_not_configured" }, 500, env);
  }

  const notionEnv: RequiredNotionEnv = {
    ...env,
    NOTION_TOKEN: env.NOTION_TOKEN,
    NOTION_DATA_SOURCE_ID: env.NOTION_DATA_SOURCE_ID,
  };

  try {
    const pages = await fetchAllInstitutionPages(notionEnv);
    const catalog = normalizeNotionInstitutionPages(pages, new Date().toISOString());

    return jsonResponse(catalog, 200, env);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return jsonResponse(
      { error: "notion_timeout", message: "Notion request failed." },
      504,
      env,
    );
  }
}

async function handleBackupRequest(request: Request, env: WorkerEnv): Promise<Response> {
  if (!env.NOTION_TOKEN || !env.NOTION_DATA_SOURCE_ID || !env.NOTION_BACKUP_WRITE_KEY) {
    return jsonResponse({ error: "worker_not_configured" }, 500, env);
  }

  const notionEnv: RequiredNotionEnv = {
    ...env,
    NOTION_TOKEN: env.NOTION_TOKEN,
    NOTION_DATA_SOURCE_ID: env.NOTION_DATA_SOURCE_ID,
  };

  if (request.headers.get("X-Household-Backup-Key") !== env.NOTION_BACKUP_WRITE_KEY) {
    return jsonResponse({ error: "unauthorized" }, 401, env);
  }

  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400, env);
  }

  const backup = parseBackupPayload(rawPayload);

  if (!backup) {
    return jsonResponse({ error: "invalid_backup_json" }, 400, env);
  }

  const syncedAt = new Date().toISOString();

  try {
    const dataSource = await retrieveNotionDataSource(notionEnv);
    const titlePropertyName = getTitlePropertyName(dataSource.properties);
    const schemaPatch = buildNotionBackupSchemaPatch(dataSource.properties);

    if (Object.keys(schemaPatch.properties).length > 0) {
      await updateNotionDataSourceSchema(notionEnv, schemaPatch);
    }

    const existingPages = await fetchAllInstitutionPages(
      notionEnv,
      "notion_backup_page_query_failed",
      "Notion backup pages query failed.",
    );
    const rows = buildNotionBackupRows(backup, titlePropertyName, dataSource.properties);
    const obsoleteRemoved = await trashObsoleteBackupPages(notionEnv, existingPages, titlePropertyName);
    const existingPagesResult = await mapExistingPagesByTitle(
      notionEnv,
      existingPages,
      titlePropertyName,
      new Set(rows.map((row) => row.id)),
    );
    const result = await upsertNotionBackupRows(notionEnv, rows, existingPagesResult.pageMap);

    return jsonResponse(
      {
        version: 1,
        syncedAt,
        created: result.created,
        updated: result.updated,
        legacyRemoved: obsoleteRemoved + existingPagesResult.removed,
        categories: 0,
        transactions: backup.transactions.length,
      },
      201,
      env,
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    return jsonResponse({ error: "notion_timeout", message: "Notion request failed." }, 504, env);
  }
}

async function fetchAllInstitutionPages(
  env: RequiredNotionEnv,
  notionErrorCode = "notion_request_failed",
  notionErrorMessage = NOTION_REQUEST_FAILED_MESSAGE,
): Promise<NotionInstitutionPage[]> {
  const pages: NotionInstitutionPage[] = [];
  const seenCursors = new Set<string>();
  let startCursor: string | null = null;
  let pageCount = 0;

  do {
    if (pageCount >= MAX_NOTION_PAGE_COUNT) {
      throw new Error("Notion pagination limit exceeded.");
    }

    if (startCursor) {
      if (seenCursors.has(startCursor)) {
        throw new Error("Notion pagination cursor repeated.");
      }

      seenCursors.add(startCursor);
    }

    const payload = await queryInstitutionPages(env, startCursor, notionErrorCode, notionErrorMessage);
    pages.push(...payload.results);
    startCursor = payload.hasMore ? payload.nextCursor : null;
    pageCount += 1;
  } while (startCursor);

  return pages;
}

async function queryInstitutionPages(
  env: RequiredNotionEnv,
  startCursor: string | null,
  notionErrorCode: string,
  notionErrorMessage: string,
): Promise<{ results: NotionInstitutionPage[]; hasMore: boolean; nextCursor: string | null }> {
  const body: { page_size: number; start_cursor?: string } = { page_size: 100 };

  if (startCursor) {
    body.start_cursor = startCursor;
  }

  const response = await fetch(
    `https://api.notion.com/v1/data_sources/${encodeURIComponent(env.NOTION_DATA_SOURCE_ID)}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": env.NOTION_VERSION || DEFAULT_NOTION_VERSION,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw await notionErrorResponse(response, env, notionErrorCode, notionErrorMessage);
  }

  const payload = (await response.json()) as NotionQueryResponse;

  if (!Array.isArray(payload.results)) {
    throw new Error("Notion response did not include results.");
  }

  return {
    results: payload.results,
    hasMore: payload.has_more === true,
    nextCursor: payload.next_cursor ?? null,
  };
}

async function retrieveNotionDataSource(env: RequiredNotionEnv): Promise<{ properties: Record<string, NotionPropertySchema> }> {
  const response = await fetch(
    `https://api.notion.com/v1/data_sources/${encodeURIComponent(env.NOTION_DATA_SOURCE_ID)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Notion-Version": env.NOTION_VERSION || DEFAULT_NOTION_VERSION,
      },
    },
  );

  if (!response.ok) {
    throw await notionErrorResponse(
      response,
      env,
      "notion_backup_schema_read_failed",
      "Notion data source schema read failed.",
    );
  }

  const dataSource = (await response.json()) as NotionDataSourceResponse;

  if (!dataSource.properties || typeof dataSource.properties !== "object") {
    throw new Error("Notion data source response did not include properties.");
  }

  return {
    properties: dataSource.properties,
  };
}

async function updateNotionDataSourceSchema(
  env: RequiredNotionEnv,
  patch: { properties: Record<string, unknown> },
): Promise<void> {
  const response = await fetch(
    `https://api.notion.com/v1/data_sources/${encodeURIComponent(env.NOTION_DATA_SOURCE_ID)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": env.NOTION_VERSION || DEFAULT_NOTION_VERSION,
      },
      body: JSON.stringify(patch),
    },
  );

  if (!response.ok) {
    throw await notionErrorResponse(
      response,
      env,
      "notion_backup_schema_update_failed",
      "Notion data source schema update failed.",
    );
  }
}

async function upsertNotionBackupRows(
  env: RequiredNotionEnv,
  rows: NotionBackupRow[],
  existingPageById: Map<string, string>,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const pageId = existingPageById.get(row.id);

    if (pageId) {
      await updateNotionBackupPage(env, pageId, row);
      updated += 1;
      continue;
    }

    await createNotionBackupPage(env, row);
    created += 1;
  }

  return { created, updated };
}

async function createNotionBackupPage(
  env: RequiredNotionEnv,
  row: NotionBackupRow,
): Promise<NotionPageResponse> {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": env.NOTION_VERSION || DEFAULT_NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: {
        data_source_id: env.NOTION_DATA_SOURCE_ID,
      },
      properties: row.properties,
    }),
  });

  if (!response.ok) {
    throw await notionErrorResponse(
      response,
      env,
      "notion_backup_page_create_failed",
      "Notion backup page create failed.",
    );
  }

  const page = (await response.json()) as NotionPageResponse;

  if (!page.id) {
    throw new Error("Notion create page response did not include an id.");
  }

  return page;
}

async function updateNotionBackupPage(
  env: RequiredNotionEnv,
  pageId: string,
  row: NotionBackupRow,
): Promise<void> {
  const response = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": env.NOTION_VERSION || DEFAULT_NOTION_VERSION,
    },
    body: JSON.stringify({
      properties: row.properties,
    }),
  });

  if (!response.ok) {
    throw await notionErrorResponse(
      response,
      env,
      "notion_backup_page_update_failed",
      "Notion backup page update failed.",
    );
  }
}

async function mapExistingPagesByTitle(
  env: RequiredNotionEnv,
  pages: NotionInstitutionPage[],
  titlePropertyName: string,
  targetRowIds: Set<string>,
) {
  const pageMap = new Map<string, string>();
  const pagesByRowId = new Map<string, NotionInstitutionPage[]>();
  let removed = 0;

  for (const page of pages) {
    const rowId = textFragmentsValue(page.properties?.[titlePropertyName]?.title);

    if (!page.id || !targetRowIds.has(rowId)) {
      continue;
    }

    const existingPages = pagesByRowId.get(rowId) ?? [];
    existingPages.push(page);
    pagesByRowId.set(rowId, existingPages);
  }

  for (const [rowId, rowPages] of pagesByRowId) {
    const [pageToKeep, ...duplicatePages] = rowPages.sort(compareNotionPagesByLatestEdit);

    if (pageToKeep?.id) {
      pageMap.set(rowId, pageToKeep.id);
    }

    for (const page of duplicatePages) {
      if (!page.id) {
        continue;
      }

      await trashNotionPage(env, page.id);
      removed += 1;
    }
  }

  return { pageMap, removed };
}

async function trashObsoleteBackupPages(
  env: RequiredNotionEnv,
  pages: NotionInstitutionPage[],
  titlePropertyName: string,
) {
  let removed = 0;

  for (const page of pages) {
    const id = page.id;

    if (!id || (!isLegacyBackupSummaryPage(page, titlePropertyName) && !isCategoryBackupPage(page, titlePropertyName))) {
      continue;
    }

    await trashNotionPage(env, id);
    removed += 1;
  }

  return removed;
}

function compareNotionPagesByLatestEdit(left: NotionInstitutionPage, right: NotionInstitutionPage) {
  return pageEditedTime(right) - pageEditedTime(left);
}

function pageEditedTime(page: NotionInstitutionPage) {
  const timestamp = page.last_edited_time ? Date.parse(page.last_edited_time) : 0;

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isLegacyBackupSummaryPage(page: NotionInstitutionPage, titlePropertyName: string) {
  return textFragmentsValue(page.properties?.[titlePropertyName]?.title).startsWith("Household account backup ");
}

function isCategoryBackupPage(page: NotionInstitutionPage, titlePropertyName: string) {
  const recordTypes = optionNamesValue(page.properties?.recordType);

  if (recordTypes.includes("category")) {
    return true;
  }

  const rowId = textFragmentsValue(page.properties?.[titlePropertyName]?.title);

  if (!rowId.startsWith("expense-") && !rowId.startsWith("income-") && !rowId.startsWith("cat_")) {
    return false;
  }

  return (
    !textFragmentsValue(page.properties?.date?.rich_text) &&
    typeof page.properties?.amount?.number !== "number" &&
    optionNamesValue(page.properties?.source).length === 0
  );
}

function optionNamesValue(property: NotionInstitutionPage["properties"][string] | undefined): string[] {
  return [
    property?.select?.name ?? "",
    property?.status?.name ?? "",
    ...(property?.multi_select ?? []).map((option) => option.name ?? ""),
  ].filter(Boolean);
}

async function trashNotionPage(env: RequiredNotionEnv, pageId: string): Promise<void> {
  const response = await fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": env.NOTION_VERSION || DEFAULT_NOTION_VERSION,
    },
    body: JSON.stringify({
      in_trash: true,
    }),
  });

  if (!response.ok) {
    throw await notionErrorResponse(
      response,
      env,
      "notion_backup_legacy_cleanup_failed",
      "Notion legacy backup cleanup failed.",
    );
  }
}

function textFragmentsValue(fragments: Array<{ plain_text?: string; text?: { content?: string } }> | undefined): string {
  return fragments?.map((fragment) => fragment.plain_text ?? fragment.text?.content ?? "").join("").trim() ?? "";
}

async function notionErrorResponse(
  response: Response,
  env: WorkerEnv,
  errorCode = "notion_request_failed",
  message = NOTION_REQUEST_FAILED_MESSAGE,
): Promise<Response> {
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const headers = retryAfter ? { "Retry-After": retryAfter } : undefined;

    return jsonResponse({ error: "notion_rate_limited", message: NOTION_RATE_LIMITED_MESSAGE }, 429, env, headers);
  }

  return jsonResponse(
    {
      error: errorCode,
      message,
      notionStatus: response.status,
      ...notionErrorDetails(await safeNotionErrorPayload(response)),
    },
    502,
    env,
  );
}

async function safeNotionErrorPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function notionErrorDetails(payload: unknown) {
  if (!isRecord(payload)) {
    return {};
  }

  const details: { notionCode?: string; notionMessage?: string } = {};

  if (typeof payload.code === "string") {
    details.notionCode = sanitizeNotionErrorText(payload.code, 80);
  }

  if (typeof payload.message === "string") {
    details.notionMessage = sanitizeNotionErrorText(payload.message, 240);
  }

  return details;
}

function sanitizeNotionErrorText(value: string, maxLength: number) {
  return value.replace(/ntn_[A-Za-z0-9]+/g, "[redacted]").slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function jsonResponse(
  body: unknown,
  status: number,
  env: WorkerEnv,
  extraHeaders?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders(env),
      ...extraHeaders,
    },
  });
}

function jsonHeaders(env: WorkerEnv): Record<string, string> {
  return {
    ...corsHeaders(env),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function corsHeaders(env: WorkerEnv): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Household-Backup-Key",
  };
}

type RequiredNotionEnv = WorkerEnv & {
  NOTION_TOKEN: string;
  NOTION_DATA_SOURCE_ID: string;
};
