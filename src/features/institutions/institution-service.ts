// 기관 카탈로그를 원격, 캐시, 기본값 순서로 불러옵니다.
import { loadCachedInstitutionCatalog, saveCachedInstitutionCatalog } from "./institution-cache-service";
import { fallbackInstitutionCatalog } from "./institution-fallbacks";
import {
  parseInstitutionCatalogPayload,
  type InstitutionCatalog,
  type InstitutionCatalogPayload,
} from "./institution-types";

export function selectInstitutionCatalog(
  remote: InstitutionCatalog | null,
  cached: InstitutionCatalog | null,
  fallback: InstitutionCatalog,
): InstitutionCatalog {
  if (hasInstitutions(remote)) {
    return remote;
  }

  if (hasInstitutions(cached)) {
    return cached;
  }

  return fallback;
}

export async function loadInstitutionCatalog(): Promise<InstitutionCatalog> {
  const workerUrl = getInstitutionCmsUrl();
  let remote: InstitutionCatalog | null = null;

  if (workerUrl) {
    remote = await fetchRemoteInstitutionCatalog(workerUrl);
  }

  const cached = loadCachedInstitutionCatalog();
  return selectInstitutionCatalog(remote, cached, fallbackInstitutionCatalog);
}

function hasInstitutions(catalog: InstitutionCatalog | null): catalog is InstitutionCatalog {
  return Boolean(catalog && catalog.institutions.length > 0);
}

function getInstitutionCmsUrl(): string {
  return (import.meta.env?.VITE_INSTITUTION_CMS_URL ?? "").trim();
}

async function fetchRemoteInstitutionCatalog(workerUrl: string): Promise<InstitutionCatalog | null> {
  try {
    const response = await fetch(workerUrl, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const payload = parseRemoteCatalogPayload(await response.json());

    if (!payload) {
      return null;
    }

    const catalog: InstitutionCatalog = {
      ...payload,
      source: "remote",
    };

    saveCachedInstitutionCatalog(catalog);
    return catalog;
  } catch {
    return null;
  }
}

function parseRemoteCatalogPayload(raw: unknown): InstitutionCatalogPayload | null {
  const payload = parseInstitutionCatalogPayload(raw);

  if (!payload || payload.institutions.length === 0) {
    return null;
  }

  return payload;
}
