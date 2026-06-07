// Notion 기관 카탈로그를 HTTP JSON API로 제공하는 Cloudflare Worker입니다.
import { normalizeNotionInstitutionPages } from "./notion-institution-normalizer";
import type { NotionInstitutionPage } from "./notion-institution-types";

interface WorkerEnv {
  NOTION_TOKEN?: string;
  NOTION_DATA_SOURCE_ID?: string;
  NOTION_VERSION?: string;
  ALLOWED_ORIGIN?: string;
}

interface NotionQueryResponse {
  results?: NotionInstitutionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
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

    if (request.method !== "GET" || url.pathname !== "/institutions") {
      return jsonResponse({ error: "not_found" }, 404, env);
    }

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
  },
} satisfies ExportedHandler<WorkerEnv>;

async function fetchAllInstitutionPages(env: RequiredNotionEnv): Promise<NotionInstitutionPage[]> {
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

    const payload = await queryInstitutionPages(env, startCursor);
    pages.push(...payload.results);
    startCursor = payload.hasMore ? payload.nextCursor : null;
    pageCount += 1;
  } while (startCursor);

  return pages;
}

async function queryInstitutionPages(
  env: RequiredNotionEnv,
  startCursor: string | null,
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
    throw await notionErrorResponse(response, env);
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

async function notionErrorResponse(response: Response, env: WorkerEnv): Promise<Response> {
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const headers = retryAfter ? { "Retry-After": retryAfter } : undefined;

    return jsonResponse({ error: "notion_rate_limited", message: NOTION_RATE_LIMITED_MESSAGE }, 429, env, headers);
  }

  return jsonResponse({ error: "notion_request_failed", message: NOTION_REQUEST_FAILED_MESSAGE }, 502, env);
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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

type RequiredNotionEnv = WorkerEnv & {
  NOTION_TOKEN: string;
  NOTION_DATA_SOURCE_ID: string;
};
