// 기관 카탈로그 클라이언트 타입과 페이로드 검증을 정의합니다.
export type InstitutionType = "card" | "bank" | "pay";

export type InstitutionCatalogSource = "remote" | "cache" | "fallback";

export interface InstitutionConfig {
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
}

export interface InstitutionCatalog {
  version: 1;
  fetchedAt: string;
  source: InstitutionCatalogSource;
  institutions: InstitutionConfig[];
}

export type InstitutionCatalogPayload = Omit<InstitutionCatalog, "source">;

export function parseInstitutionCatalogPayload(raw: unknown): InstitutionCatalogPayload | null {
  if (!isRecord(raw) || raw.version !== 1 || typeof raw.fetchedAt !== "string") {
    return null;
  }

  if (!Array.isArray(raw.institutions)) {
    return null;
  }

  const institutions: InstitutionConfig[] = [];

  for (const item of raw.institutions) {
    const institution = parseInstitutionConfig(item);

    if (!institution) {
      return null;
    }

    institutions.push(institution);
  }

  return {
    version: 1,
    fetchedAt: raw.fetchedAt,
    institutions,
  };
}

function parseInstitutionConfig(raw: unknown): InstitutionConfig | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (
    typeof raw.name !== "string" ||
    !isInstitutionType(raw.institutionType) ||
    typeof raw.enabled !== "boolean" ||
    typeof raw.sortOrder !== "number" ||
    !Number.isFinite(raw.sortOrder) ||
    typeof raw.parserKey !== "string" ||
    typeof raw.homepageUrl !== "string" ||
    typeof raw.mobileAppUrl !== "string" ||
    !isStringArray(raw.supportedFormats) ||
    !isStringArray(raw.requiredColumns) ||
    !isStringArray(raw.dateColumnHints) ||
    !isStringArray(raw.amountColumnHints) ||
    !isStringArray(raw.merchantColumnHints) ||
    !isStringArray(raw.statusColumnHints) ||
    !isStringArray(raw.pcSteps) ||
    !isStringArray(raw.mobileSteps) ||
    typeof raw.notes !== "string" ||
    typeof raw.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    name: raw.name,
    institutionType: raw.institutionType,
    enabled: raw.enabled,
    sortOrder: raw.sortOrder,
    parserKey: raw.parserKey,
    homepageUrl: raw.homepageUrl,
    mobileAppUrl: raw.mobileAppUrl,
    supportedFormats: raw.supportedFormats,
    requiredColumns: raw.requiredColumns,
    dateColumnHints: raw.dateColumnHints,
    amountColumnHints: raw.amountColumnHints,
    merchantColumnHints: raw.merchantColumnHints,
    statusColumnHints: raw.statusColumnHints,
    pcSteps: raw.pcSteps,
    mobileSteps: raw.mobileSteps,
    notes: raw.notes,
    updatedAt: raw.updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isInstitutionType(value: unknown): value is InstitutionType {
  return value === "card" || value === "bank" || value === "pay";
}
