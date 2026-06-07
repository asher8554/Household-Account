# Notion Institution CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notion의 금융기관 안내 문구와 읽기 전용 파서 힌트를 Cloudflare Worker로 읽고, GitHub Pages React UI가 최신 기관 정보로 파일 가져오기 화면과 파싱 힌트를 구성하게 한다.

**Architecture:** Notion API token은 Cloudflare Worker secret에만 둔다. Worker는 Notion `Financial Institutions` 데이터베이스를 정규화된 JSON으로 반환한다. React 앱은 Worker 응답을 캐시하고, 가져오기 화면과 `parseShinhanTransactionFile`의 column hint 입력으로 사용한다.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, Dexie, Playwright Test, Cloudflare Workers, Wrangler, Notion API `2026-03-11`.

---

## File Structure

Create.

- `workers/notion-institution-types.ts`. Worker와 normalizer가 공유하는 Notion 응답과 기관 설정 타입.
- `workers/notion-institution-normalizer.ts`. Notion page properties를 앱용 institution config로 변환.
- `workers/institution-cms-worker.ts`. `/institutions` HTTP API와 Notion API 호출.
- `tests/notion-institution-normalizer.spec.ts`. Worker normalizer 단위 테스트.
- `src/features/institutions/institution-types.ts`. React 앱의 기관 설정 타입.
- `src/features/institutions/institution-fallbacks.ts`. Worker 실패 시 사용할 내장 기관 설정.
- `src/features/institutions/institution-cache-service.ts`. 기관 설정 localStorage 캐시.
- `src/features/institutions/institution-service.ts`. Worker 호출과 캐시 fallback을 조합하는 클라이언트 서비스.
- `src/features/institutions/use-institution-catalog.ts`. React 화면에서 기관 설정을 읽는 hook.
- `src/features/import-guide/parser-hints.ts`. institution config를 파일 파서 column hints로 변환.
- `tests/shinhan-file-parser-hints.spec.ts`. Notion hint 기반 CSV 파싱 테스트.
- `docs/notion-institution-cms.md`. Notion DB 속성, Worker secret, 배포 절차.
- `wrangler.toml`. Cloudflare Worker 배포 설정.

Modify.

- `package.json`. Wrangler scripts와 devDependencies 추가.
- `.gitignore`. `.dev.vars` 제외.
- `src/features/import-guide/shinhan-file-parser.ts`. optional parser hints를 받아 header mapping에 병합.
- `src/features/import-guide/ShinhanImportGuideScreen.tsx`. 하드코딩 안내 데이터를 institution catalog 기반 UI로 교체.
- `checklist.md`. 구현 진행 항목 추가.
- `context-notes.md`. 구현 결정과 검증 결과 기록.

Do not modify.

- `src/features/transactions/*`. 거래 저장 규칙은 그대로 둔다.
- `src/features/shared-data/*`. private GitHub sync 설계와 별도다.
- `src/features/import-guide/shinhan-binary-xls-parser.ts`. xls binary parsing은 그대로 둔다.

---

### Task 1: Worker Tooling Scaffold

**Files:**
- Modify: `package.json`.
- Modify: `.gitignore`.
- Create: `wrangler.toml`.

- [ ] **Step 1: Install Worker dev dependencies.**

Run.

```powershell
npm install -D wrangler @cloudflare/workers-types
```

Expected.

```text
added ... packages
found 0 vulnerabilities
```

- [ ] **Step 2: Add Worker scripts to `package.json`.**

Modify `package.json` scripts to include these entries while preserving existing scripts.

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "worker:dev": "wrangler dev",
    "worker:deploy": "wrangler deploy"
  }
}
```

- [ ] **Step 3: Add `.dev.vars` to `.gitignore`.**

Append this line.

```gitignore
.dev.vars
```

- [ ] **Step 4: Create `wrangler.toml`.**

```toml
name = "household-account-institution-cms"
main = "workers/institution-cms-worker.ts"
compatibility_date = "2026-06-07"

[vars]
NOTION_VERSION = "2026-03-11"
ALLOWED_ORIGIN = "https://asher8554.github.io"
```

- [ ] **Step 5: Commit tooling scaffold.**

Run.

```powershell
git add package.json package-lock.json .gitignore wrangler.toml
git commit -m "chore: add institution CMS worker tooling"
```

Expected.

```text
[main <sha>] chore: add institution CMS worker tooling
```

---

### Task 2: Notion Institution Normalizer

**Files:**
- Create: `workers/notion-institution-types.ts`.
- Create: `workers/notion-institution-normalizer.ts`.
- Create: `tests/notion-institution-normalizer.spec.ts`.

- [ ] **Step 1: Write the failing normalizer test.**

Create `tests/notion-institution-normalizer.spec.ts`.

```ts
// Notion 금융기관 속성을 Worker 응답 형태로 바꾸는 로직을 검증합니다.
import { expect, test } from "@playwright/test";
import { normalizeNotionInstitutionPages } from "../workers/notion-institution-normalizer";

const notionPage = {
  id: "page-shinhan",
  last_edited_time: "2026-06-07T09:00:00.000Z",
  properties: {
    Name: { title: [{ plain_text: "신한카드" }] },
    "Institution Type": { select: { name: "card" } },
    Enabled: { checkbox: true },
    "Sort Order": { number: 10 },
    "Parser Key": { rich_text: [{ plain_text: "shinhan-card" }] },
    "Homepage URL": { url: "https://www.shinhancard.com" },
    "Mobile App URL": { url: "https://www.shinhancard.com/pconts/html/main.html" },
    "Supported Formats": { multi_select: [{ name: "xls" }, { name: "xlsx" }, { name: "csv" }] },
    "Required Columns": { multi_select: [{ name: "이용일자" }, { name: "승인금액" }, { name: "가맹점명" }] },
    "Date Column Hints": { multi_select: [{ name: "이용일자" }, { name: "승인일자" }] },
    "Amount Column Hints": { multi_select: [{ name: "이용금액" }, { name: "승인금액" }] },
    "Merchant Column Hints": { multi_select: [{ name: "가맹점명" }, { name: "이용처" }] },
    "Status Column Hints": { multi_select: [{ name: "승인/취소" }, { name: "상태" }] },
    "PC Steps": { rich_text: [{ plain_text: "홈페이지 로그인\n카드 이용내역 이동\nExcel 저장" }] },
    "Mobile Steps": { rich_text: [{ plain_text: "앱 실행\n이용내역 검색" }] },
    Notes: { rich_text: [{ plain_text: "승인취소 거래는 미리보기에서 확인하세요." }] },
  },
};

