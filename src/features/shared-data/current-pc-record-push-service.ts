// 현재 PC 기록을 GitHub와 Notion으로 순차 동기화합니다.
import {
  loadNotionBackupWriteKey,
  pushCurrentBackupToNotion,
  type NotionBackupOptions,
  type NotionBackupProgress,
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
  pushNotion?: (writeKey: string, options?: NotionBackupOptions) => Promise<NotionBackupResult>;
  onProgress?: (progress: CurrentPcRecordPushProgress) => void;
};

export type CurrentPcRecordPushProgress =
  | { phase: "github_start" }
  | { phase: "github_success"; result: GitHubSharedDataPushResult }
  | { phase: "notion_start" }
  | { phase: "notion_batch"; progress: NotionBackupProgress };

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
  actions.onProgress?.({ phase: "github_start" });
  const gitHub = await pushGitHub(settings);
  actions.onProgress?.({ phase: "github_success", result: gitHub });

  try {
    actions.onProgress?.({ phase: "notion_start" });
    const notionResult = await pushNotion(getNotionKey(), {
      onBatchComplete: (progress) => actions.onProgress?.({ phase: "notion_batch", progress }),
    });

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

export function formatCurrentPcRecordPushProgress(progress: CurrentPcRecordPushProgress) {
  if (progress.phase === "github_start") {
    return "현재 PC 기록을 GitHub Pages 공유 파일로 커밋하는 중입니다.";
  }

  if (progress.phase === "github_success") {
    return `GitHub Pages 공유 파일 push 완료. 거래 ${progress.result.transactions}건. 이어서 Notion에 기록합니다.`;
  }

  if (progress.phase === "notion_start") {
    return "GitHub push 완료. Notion 백업 기록을 시작합니다.";
  }

  return `Notion에 기록 중입니다. batch ${progress.progress.batchCount} 완료. 거래 처리 ${progress.progress.processed ?? 0}/${progress.progress.transactions}건, 생성 ${progress.progress.created}건, 업데이트 ${progress.progress.updated}건, 정리 ${progress.progress.legacyRemoved}건.`;
}
