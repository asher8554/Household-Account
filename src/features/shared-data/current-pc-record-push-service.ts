// 현재 PC 기록을 GitHub와 Notion으로 순차 동기화합니다.
import {
  loadNotionBackupWriteKey,
  pushCurrentBackupToNotion,
  type NotionBackupResult,
} from "../backup/notion-backup-service";
import {
  pushCurrentSharedDataToGitHub,
  type GitHubSharedDataPushResult,
  type GitHubSharedDataSettings,
} from "./github-shared-data-service";

type PushCurrentPcRecordActions = {
  loadNotionBackupWriteKey?: () => string;
  pushGitHub?: (settings: GitHubSharedDataSettings) => Promise<GitHubSharedDataPushResult>;
  pushNotion?: (writeKey: string) => Promise<NotionBackupResult>;
};

export type CurrentPcRecordPushResult = {
  gitHub: GitHubSharedDataPushResult;
  notion:
    | {
        status: "success";
        result: NotionBackupResult;
      }
    | {
        status: "failed";
        message: string;
      };
};

export async function pushCurrentPcRecords(
  settings: GitHubSharedDataSettings,
  actions: PushCurrentPcRecordActions = {},
): Promise<CurrentPcRecordPushResult> {
  const pushGitHub = actions.pushGitHub ?? pushCurrentSharedDataToGitHub;
  const pushNotion = actions.pushNotion ?? pushCurrentBackupToNotion;
  const getNotionKey = actions.loadNotionBackupWriteKey ?? loadNotionBackupWriteKey;
  const gitHub = await pushGitHub(settings);

  try {
    const notionResult = await pushNotion(getNotionKey());

    return {
      gitHub,
      notion: {
        status: "success",
        result: notionResult,
      },
    };
  } catch (error) {
    return {
      gitHub,
      notion: {
        status: "failed",
        message: error instanceof Error ? error.message : "Notion 백업 기록에 실패했습니다.",
      },
    };
  }
}

export function formatCurrentPcRecordPushResult(result: CurrentPcRecordPushResult) {
  if (result.notion.status === "success") {
    return `현재 PC 기록 ${result.gitHub.transactions}건을 GitHub Pages 공유 파일에 push했고 Notion에도 거래 백업 ${result.notion.result.transactions}건을 기록했습니다.`;
  }

  return `현재 PC 기록 ${result.gitHub.transactions}건을 GitHub Pages 공유 파일에 push했습니다. Notion 기록은 실패했습니다. ${result.notion.message}`;
}