test("normalizeNotionInstitutionPages returns enabled institution configs", () => {
  const result = normalizeNotionInstitutionPages([notionPage], "2026-06-07T10:00:00.000Z");

  expect(result).toEqual({
    version: 1,
    fetchedAt: "2026-06-07T10:00:00.000Z",
    institutions: [
      {
        name: "신한카드",
        institutionType: "card",
        enabled: true,
        sortOrder: 10,
        parserKey: "shinhan-card",
        homepageUrl: "https://www.shinhancard.com",
        mobileAppUrl: "https://www.shinhancard.com/pconts/html/main.html",
        supportedFormats: ["xls", "xlsx", "csv"],
        requiredColumns: ["이용일자", "승인금액", "가맹점명"],
        dateColumnHints: ["이용일자", "승인일자"],
        amountColumnHints: ["이용금액", "승인금액"],
        merchantColumnHints: ["가맹점명", "이용처"],
        statusColumnHints: ["승인/취소", "상태"],
        pcSteps: ["홈페이지 로그인", "카드 이용내역 이동", "Excel 저장"],
        mobileSteps: ["앱 실행", "이용내역 검색"],
        notes: "승인취소 거래는 미리보기에서 확인하세요.",
        updatedAt: "2026-06-07T09:00:00.000Z",
      },
    ],
  });
});

test("normalizeNotionInstitutionPages excludes disabled and nameless entries", () => {
  const disabled = {
    ...notionPage,
    id: "disabled",
    properties: { ...notionPage.properties, Enabled: { checkbox: false } },
  };
  const nameless = {
    ...notionPage,
    id: "nameless",
    properties: { ...notionPage.properties, Name: { title: [] } },
  };

  const result = normalizeNotionInstitutionPages([disabled, nameless], "2026-06-07T10:00:00.000Z");

  expect(result.institutions).toEqual([]);
});
```

- [ ] **Step 2: Run the normalizer test and verify it fails.**

Run.

```powershell
npx playwright test tests/notion-institution-normalizer.spec.ts
```

Expected.

```text
Error: Cannot find module '../workers/notion-institution-normalizer'
```

- [ ] **Step 3: Create `workers/notion-institution-types.ts`.**

```ts
// Notion 금융기관 CMS Worker의 입출력 타입을 정의합니다.
export type InstitutionType = "card" | "bank" | "pay";

export type InstitutionConfig = {
  name: string;
  institutionType: InstitutionType;
  enabled: boolean;
  sortOrder: number;
  parserKey: string;
  homepageUrl: string;
  mobileAppUrl: string;
  supportedFormats: string[];
  requiredColumns: string[];
  dateColumnHints: string[];
  amountColumnHints: string[];
  merchantColumnHints: string[];
  statusColumnHints: string[];
  pcSteps: string[];
  mobileSteps: string[];
  notes: string;
  updatedAt: string;
};

export type InstitutionCatalog = {
  version: 1;
  fetchedAt: string;
  institutions: InstitutionConfig[];
};

export type NotionProperty = {
  title?: Array<{ plain_text?: string }>;
  rich_text?: Array<{ plain_text?: string }>;
  select?: { name?: string } | null;
  multi_select?: Array<{ name?: string }>;
  checkbox?: boolean;
  number?: number | null;
  url?: string | null;
};

export type NotionInstitutionPage = {
  id: string;
  last_edited_time?: string;
  properties?: Record<string, NotionProperty>;
};
```

- [ ] **Step 4: Create `workers/notion-institution-normalizer.ts`.**

```ts
// Notion 페이지 속성을 공개 가능한 금융기관 설정 JSON으로 정규화합니다.
import type { InstitutionCatalog, InstitutionConfig, InstitutionType, NotionInstitutionPage, NotionProperty } from "./notion-institution-types";

const validInstitutionTypes = new Set<InstitutionType>(["card", "bank", "pay"]);

