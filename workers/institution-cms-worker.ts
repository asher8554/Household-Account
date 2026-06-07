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
    const legacyRemoved = await trashLegacyBackupSummaryPages(notionEnv, existingPages, titlePropertyName);
    const existingPageById = mapExistingPagesByTitle(existingPages, titlePropertyName);
    const rows = buildNotionBackupRows(backup, titlePropertyName);
    const result = await upsertNotionBackupRows(notionEnv, rows, existingPageById);

    return jsonResponse(
      {
        version: 1,
        syncedAt,
        created: result.created,
        updated: result.updated,
        legacyRemoved,
        categories: backup.categories.length,
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

function mapExistingPagesByTitle(pages: NotionInstitutionPage[], titlePropertyName: string) {
  const pageMap = new Map<string, string>();

  for (const page of pages) {
    const id = page.id;
    const rowId = textFragmentsValue(page.properties?.[titlePropertyName]?.title);

    if (id && rowId) {
      pageMap.set(rowId, id);
    }
  }

  return pageMap;
}

async function trashLegacyBackupSummaryPages(
  env: RequiredNotionEnv,
  pages: NotionInstitutionPage[],
  titlePropertyName: string,
) {
  let removed = 0;

  for (const page of pages) {
    const id = page.id;
    const rowId = textFragmentsValue(page.properties?.[titlePropertyName]?.title);

    if (!id || !rowId.startsWith("Household account backup ")) {
      continue;
    }

    await trashNotionPage(env, id);
    removed += 1;
  }

  return removed;
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

  return jsonResponse({ error: errorCode, message, notionStatus: response.status }, 502, env);
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
