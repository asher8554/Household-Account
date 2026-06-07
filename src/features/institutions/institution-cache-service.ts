// 기관 카탈로그를 브라우저 localStorage에 안전하게 캐시합니다.
import {
  parseInstitutionCatalogPayload,
  type InstitutionCatalog,
  type InstitutionCatalogPayload,
} from "./institution-types";

export const institutionCatalogStorageKey = "household-account:institution-catalog:v1";

export function saveCachedInstitutionCatalog(catalog: InstitutionCatalog): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload = toCatalogPayload(catalog);

    if (!payload) {
      return;
    }

    window.localStorage.setItem(institutionCatalogStorageKey, JSON.stringify(payload));
  } catch {
    return;
  }
}

export function loadCachedInstitutionCatalog(): InstitutionCatalog | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(institutionCatalogStorageKey);

    if (!raw) {
      return null;
    }

    const payload = parseInstitutionCatalogPayload(JSON.parse(raw));

    if (!payload) {
      return null;
    }

    return {
      ...payload,
      source: "cache",
    };
  } catch {
    return null;
  }
}

function toCatalogPayload(catalog: InstitutionCatalog): InstitutionCatalogPayload | null {
  return parseInstitutionCatalogPayload(catalog);
}