export function normalizeNotionInstitutionPages(
  pages: NotionInstitutionPage[],
  fetchedAt = new Date().toISOString(),
): InstitutionCatalog {
  const institutions = pages
    .map(toInstitutionConfig)
    .filter((item): item is InstitutionConfig => item !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return {
    version: 1,
    fetchedAt,
    institutions,
  };
}

function toInstitutionConfig(page: NotionInstitutionPage): InstitutionConfig | null {
  const properties = page.properties ?? {};
  const name = getTitle(properties.Name);
  const enabled = getCheckbox(properties.Enabled, true);

  if (!name || !enabled) return null;

  const institutionType = getInstitutionType(properties["Institution Type"]);
  const parserKey = getText(properties["Parser Key"]);

  return {
    name,
    institutionType,
    enabled,
    sortOrder: getNumber(properties["Sort Order"], 999),
    parserKey,
    homepageUrl: getUrl(properties["Homepage URL"]),
    mobileAppUrl: getUrl(properties["Mobile App URL"]),
    supportedFormats: getMultiSelect(properties["Supported Formats"]),
    requiredColumns: getMultiSelect(properties["Required Columns"]),
    dateColumnHints: getMultiSelect(properties["Date Column Hints"]),
    amountColumnHints: getMultiSelect(properties["Amount Column Hints"]),
    merchantColumnHints: getMultiSelect(properties["Merchant Column Hints"]),
    statusColumnHints: getMultiSelect(properties["Status Column Hints"]),
    pcSteps: splitLines(getText(properties["PC Steps"])),
    mobileSteps: splitLines(getText(properties["Mobile Steps"])),
    notes: getText(properties.Notes),
    updatedAt: page.last_edited_time ?? "",
  };
}

function getTitle(property: NotionProperty | undefined) {
  return normalizeText(property?.title?.map((part) => part.plain_text ?? "").join(""));
}

function getText(property: NotionProperty | undefined) {
  return normalizeText(property?.rich_text?.map((part) => part.plain_text ?? "").join(""));
}

function getInstitutionType(property: NotionProperty | undefined): InstitutionType {
  const value = normalizeText(property?.select?.name).toLowerCase();
  return validInstitutionTypes.has(value as InstitutionType) ? (value as InstitutionType) : "card";
}

function getMultiSelect(property: NotionProperty | undefined) {
  return (property?.multi_select ?? []).map((item) => normalizeText(item.name)).filter(Boolean);
}

function getCheckbox(property: NotionProperty | undefined, fallback: boolean) {
  return typeof property?.checkbox === "boolean" ? property.checkbox : fallback;
}

function getNumber(property: NotionProperty | undefined, fallback: number) {
  return typeof property?.number === "number" && Number.isFinite(property.number) ? property.number : fallback;
}

function getUrl(property: NotionProperty | undefined) {
  return normalizeText(property?.url);
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map(normalizeText).filter(Boolean);
}

function normalizeText(value: string | undefined | null) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 5: Run the normalizer test and verify it passes.**

Run.

```powershell
npx playwright test tests/notion-institution-normalizer.spec.ts
```

Expected.

```text
2 passed
```

- [ ] **Step 6: Commit normalizer.**

Run.

```powershell
git add workers/notion-institution-types.ts workers/notion-institution-normalizer.ts tests/notion-institution-normalizer.spec.ts
git commit -m "feat: normalize Notion institution settings"
```

Expected.

```text
[main <sha>] feat: normalize Notion institution settings
```

---

### Task 3: Worker HTTP API

**Files:**
- Create: `workers/institution-cms-worker.ts`.
- Modify: `tests/notion-institution-normalizer.spec.ts`.

- [ ] **Step 1: Extend tests with Worker response shape guard.**

Append this test to `tests/notion-institution-normalizer.spec.ts`.

```ts
test("normalized catalog never exposes Notion raw page ids", () => {
  const result = normalizeNotionInstitutionPages([notionPage], "2026-06-07T10:00:00.000Z");

  expect(JSON.stringify(result)).not.toContain("page-shinhan");
  expect(JSON.stringify(result)).not.toContain("properties");
});
```

- [ ] **Step 2: Run the extended test.**

Run.

```powershell
npx playwright test tests/notion-institution-normalizer.spec.ts
```

Expected.

```text
3 passed
```

- [ ] **Step 3: Create `workers/institution-cms-worker.ts`.**

```ts
// Notion 금융기관 정보를 읽어 GitHub Pages 앱에 전달하는 Cloudflare Worker입니다.
import { normalizeNotionInstitutionPages } from "./notion-institution-normalizer";
import type { NotionInstitutionPage } from "./notion-institution-types";

type Env = {
  NOTION_TOKEN: string;
  NOTION_DATA_SOURCE_ID: string;
  NOTION_VERSION?: string;
  ALLOWED_ORIGIN?: string;
};

type NotionQueryResponse = {
  results?: NotionInstitutionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
};

const defaultNotionVersion = "2026-03-11";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: getCorsHeaders(env) });
    }

    if (request.method !== "GET" || url.pathname !== "/institutions") {
      return json({ error: "not_found" }, 404, env);
    }

    if (!env.NOTION_TOKEN || !env.NOTION_DATA_SOURCE_ID) {
      return json({ error: "worker_not_configured" }, 500, env);
    }

    try {
      const pages = await fetchAllInstitutionPages(env);
      return json(normalizeNotionInstitutionPages(pages), 200, env);
    } catch (error) {
      if (error instanceof NotionApiError) {
        return json(
          { error: error.code, message: error.message },
          error.status,
          env,
          error.retryAfter ? { "Retry-After": error.retryAfter } : undefined,
        );
      }

      return json({ error: "notion_timeout", message: "Notion request failed." }, 504, env);
    }
  },
};

async function fetchAllInstitutionPages(env: Env) {
  const pages: NotionInstitutionPage[] = [];
  let cursor: string | undefined;

  do {
    const response = await fetch(getQueryUrl(env.NOTION_DATA_SOURCE_ID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": env.NOTION_VERSION || defaultNotionVersion,
      },
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
      }),
    });

    if (!response.ok) {
      throw await toNotionApiError(response);
    }

    const body = (await response.json()) as NotionQueryResponse;
    pages.push(...(body.results ?? []));
    cursor = body.has_more && body.next_cursor ? body.next_cursor : undefined;
  } while (cursor);

  return pages;
}

function getQueryUrl(dataSourceId: string) {
  return `https://api.notion.com/v1/data_sources/${encodeURIComponent(dataSourceId)}/query`;
}

async function toNotionApiError(response: Response) {
  const retryAfter = response.headers.get("Retry-After") ?? undefined;
  const detail = await readErrorMessage(response);

  if (response.status === 429) {
    return new NotionApiError(429, "notion_rate_limited", detail, retryAfter);
  }

  return new NotionApiError(502, "notion_request_failed", detail, retryAfter);
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message || "Notion API request failed.";
  } catch {
    return "Notion API request failed.";
  }
}

class NotionApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfter?: string,
  ) {
    super(message);
  }
}

function json(body: unknown, status: number, env: Env, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...getCorsHeaders(env),
      ...extraHeaders,
    },
  });
}

