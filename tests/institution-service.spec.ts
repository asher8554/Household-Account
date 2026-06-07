// 기관 카탈로그 서비스의 선택과 폴백 동작을 검증합니다.
import { expect, test } from "@playwright/test";
import { saveCachedInstitutionCatalog } from "../src/features/institutions/institution-cache-service";
import { fallbackInstitutionCatalog } from "../src/features/institutions/institution-fallbacks";
import { loadInstitutionCatalog, selectInstitutionCatalog } from "../src/features/institutions/institution-service";
import type {
  InstitutionCatalog,
  InstitutionCatalogSource,
  InstitutionConfig,
} from "../src/features/institutions/institution-types";

const cacheKey = "household-account:institution-catalog:v1";
const fetchedAt = "2026-06-07T00:00:00.000Z";

function institution(overrides: Partial<InstitutionConfig> = {}): InstitutionConfig {
  return {
    name: "테스트 카드",
    institutionType: "card",
    enabled: true,
    sortOrder: 1,
    parserKey: "test-card",
    homepageUrl: "https://example.com",
    mobileAppUrl: "https://example.com/app",
    supportedFormats: ["csv"],
    requiredColumns: ["이용일자", "이용금액", "가맹점명"],
    dateColumnHints: ["이용일자"],
    amountColumnHints: ["이용금액"],
    merchantColumnHints: ["가맹점명"],
    statusColumnHints: ["상태"],
    pcSteps: ["1. 홈페이지에서 이용내역을 내려받습니다."],
    mobileSteps: ["1. 앱에서 이용내역을 공유합니다."],
    notes: "테스트용 기관입니다.",
    updatedAt: fetchedAt,
    ...overrides,
  };
}

function catalog(
  source: InstitutionCatalogSource,
  institutions: InstitutionConfig[],
): InstitutionCatalog {
  return {
    version: 1,
    fetchedAt,
    source,
    institutions,
  };
}

function createStorage(initialValues: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initialValues));

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function installWindowStorage(storage = createStorage()) {
  const browserGlobal = globalThis as typeof globalThis & {
    window?: { localStorage: Storage };
  };
  const hadWindow = Object.prototype.hasOwnProperty.call(browserGlobal, "window");
  const previousWindow = browserGlobal.window;

  Object.defineProperty(browserGlobal, "window", {
    value: { localStorage: storage },
    configurable: true,
  });

  return {
    storage,
    restore() {
      if (hadWindow) {
        Object.defineProperty(browserGlobal, "window", {
          value: previousWindow,
          configurable: true,
        });
        return;
      }

      Reflect.deleteProperty(browserGlobal, "window");
    },
  };
}

test("selectInstitutionCatalog prefers non-empty remote, then cache, then fallback", () => {
  const remote = catalog("remote", [institution({ name: "원격 카드" })]);
  const cached = catalog("cache", [institution({ name: "캐시 카드" })]);
  const fallback = catalog("fallback", [institution({ name: "기본 카드" })]);

  expect(selectInstitutionCatalog(remote, cached, fallback)).toBe(remote);
  expect(selectInstitutionCatalog(catalog("remote", []), cached, fallback)).toBe(cached);
  expect(selectInstitutionCatalog(catalog("remote", []), catalog("cache", []), fallback)).toBe(fallback);
});

test("loadInstitutionCatalog returns cached catalog when Worker URL is missing", async () => {
  const { restore } = installWindowStorage();
  const cached = catalog("remote", [institution({ name: "저장된 카드" })]);

  try {
    saveCachedInstitutionCatalog(cached);

    const loaded = await loadInstitutionCatalog();

    expect(loaded.source).toBe("cache");
    expect(loaded.institutions.map((item) => item.name)).toEqual(["저장된 카드"]);
  } finally {
    restore();
  }
});

test("loadInstitutionCatalog falls back when cache is unavailable or corrupt", async () => {
  const noStorageCatalog = await loadInstitutionCatalog();

  expect(noStorageCatalog).toBe(fallbackInstitutionCatalog);
  expect(noStorageCatalog.source).toBe("fallback");

  const { storage, restore } = installWindowStorage();

  try {
    storage.setItem(cacheKey, "{");

    const corruptCacheCatalog = await loadInstitutionCatalog();

    expect(corruptCacheCatalog).toBe(fallbackInstitutionCatalog);
    expect(corruptCacheCatalog.institutions.length).toBeGreaterThan(0);
  } finally {
    restore();
  }
});
