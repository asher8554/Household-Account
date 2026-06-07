// Notion 백업 Worker 호출과 브라우저 저장 키를 관리합니다.
import type { BackupFile } from "./backup-types";
import { createBackupData } from "./backup-service";

const NOTION_BACKUP_KEY_STORAGE_KEY = "household-account:notion-backup-write-key";

export type NotionBackupResult = {
  version: 1;
  syncedAt: string;
  created: number;
  updated: number;
  legacyRemoved: number;
  categories: number;
  transactions: number;
};

export function loadNotionBackupWriteKey() {
  try {
    return localStorage.getItem(NOTION_BACKUP_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveNotionBackupWriteKey(value: string) {
  try {
    localStorage.setItem(NOTION_BACKUP_KEY_STORAGE_KEY, value.trim());
  } catch {
    // localStorage가 막혀도 현재 입력값으로는 push를 계속 시도할 수 있습니다.
  }
}

export async function pushCurrentBackupToNotion(writeKey: string) {
  const backup = await createBackupData();

  return pushBackupToNotion(backup, writeKey);
}

export async function pushBackupToNotion(backup: BackupFile, writeKey: string): Promise<NotionBackupResult> {
  const endpoint = getNotionBackupEndpoint();
  const normalizedKey = writeKey.trim();

  if (!endpoint) {
    throw new Error("Notion 백업 Worker URL이 설정되지 않았습니다.");
  }

  if (!normalizedKey) {
    throw new Error("Notion 백업 키를 입력하세요.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Household-Backup-Key": normalizedKey,
    },
    body: JSON.stringify(backup),
  });

  const payload = await safeJson(response);

  if (!response.ok) {
    throw new Error(getNotionBackupErrorMessage(payload, response.status));
  }

  return parseNotionBackupResult(payload);
}

export function getNotionBackupEndpoint(workerUrl = import.meta.env.VITE_INSTITUTION_CMS_URL ?? "") {
  const normalizedUrl = workerUrl.trim();

  if (!normalizedUrl) {
    return "";
  }

  try {
    const url = new URL(normalizedUrl);
    url.pathname = url.pathname.replace(/\/institutions\/?$/, "/backups");

    if (!url.pathname.endsWith("/backups")) {
      url.pathname = `${url.pathname.replace(/\/$/, "")}/backups`;
    }

    return url.toString();
  } catch {
    return "";
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseNotionBackupResult(raw: unknown): NotionBackupResult {
  if (!isRecord(raw) || raw.version !== 1) {
    throw new Error("Notion 백업 응답 형식이 올바르지 않습니다.");
  }

  if (
    typeof raw.syncedAt !== "string" ||
    typeof raw.created !== "number" ||
    typeof raw.updated !== "number" ||
    typeof raw.legacyRemoved !== "number" ||
    typeof raw.categories !== "number" ||
    typeof raw.transactions !== "number"
  ) {
    throw new Error("Notion 백업 응답 형식이 올바르지 않습니다.");
  }

  return {
    version: 1,
    syncedAt: raw.syncedAt,
    created: raw.created,
    updated: raw.updated,
    legacyRemoved: raw.legacyRemoved,
    categories: raw.categories,
    transactions: raw.transactions,
  };
}

function getNotionBackupErrorMessage(raw: unknown, status: number) {
  const error = isRecord(raw) && typeof raw.error === "string" ? raw.error : "";

  if (error === "worker_not_configured") {
    return "Notion 백업 Worker secret 설정이 필요합니다.";
  }

  if (error === "unauthorized" || status === 401) {
    return "Notion 백업 키가 맞지 않습니다.";
  }

  if (error === "backup_json_too_large" || status === 413) {
    return "백업 JSON이 커서 Notion page 하나에 기록할 수 없습니다.";
  }

  if (error === "invalid_backup_json") {
    return "백업 JSON 형식이 올바르지 않습니다.";
  }

  if (error === "notion_rate_limited") {
    return "Notion 요청 제한에 걸렸습니다. 잠시 뒤 다시 시도하세요.";
  }

  if (error === "notion_backup_schema_read_failed") {
    return withNotionStatus(
      "Notion data source를 읽지 못했습니다. data source ID와 integration 공유를 확인하세요.",
      raw,
    );
  }

  if (error === "notion_backup_schema_update_failed") {
    return withNotionStatus(
      "Notion data source 컬럼 추가에 실패했습니다. integration의 Update Content 권한을 확인하세요.",
      raw,
    );
  }

  if (error === "notion_backup_page_query_failed") {
    return withNotionStatus(
      "Notion 백업 행 조회에 실패했습니다. data source 공유와 읽기 권한을 확인하세요.",
      raw,
    );
  }

  if (error === "notion_backup_page_create_failed") {
    return withNotionStatus(
      "Notion 백업 행 생성에 실패했습니다. integration의 Insert Content 권한과 컬럼 타입을 확인하세요.",
      raw,
    );
  }

  if (error === "notion_backup_page_update_failed" || error === "notion_backup_legacy_cleanup_failed") {
    return withNotionStatus(
      "Notion 백업 행 수정에 실패했습니다. integration의 Update Content 권한과 컬럼 타입을 확인하세요.",
      raw,
    );
  }

  return withNotionStatus("Notion 백업 기록에 실패했습니다.", raw);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function withNotionStatus(message: string, raw: unknown) {
  const notionStatus = isRecord(raw) && typeof raw.notionStatus === "number" ? raw.notionStatus : null;
  const notionCode = isRecord(raw) && typeof raw.notionCode === "string" ? raw.notionCode : "";
  const notionMessage = isRecord(raw) && typeof raw.notionMessage === "string" ? raw.notionMessage : "";
  const detail = [notionStatus ? `Notion HTTP ${notionStatus}` : "", notionCode, notionMessage]
    .filter(Boolean)
    .join(" · ");

  return detail ? `${message} ${detail}.` : message;
}