function getCorsHeaders(env: Env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
```

- [ ] **Step 4: Create local `.dev.vars` for manual development.**

Create `.dev.vars` locally. Do not commit it.

```dotenv
NOTION_TOKEN=ntn_your_local_token
NOTION_DATA_SOURCE_ID=your_notion_data_source_id
NOTION_VERSION=2026-03-11
ALLOWED_ORIGIN=http://localhost:5173
```

- [ ] **Step 5: Run Worker locally.**

Run.

```powershell
npm run worker:dev
```

Expected.

```text
Ready on http://localhost:8787
```

Open another terminal and run.

```powershell
Invoke-WebRequest -Uri http://localhost:8787/institutions | Select-Object -ExpandProperty StatusCode
```

Expected.

```text
200
```

- [ ] **Step 6: Set Cloudflare secrets for deploy.**

Run.

```powershell
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATA_SOURCE_ID
```

Expected.

```text
Success! Uploaded secret NOTION_TOKEN
Success! Uploaded secret NOTION_DATA_SOURCE_ID
```

- [ ] **Step 7: Commit Worker API.**

Run.

```powershell
git add workers/institution-cms-worker.ts tests/notion-institution-normalizer.spec.ts
git commit -m "feat: expose Notion institution CMS worker"
```

Expected.

```text
[main <sha>] feat: expose Notion institution CMS worker
```

---

### Task 4: App Institution Catalog Client

**Files:**
- Create: `src/features/institutions/institution-types.ts`.
- Create: `src/features/institutions/institution-fallbacks.ts`.
- Create: `src/features/institutions/institution-cache-service.ts`.
- Create: `src/features/institutions/institution-service.ts`.
- Create: `src/features/institutions/use-institution-catalog.ts`.
- Create: `tests/institution-service.spec.ts`.

- [ ] **Step 1: Write the failing client service test.**

Create `tests/institution-service.spec.ts`.

```ts
// 금융기관 설정 서비스의 Worker 성공과 fallback 동작을 검증합니다.
import { expect, test } from "@playwright/test";
import { getFallbackInstitutionCatalog } from "../src/features/institutions/institution-fallbacks";
import { selectInstitutionCatalog } from "../src/features/institutions/institution-service";

test("selectInstitutionCatalog prefers remote catalog when it has institutions", () => {
  const fallback = getFallbackInstitutionCatalog("2026-06-07T09:00:00.000Z");
  const remote = {
    version: 1 as const,
    fetchedAt: "2026-06-07T10:00:00.000Z",
    source: "remote" as const,
    institutions: [{ ...fallback.institutions[0], name: "원격 신한카드" }],
  };

  expect(selectInstitutionCatalog(remote, fallback).institutions[0].name).toBe("원격 신한카드");
});

test("selectInstitutionCatalog falls back when remote catalog is empty", () => {
  const fallback = getFallbackInstitutionCatalog("2026-06-07T09:00:00.000Z");
  const remote = {
    version: 1 as const,
    fetchedAt: "2026-06-07T10:00:00.000Z",
    source: "remote" as const,
    institutions: [],
  };

  expect(selectInstitutionCatalog(remote, fallback)).toBe(fallback);
});
```

- [ ] **Step 2: Run the client test and verify it fails.**

Run.

```powershell
npx playwright test tests/institution-service.spec.ts
```

Expected.

```text
Error: Cannot find module '../src/features/institutions/institution-fallbacks'
```

- [ ] **Step 3: Create `src/features/institutions/institution-types.ts`.**

```ts
// 금융기관 안내와 파서 힌트 설정 타입을 정의합니다.
export type InstitutionType = "card" | "bank" | "pay";
export type InstitutionCatalogSource = "remote" | "cache" | "fallback";

export type InstitutionConfig = {
  name: string;
  institutionType: InstitutionType;
  enabled: boolean;
  sortOrder: number;
  parserKey: string;
  homepageUrl: string;
  mobileAppUrl: string;
  supportedFormats: string[];
  requiredColumns: string[];
  dateColumnHints: string[];
  amountColumnHints: string[];
  merchantColumnHints: string[];
  statusColumnHints: string[];
  pcSteps: string[];
  mobileSteps: string[];
  notes: string;
  updatedAt: string;
};

export type InstitutionCatalog = {
  version: 1;
  fetchedAt: string;
  source: InstitutionCatalogSource;
  institutions: InstitutionConfig[];
};
```

- [ ] **Step 4: Create `src/features/institutions/institution-fallbacks.ts`.**

```ts
// Worker 장애 시 사용할 기본 금융기관 안내 설정입니다.
import type { InstitutionCatalog, InstitutionConfig } from "./institution-types";

const fallbackInstitutions: InstitutionConfig[] = [
  {
    name: "신한카드",
    institutionType: "card",
    enabled: true,
    sortOrder: 10,
    parserKey: "shinhan-card",
    homepageUrl: "https://www.shinhancard.com/pconts/html/main.html?_refer=https://www.google.com/",
    mobileAppUrl: "https://www.shinhancard.com/pconts/html/main.html",
    supportedFormats: ["csv", "xls", "xlsx"],
    requiredColumns: ["이용일자 또는 승인일자", "이용금액 또는 승인금액", "가맹점명", "승인/취소 상태"],
    dateColumnHints: ["이용일자", "승인일자", "거래일시"],
    amountColumnHints: ["이용금액", "승인금액", "거래금액"],
    merchantColumnHints: ["가맹점명", "이용처", "적요"],
    statusColumnHints: ["승인/취소", "상태", "거래상태"],
    pcSteps: [
      "신한카드 홈페이지에 로그인합니다.",
      "카드 이용내역 화면에서 기간을 선택합니다.",
      "Excel 파일로 저장합니다.",
    ],
    mobileSteps: [
      "신한 SOL페이 앱을 엽니다.",
      "카드 이용내역을 검색합니다.",
      "파일 저장 또는 공유 기능이 있으면 파일로 저장합니다.",
    ],
    notes: "승인취소 거래는 미리보기에서 수입으로 표시되는지 확인하세요.",
    updatedAt: "2026-06-07T00:00:00.000Z",
  },
];

export function getFallbackInstitutionCatalog(fetchedAt = new Date().toISOString()): InstitutionCatalog {
  return {
    version: 1,
    fetchedAt,
    source: "fallback",
    institutions: fallbackInstitutions,
  };
}
```

- [ ] **Step 5: Create cache and service files.**

Create `src/features/institutions/institution-cache-service.ts`.

```ts
// 금융기관 안내 설정을 브라우저 캐시에 저장하고 읽습니다.
import type { InstitutionCatalog } from "./institution-types";

const cacheKey = "household-account-institution-catalog";

export function loadCachedInstitutionCatalog(): InstitutionCatalog | null {
  const stored = window.localStorage.getItem(cacheKey);
  if (!stored) return null;

  try {
    return normalizeCachedCatalog(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function saveInstitutionCatalogCache(catalog: InstitutionCatalog) {
  window.localStorage.setItem(cacheKey, JSON.stringify({ ...catalog, source: "cache" }));
}

function normalizeCachedCatalog(value: InstitutionCatalog): InstitutionCatalog | null {
  if (value?.version !== 1 || !Array.isArray(value.institutions)) return null;
  return { ...value, source: "cache" };
}
```

Create `src/features/institutions/institution-service.ts`.

```ts
// Worker, 캐시, 내장 fallback을 조합해 금융기관 설정을 제공합니다.
import { getFallbackInstitutionCatalog } from "./institution-fallbacks";
import { loadCachedInstitutionCatalog, saveInstitutionCatalogCache } from "./institution-cache-service";
import type { InstitutionCatalog } from "./institution-types";

export async function loadInstitutionCatalog(): Promise<InstitutionCatalog> {
  const fallback = loadCachedInstitutionCatalog() ?? getFallbackInstitutionCatalog();
  const workerUrl = getInstitutionWorkerUrl();

  if (!workerUrl) {
    return fallback;
  }

  try {
    const remote = await fetchInstitutionCatalog(workerUrl);
    const selected = selectInstitutionCatalog(remote, fallback);
    if (selected.source === "remote") saveInstitutionCatalogCache(selected);
    return selected;
  } catch {
    return fallback;
  }
}

export async function fetchInstitutionCatalog(url: string): Promise<InstitutionCatalog> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`기관 정보를 읽지 못했습니다. HTTP ${response.status}`);

  const body = (await response.json()) as InstitutionCatalog;
  return {
    ...body,
    source: "remote",
  };
}

export function selectInstitutionCatalog(remote: InstitutionCatalog, fallback: InstitutionCatalog): InstitutionCatalog {
  return remote.institutions.length > 0 ? remote : fallback;
}

function getInstitutionWorkerUrl() {
  return import.meta.env.VITE_INSTITUTION_CMS_URL as string | undefined;
}
```

Create `src/features/institutions/use-institution-catalog.ts`.

```ts
// 금융기관 안내 설정을 React 화면 상태로 로드합니다.
import { useCallback, useEffect, useState } from "react";
import { getFallbackInstitutionCatalog } from "./institution-fallbacks";
import { loadInstitutionCatalog } from "./institution-service";
import type { InstitutionCatalog } from "./institution-types";

export function useInstitutionCatalog() {
  const [catalog, setCatalog] = useState<InstitutionCatalog>(() => getFallbackInstitutionCatalog());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setCatalog(await loadInstitutionCatalog());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "기관 정보를 읽지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { catalog, isLoading, error, refresh };
}
```

- [ ] **Step 6: Run tests.**

Run.

```powershell
npx playwright test tests/institution-service.spec.ts
```

Expected.

```text
2 passed
```

- [ ] **Step 7: Commit catalog client.**

Run.

```powershell
git add src/features/institutions tests/institution-service.spec.ts
git commit -m "feat: load institution catalog in app"
```

Expected.

```text
[main <sha>] feat: load institution catalog in app
```

---

### Task 5: Parser Hint Integration

**Files:**
- Create: `src/features/import-guide/parser-hints.ts`.
- Modify: `src/features/import-guide/shinhan-file-parser.ts`.
- Create: `tests/shinhan-file-parser-hints.spec.ts`.

- [ ] **Step 1: Write failing parser hint test.**

Create `tests/shinhan-file-parser-hints.spec.ts`.

```ts
// 금융기관 CMS의 컬럼 힌트를 카드 파일 파싱에 반영하는지 검증합니다.
import { expect, test } from "@playwright/test";
import { parseShinhanTransactionFile } from "../src/features/import-guide/shinhan-file-parser";

test("parseShinhanTransactionFile uses supplied column hints", async () => {
  const file = new File(["사용일,결제액,사용처\n2026-06-01,12000,스타벅스"], "custom-shinhan.csv", {
    type: "text/csv",
  });

  const result = await parseShinhanTransactionFile(file, {
    parserKey: "shinhan-card",
    institutionName: "신한카드",
    dateColumnHints: ["사용일"],
    amountColumnHints: ["결제액"],
    merchantColumnHints: ["사용처"],
    statusColumnHints: [],
  });

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    date: "2026-06-01",
    amount: 12000,
    merchant: "스타벅스",
    institutionName: "신한카드",
    transactionSource: "shinhan-file",
  });
});
```

- [ ] **Step 2: Run parser hint test and verify it fails.**

Run.

```powershell
npx playwright test tests/shinhan-file-parser-hints.spec.ts
```

Expected.

```text
Expected 1 arguments, but got 2.
```

- [ ] **Step 3: Create `src/features/import-guide/parser-hints.ts`.**

```ts
// 금융기관 설정을 파일 파서가 사용할 읽기 전용 힌트로 변환합니다.
import type { InstitutionConfig } from "../institutions/institution-types";

