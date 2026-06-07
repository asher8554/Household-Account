// Notion 기관 설정 정규화 타입을 정의합니다.
export type InstitutionType = "card" | "bank" | "pay";

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
  institutions: InstitutionConfig[];
}

export interface NotionTextFragment {
  plain_text?: string;
  text?: {
    content?: string;
  };
}

export interface NotionSelectOption {
  name?: string | null;
}

export interface NotionInstitutionProperty {
  title?: NotionTextFragment[];
  rich_text?: NotionTextFragment[];
  select?: NotionSelectOption | null;
  status?: NotionSelectOption | null;
  multi_select?: NotionSelectOption[];
  checkbox?: boolean;
  number?: number | null;
  url?: string | null;
}

export interface NotionInstitutionPage {
  id?: string;
  last_edited_time?: string;
  properties?: Record<string, NotionInstitutionProperty | undefined>;
}
