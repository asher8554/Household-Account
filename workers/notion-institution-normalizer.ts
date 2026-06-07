// Notion 기관 설정 페이지를 앱 설정으로 정규화합니다.
import type {
  InstitutionCatalog,
  InstitutionConfig,
  InstitutionType,
  NotionInstitutionPage,
  NotionInstitutionProperty,
  NotionTextFragment,
} from "./notion-institution-types";

const koreanCollator = createKoreanCollator();

export function normalizeNotionInstitutionPages(
  pages: NotionInstitutionPage[],
  fetchedAt: string,
): InstitutionCatalog {
  const institutions = pages
    .map((page) => normalizePage(page, fetchedAt))
    .filter((institution): institution is InstitutionConfig => institution !== null)
    .sort(compareInstitutions);

  return {
    version: 1,
    fetchedAt,
    institutions,
  };
}

function normalizePage(
  page: NotionInstitutionPage,
  fetchedAt: string,
): InstitutionConfig | null {
  const properties = page.properties ?? {};
  const name = titleValue(properties.Name);
  const enabled = checkboxValue(properties.Enabled, true);

  if (!enabled || !name) {
    return null;
  }

  return {
    name,
    institutionType: institutionTypeValue(properties["Institution Type"]),
    enabled,
    sortOrder: numberValue(properties["Sort Order"]),
    parserKey: singleValueProperty(properties["Parser Key"]),
    homepageUrl: urlValue(properties["Homepage URL"]),
    mobileAppUrl: urlValue(properties["Mobile App URL"]),
    supportedFormats: multiSelectValue(properties["Supported Formats"]),
    requiredColumns: multiSelectValue(properties["Required Columns"]),
    dateColumnHints: multiSelectValue(properties["Date Column Hints"]),
    amountColumnHints: multiSelectValue(properties["Amount Column Hints"]),
    merchantColumnHints: multiSelectValue(properties["Merchant Column Hints"]),
    statusColumnHints: multiSelectValue(properties["Status Column Hints"]),
    pcSteps: stepValue(properties["PC Steps"]),
    mobileSteps: stepValue(properties["Mobile Steps"]),
    notes: richTextValue(properties.Notes),
    updatedAt: normalizeSingleLine(page.last_edited_time ?? "") || fetchedAt,
  };
}

function compareInstitutions(a: InstitutionConfig, b: InstitutionConfig): number {
  const sortOrderDiff = a.sortOrder - b.sortOrder;

  if (sortOrderDiff !== 0) {
    return sortOrderDiff;
  }

  return koreanCollator?.compare(a.name, b.name) ?? a.name.localeCompare(b.name);
}

function titleValue(property: NotionInstitutionProperty | undefined): string {
  return normalizeSingleLine(textFragmentsValue(property?.title));
}

function richTextValue(property: NotionInstitutionProperty | undefined): string {
  return normalizeSingleLine(textFragmentsValue(property?.rich_text));
}

function singleValueProperty(property: NotionInstitutionProperty | undefined): string {
  return (
    richTextValue(property) ||
    normalizeSingleLine(property?.select?.name ?? "") ||
    normalizeSingleLine(property?.status?.name ?? "") ||
    multiSelectValue(property)[0] ||
    ""
  );
}

function stepValue(property: NotionInstitutionProperty | undefined): string[] {
  return textFragmentsValue(property?.rich_text)
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function institutionTypeValue(property: NotionInstitutionProperty | undefined): InstitutionType {
  const value = normalizeSingleLine(property?.select?.name ?? "");

  if (isInstitutionType(value)) {
    return value;
  }

  return "card";
}

function checkboxValue(
  property: NotionInstitutionProperty | undefined,
  defaultValue: boolean,
): boolean {
  return typeof property?.checkbox === "boolean" ? property.checkbox : defaultValue;
}

function numberValue(property: NotionInstitutionProperty | undefined): number {
  return typeof property?.number === "number" && Number.isFinite(property.number)
    ? property.number
    : 0;
}

function urlValue(property: NotionInstitutionProperty | undefined): string {
  return normalizeSingleLine(property?.url ?? "");
}

function multiSelectValue(property: NotionInstitutionProperty | undefined): string[] {
  return (property?.multi_select ?? [])
    .map((option) => normalizeSingleLine(option.name ?? ""))
    .filter(Boolean);
}

function textFragmentsValue(fragments: NotionTextFragment[] | undefined): string {
  return fragments?.map((fragment) => fragment.plain_text ?? fragment.text?.content ?? "").join("") ?? "";
}

function normalizeSingleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isInstitutionType(value: string): value is InstitutionType {
  return value === "card" || value === "bank" || value === "pay";
}

function createKoreanCollator(): Intl.Collator | null {
  try {
    return new Intl.Collator("ko-KR", {
      numeric: true,
      sensitivity: "base",
    });
  } catch {
    return null;
  }
}