export type InstitutionParserHints = {
  parserKey: string;
  institutionName: string;
  dateColumnHints: string[];
  amountColumnHints: string[];
  merchantColumnHints: string[];
  statusColumnHints: string[];
};

export function toParserHints(institution: InstitutionConfig): InstitutionParserHints {
  return {
    parserKey: institution.parserKey,
    institutionName: institution.name,
    dateColumnHints: institution.dateColumnHints,
    amountColumnHints: institution.amountColumnHints,
    merchantColumnHints: institution.merchantColumnHints,
    statusColumnHints: institution.statusColumnHints,
  };
}
```

- [ ] **Step 4: Modify `src/features/import-guide/shinhan-file-parser.ts` signature and mapping.**

Change the import section.

```ts
import type { ShinhanParsedCandidate } from "./shinhan-import-types";
import type { InstitutionParserHints } from "./parser-hints";
import { detectTransactionType, normalizeLooseText, parseDateKey, parseKrwAmount } from "./shinhan-normalizers";
```

Change `parseShinhanTransactionFile`.

```ts
export async function parseShinhanTransactionFile(
  file: File,
  hints?: InstitutionParserHints,
): Promise<ShinhanParsedCandidate[]> {
  const rows = await readFileRows(file);
  const table = rows.filter((row) => row.some((cell) => normalizeLooseText(cell)));
  const headerIndex = findHeaderRowIndex(table, hints);

  if (headerIndex < 0) {
    throw new Error("이용일자, 이용금액, 가맹점명 같은 헤더 행을 찾지 못했습니다.");
  }

  const headers = table[headerIndex].map((cell) => normalizeLooseText(cell));
  const mapping = buildColumnMapping(headers, hints);
  const institution = detectFileInstitution(file.name, mapping, hints);

  if (mapping.date < 0 || !hasAmountColumn(mapping) || mapping.merchant < 0) {
    throw new Error("날짜, 금액, 거래내용 컬럼을 자동으로 찾지 못했습니다.");
  }

  return table
    .slice(headerIndex + 1)
    .map((row, index) => toCandidate(row, mapping, index, institution))
    .filter((candidate): candidate is ShinhanParsedCandidate => candidate !== null);
}
```

Change `buildColumnMapping`, `findHeaderRowIndex`, and `detectFileInstitution`.

```ts
function buildColumnMapping(headers: string[], hints?: InstitutionParserHints): ColumnMapping {
  return {
    date: findColumnIndex(headers, mergeAliases(columnAliases.date, hints?.dateColumnHints)),
    amount: findColumnIndex(headers, mergeAliases(columnAliases.amount, hints?.amountColumnHints)),
    withdrawalAmount: findColumnIndex(headers, columnAliases.withdrawalAmount),
    depositAmount: findColumnIndex(headers, columnAliases.depositAmount),
    merchant: findColumnIndex(headers, mergeAliases(columnAliases.merchant, hints?.merchantColumnHints)),
    status: findColumnIndex(headers, mergeAliases(columnAliases.status, hints?.statusColumnHints)),
    approvalNo: findColumnIndex(headers, columnAliases.approvalNo),
    cardName: findColumnIndex(headers, columnAliases.cardName),
  };
}

