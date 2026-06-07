// 가계부 백업 JSON을 Notion page 생성 요청으로 변환합니다.
export type BackupPayload = {
  version: 1;
  exportedAt: string;
  categories: unknown[];
  transactions: unknown[];
};

export type NotionBackupPagePayload = {
  parent: {
    data_source_id: string;
  };
  properties: {
    Name: {
      title: Array<{
        type: "text";
        text: {
          content: string;
        };
      }>;
    };
    Enabled: {
      checkbox: false;
    };
  };
  markdown: string;
};

export const MAX_NOTION_BACKUP_JSON_CHARS = 450_000;

export function parseBackupPayload(raw: unknown): BackupPayload | null {
  if (!isRecord(raw)) return null;

  if (
    raw.version !== 1 ||
    typeof raw.exportedAt !== "string" ||
    !Array.isArray(raw.categories) ||
    !Array.isArray(raw.transactions)
  ) {
    return null;
  }

  return {
    version: 1,
    exportedAt: raw.exportedAt,
    categories: raw.categories,
    transactions: raw.transactions,
  };
}

export function buildNotionBackupPagePayload(
  dataSourceId: string,
  backup: BackupPayload,
  syncedAt: string,
): NotionBackupPagePayload {
  const backupJson = JSON.stringify(backup, null, 2);

  if (backupJson.length > MAX_NOTION_BACKUP_JSON_CHARS) {
    throw new Error("Backup JSON is too large for a single Notion page request.");
  }

  return {
    parent: {
      data_source_id: dataSourceId,
    },
    properties: {
      Name: {
        title: [
          {
            type: "text",
            text: {
              content: `Household account backup ${formatBackupTitleDate(backup.exportedAt)}`,
            },
          },
        ],
      },
      Enabled: {
        checkbox: false,
      },
    },
    markdown: [
      "# Household account backup",
      "",
      `- Exported at: ${backup.exportedAt}`,
      `- Synced at: ${syncedAt}`,
      `- 카테고리 ${backup.categories.length}개`,
      `- 거래 ${backup.transactions.length}건`,
      "",
      "```json",
      backupJson,
      "```",
    ].join("\n"),
  };
}

function formatBackupTitleDate(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