function findHeaderRowIndex(rows: CellValue[][], hints?: InstitutionParserHints) {
  let bestIndex = -1;
  let bestScore = 0;

  rows.slice(0, 12).forEach((row, index) => {
    const headers = row.map((cell) => normalizeLooseText(cell));
    const mapping = buildColumnMapping(headers, hints);
    const score = Number(mapping.date >= 0) + Number(hasAmountColumn(mapping)) + Number(mapping.merchant >= 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 2 ? bestIndex : -1;
}

function detectFileInstitution(fileName: string, mapping: ColumnMapping, hints?: InstitutionParserHints): FileInstitution {
  const normalizedFileName = fileName.toLowerCase();
  const hasBankColumns = mapping.withdrawalAmount >= 0 || mapping.depositAmount >= 0;
  const hintedName = hints?.institutionName.trim();
  const hintedSource =
    hints?.parserKey === "hyundai-card"
      ? "hyundai-card-file"
      : hints?.parserKey === "bank-file"
        ? "bank-file"
        : "shinhan-file";

  if (hintedName) {
    return {
      name: hintedName,
      source: hintedSource,
      kind: hintedSource === "bank-file" ? "bank" : "card",
    };
  }

  const cardInstitution =
    normalizedFileName.includes("hyundai") || normalizedFileName.includes("현대")
      ? { name: "현대카드", source: "hyundai-card-file" as const }
      : { name: "신한카드", source: "shinhan-file" as const };
  const bankName =
    normalizedFileName.includes("kb") || normalizedFileName.includes("kbstar") || normalizedFileName.includes("국민")
      ? "국민은행"
      : normalizedFileName.includes("hana") || normalizedFileName.includes("keb") || normalizedFileName.includes("하나")
        ? "하나은행"
        : normalizedFileName.includes("toss") || normalizedFileName.includes("토스")
          ? "토스뱅크"
          : "";

  if (hasBankColumns || bankName) {
    return {
      name: bankName || "은행거래",
      source: "bank-file",
      kind: "bank",
    };
  }

  return {
    name: cardInstitution.name,
    source: cardInstitution.source,
    kind: "card",
  };
}

function mergeAliases(baseAliases: string[], hintAliases: string[] | undefined) {
  return [...(hintAliases ?? []), ...baseAliases].filter(Boolean);
}
```

- [ ] **Step 5: Run parser tests.**

Run.

```powershell
npx playwright test tests/shinhan-file-parser-hints.spec.ts
```

Expected.

```text
1 passed
```

- [ ] **Step 6: Run existing import-related build check.**

Run.

```powershell
npm run build
```

Expected.

```text
✓ built
```

- [ ] **Step 7: Commit parser hint integration.**

Run.

```powershell
git add src/features/import-guide/parser-hints.ts src/features/import-guide/shinhan-file-parser.ts tests/shinhan-file-parser-hints.spec.ts
git commit -m "feat: apply institution parser hints"
```

Expected.

```text
[main <sha>] feat: apply institution parser hints
```

---

### Task 6: Dynamic Import Guide UI

**Files:**
- Modify: `src/features/import-guide/ShinhanImportGuideScreen.tsx`.

- [ ] **Step 1: Import institution catalog helpers.**

Add imports.

```ts
import { RefreshCw } from "lucide-react";
import { useInstitutionCatalog } from "../institutions/use-institution-catalog";
import type { InstitutionConfig } from "../institutions/institution-types";
import { toParserHints } from "./parser-hints";
```

Keep existing icon imports and include `RefreshCw` in the lucide import list.

- [ ] **Step 2: Add selected institution state.**

Inside `ShinhanImportGuideScreen`, add catalog state before file preview state.

```ts
const { catalog, isLoading: isLoadingInstitutions, error: institutionError, refresh } = useInstitutionCatalog();
const institutions = catalog.institutions;
const [selectedInstitutionName, setSelectedInstitutionName] = useState("");
const selectedInstitution = institutions.find((institution) => institution.name === selectedInstitutionName) ?? institutions[0];
```

Add an effect after state declarations.

```ts
useEffect(() => {
  if (!selectedInstitutionName && institutions[0]) {
    setSelectedInstitutionName(institutions[0].name);
  }
}, [institutions, selectedInstitutionName]);
```

Also add `useEffect` to the React import.

```ts
import { ChangeEvent, DragEvent, useEffect, useState } from "react";
```

- [ ] **Step 3: Pass parser hints into file parsing.**

Change `processFile`.

```ts
const candidates = await parseShinhanTransactionFile(
  file,
  selectedInstitution ? toParserHints(selectedInstitution) : undefined,
);
```

- [ ] **Step 4: Replace hardcoded institution links with catalog links.**

Replace the link mapping block with this.

```tsx
<div className="mt-4 flex flex-wrap gap-2">
  {institutions.map((institution) => (
    <a
      key={institution.name}
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-moss px-4 text-sm font-medium text-white transition-colors hover:bg-moss-hover"
      href={institution.homepageUrl || institution.mobileAppUrl}
      target="_blank"
      rel="noreferrer"
    >
      <ExternalLink size={16} aria-hidden="true" />
      {institution.name}
    </a>
  ))}
</div>
```

- [ ] **Step 5: Add institution selector and sync status above file input.**

Inside the file import `SectionPanel`, before the file input `FormField`, insert.

```tsx
<div className="grid gap-3 rounded-lg border border-line bg-field p-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div>
      <p className="text-sm font-semibold text-ink">금융기관 설정</p>
      <p className="text-xs text-muted">
        {catalog.source === "remote" ? "Notion 최신 정보" : catalog.source === "cache" ? "저장된 Notion 캐시" : "내장 기본값"} ·{" "}
        {new Date(catalog.fetchedAt).toLocaleString("ko-KR")}
      </p>
    </div>
    <Button size="sm" variant="secondary" onClick={() => void refresh()} disabled={isLoadingInstitutions}>
      <RefreshCw size={15} aria-hidden="true" />
      새로고침
    </Button>
  </div>
  {institutionError ? <p className="text-sm text-coral">{institutionError}</p> : null}
  <FormField label="가져올 금융기관">
    <select
      className="h-10 rounded-lg border border-line bg-field px-3 text-sm"
      value={selectedInstitution?.name ?? ""}
      onChange={(event) => setSelectedInstitutionName(event.target.value)}
    >
      {institutions.map((institution) => (
        <option key={institution.name} value={institution.name}>
          {institution.name}
        </option>
      ))}
    </select>
  </FormField>
  {selectedInstitution ? <InstitutionHintSummary institution={selectedInstitution} /> : null}
</div>
```

- [ ] **Step 6: Add `InstitutionHintSummary` helper component at the bottom of the file.**

```tsx
function InstitutionHintSummary({ institution }: { institution: InstitutionConfig }) {
  return (
    <div className="grid gap-2 text-sm text-muted">
      <p>
        지원 형식 <span className="font-semibold text-ink">{institution.supportedFormats.join(", ") || "미지정"}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {institution.requiredColumns.map((column) => (
          <span key={column} className="rounded-md bg-moss-soft px-2 py-1 text-xs font-medium text-moss">
            {column}
          </span>
        ))}
      </div>
      {institution.notes ? <p className="leading-6">{institution.notes}</p> : null}
    </div>
  );
}
```

- [ ] **Step 7: Replace guide panels with selected institution steps.**

Replace the two `GuideStepsPanel` calls with.

```tsx
{selectedInstitution ? (
  <div className="grid gap-5 xl:grid-cols-2">
    <GuideStepsPanel
      eyebrow="PC"
      title={`${selectedInstitution.name} PC에서 받기`}
      steps={toGuideSteps(selectedInstitution.pcSteps)}
      linkLabel={`${selectedInstitution.name} 열기`}
      linkHref={selectedInstitution.homepageUrl || selectedInstitution.mobileAppUrl}
    />
    <GuideStepsPanel
      eyebrow="Mobile"
      title={`${selectedInstitution.name} 모바일에서 찾기`}
      steps={toGuideSteps(selectedInstitution.mobileSteps)}
      linkLabel={`${selectedInstitution.name} 모바일`}
      linkHref={selectedInstitution.mobileAppUrl || selectedInstitution.homepageUrl}
    />
  </div>
) : null}
```

Add helper.

```ts
function toGuideSteps(steps: string[]): Step[] {
  return steps.map((step, index) => ({
    title: `${index + 1}. ${step}`,
    description: step,
    detail: "",
  }));
}
```

- [ ] **Step 8: Replace required columns list with selected institution columns.**

Change the `requiredColumns.map` call to.

```tsx
{(selectedInstitution?.requiredColumns ?? requiredColumns).map((column) => (
  <div key={column} className="flex items-center gap-2 rounded-lg border border-line bg-field px-3 py-2 text-sm">
    <CheckCircle2 className="text-mint" size={16} aria-hidden="true" />
    <span>{column}</span>
  </div>
))}
```

- [ ] **Step 9: Run build.**

Run.

```powershell
npm run build
```

Expected.

```text
✓ built
```

- [ ] **Step 10: Commit dynamic UI.**

Run.

```powershell
git add src/features/import-guide/ShinhanImportGuideScreen.tsx
git commit -m "feat: render import guide from institution catalog"
```

Expected.

```text
[main <sha>] feat: render import guide from institution catalog
```

---

### Task 7: Documentation and Setup Guide

**Files:**
- Create: `docs/notion-institution-cms.md`.

- [ ] **Step 1: Create setup guide.**

```md
# Notion 금융기관 CMS 설정

## Notion 데이터베이스

데이터베이스 이름은 `Financial Institutions`로 둔다.

필수 속성.

- `Name`. Title.
- `Institution Type`. Select. 값은 `card`, `bank`, `pay`.
- `Enabled`. Checkbox.
- `Sort Order`. Number.
- `Parser Key`. Text.
- `Homepage URL`. URL.
- `Mobile App URL`. URL.
- `Supported Formats`. Multi-select.
- `Required Columns`. Multi-select.
- `Date Column Hints`. Multi-select.
- `Amount Column Hints`. Multi-select.
- `Merchant Column Hints`. Multi-select.
- `Status Column Hints`. Multi-select.
- `PC Steps`. Text. 줄바꿈으로 단계 구분.
- `Mobile Steps`. Text. 줄바꿈으로 단계 구분.
- `Notes`. Text.

## Notion connection

1. Notion developer portal에서 internal connection을 만든다.
2. connection capability는 읽기 권한만 사용한다.
3. `Financial Institutions` 데이터베이스 또는 parent page를 connection에 공유한다.
4. token은 앱이나 GitHub Pages에 넣지 않는다.

## Cloudflare Worker local secrets

로컬 개발 전 `.dev.vars`를 만든다.

```dotenv
NOTION_TOKEN=ntn_your_local_token
NOTION_DATA_SOURCE_ID=your_notion_data_source_id
NOTION_VERSION=2026-03-11
ALLOWED_ORIGIN=http://localhost:5173
```

## Cloudflare Worker production secrets

```powershell
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATA_SOURCE_ID
```

## React app environment

로컬 앱 실행 전 `.env.local`을 만든다.

```dotenv
VITE_INSTITUTION_CMS_URL=http://localhost:8787/institutions
```

GitHub Pages 배포 환경에서는 repository secret 또는 build 환경에 production Worker URL을 넣는다.

```dotenv
VITE_INSTITUTION_CMS_URL=https://household-account-institution-cms.<account>.workers.dev/institutions
```

## 보안 기준

- Notion token은 브라우저 저장소에 저장하지 않는다.
- Notion에는 거래 데이터, 계좌번호, 카드번호, 로그인 정보, API token을 넣지 않는다.
- Worker 응답은 금융기관 안내와 파서 힌트만 포함한다.
```

- [ ] **Step 2: Commit docs.**

Run.

```powershell
git add docs/notion-institution-cms.md
git commit -m "docs: add Notion institution CMS setup"
```

Expected.

```text
[main <sha>] docs: add Notion institution CMS setup
```

---

### Task 8: End-to-End Verification

**Files:**
- Modify: `checklist.md`.
- Modify: `context-notes.md`.

- [ ] **Step 1: Run unit tests.**

Run.

```powershell
npx playwright test tests/notion-institution-normalizer.spec.ts tests/institution-service.spec.ts tests/shinhan-file-parser-hints.spec.ts
```

Expected.

```text
6 passed
```

- [ ] **Step 2: Run full build.**

Run.

```powershell
npm run build
```

Expected.

```text
✓ built
```

- [ ] **Step 3: Run Worker local smoke test.**

Run.

```powershell
npm run worker:dev
```

In another terminal.

```powershell
Invoke-WebRequest -Uri http://localhost:8787/institutions | Select-Object -ExpandProperty StatusCode
```

Expected.

```text
200
```

- [ ] **Step 4: Run app local smoke test.**

Run.

```powershell
$env:VITE_INSTITUTION_CMS_URL='http://localhost:8787/institutions'; npm run dev
```

Open `http://127.0.0.1:5173/`.

Expected.

```text
가져오기 화면에서 기관 selector와 Notion 정보 새로고침 버튼이 보인다.
```

- [ ] **Step 5: Update work log.**

Append to `checklist.md`.

```md
## Notion 금융기관 CMS 구현

- [x] Worker tooling을 추가했다.
- [x] Notion 기관 설정 normalizer를 테스트와 함께 추가했다.
- [x] `/institutions` Worker API를 추가했다.
- [x] React 앱에서 Worker 기관 설정을 읽고 캐시한다.
- [x] 파일 파서가 읽기 전용 column hint를 받는다.
- [x] 가져오기 화면이 기관 설정 기반으로 안내 문구를 표시한다.
- [x] 설정 문서를 작성했다.
- [x] 단위 테스트와 빌드를 통과했다.
```

Append to `context-notes.md`.

```md
## Notion 금융기관 CMS 구현 결과

- Notion token은 Worker secret에만 보관하고 브라우저에는 노출하지 않는 구조로 구현했다.
- Worker는 Notion `Financial Institutions` 데이터를 정규화해 `/institutions` JSON으로 반환한다.
- 앱은 Worker 응답을 캐시하고 실패 시 캐시 또는 내장 fallback을 사용한다.
- 파서는 Notion의 column hints를 header alias 후보로만 사용한다.
- 금액 부호, 승인 취소, 중복 판단, 거래 저장 검증은 기존 코드 책임으로 유지했다.
- 거래 데이터는 Notion으로 보내지 않고 private GitHub sync 흐름과 분리했다.
```

- [ ] **Step 6: Commit verification log.**

Run.

```powershell
git add checklist.md context-notes.md
git commit -m "docs: record Notion institution CMS implementation"
```

Expected.

```text
[main <sha>] docs: record Notion institution CMS implementation
```

---

## Self-Review Checklist

- Spec coverage.
  - Notion as financial institution CMS is covered by Tasks 2, 3, and 7.
  - Worker-held token is covered by Tasks 1, 3, and 7.
  - Always-current iPhone UI is covered by Tasks 4, 6, and 8.
  - Browser file parsing with Notion hints is covered by Task 5.
  - Notion not storing transactions is covered by Tasks 6, 7, and 8.

- Type consistency.
  - Worker and app both use `InstitutionCatalog`, `InstitutionConfig`, `parserKey`, `dateColumnHints`, `amountColumnHints`, `merchantColumnHints`, and `statusColumnHints`.
  - Parser uses `InstitutionParserHints` converted by `toParserHints`.
  - Worker env uses `NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`, `NOTION_VERSION`, and `ALLOWED_ORIGIN`.

- Verification.
  - New unit tests cover Notion normalization, app catalog fallback, and parser hints.
  - `npm run build` verifies app TypeScript and Vite production build.
  - `npm run worker:dev` verifies Worker secret and Notion connectivity locally.
