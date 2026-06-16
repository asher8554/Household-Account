// GitHub Contents API로 공개 공유 데이터 파일을 커밋합니다.
import { createBackupData, importBackupData } from "../backup/backup-service";

export type GitHubSharedDataSettings = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
};

export type GitHubSharedDataPushResult = {
  exportedAt: string;
  transactions: number;
  commitSha: string;
  commitUrl: string;
};

type GitHubContentResponse = {
  sha?: string;
  content?: string;
  encoding?: string;
};

type GitHubCommitResponse = {
  commit?: {
    sha?: string;
    html_url?: string;
  };
};

const settingsKey = "household-account-github-shared-data-settings";
const maxGitHubContentUpdateAttempts = 2;

export const defaultGitHubSharedDataSettings: GitHubSharedDataSettings = {
  owner: "asher8554",
  repo: "Household-Account",
  branch: "main",
  path: "public/shared-data.json",
  token: "",
};

export function loadGitHubSharedDataSettings(): GitHubSharedDataSettings {
  const stored = window.localStorage.getItem(settingsKey);
  if (!stored) return defaultGitHubSharedDataSettings;

  try {
    return normalizeSettings({ ...defaultGitHubSharedDataSettings, ...JSON.parse(stored) });
  } catch {
    return defaultGitHubSharedDataSettings;
  }
}

export function saveGitHubSharedDataSettings(settings: GitHubSharedDataSettings) {
  window.localStorage.setItem(settingsKey, JSON.stringify(normalizeSettings(settings)));
}

export function clearGitHubSharedDataSettings() {
  window.localStorage.removeItem(settingsKey);
}

export function hasGitHubSharedDataToken(settings: GitHubSharedDataSettings) {
  return settings.token.trim().length > 0;
}

export async function pushCurrentSharedDataToGitHub(
  settings: GitHubSharedDataSettings,
): Promise<GitHubSharedDataPushResult> {
  const normalizedSettings = normalizeSettings(settings);

  if (!hasGitHubSharedDataToken(normalizedSettings)) {
    throw new Error("GitHub 토큰을 먼저 저장하세요.");
  }

  const apiUrl = getContentApiUrl(normalizedSettings);
  const headers = getGitHubHeaders(normalizedSettings.token);

  for (let attempt = 1; attempt <= maxGitHubContentUpdateAttempts; attempt += 1) {
    const existingContent = await fetchExistingContent(
      getContentApiUrl(normalizedSettings, true),
      headers,
      normalizedSettings,
    );

    if (existingContent.raw) {
      await importBackupData(existingContent.raw);
    }

    const backup = await createBackupData();
    const content = encodeBase64Utf8(JSON.stringify(backup, null, 2));
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `data: shared-data ${backup.exportedAt.slice(0, 10)}`,
        content,
        branch: normalizedSettings.branch,
        sha: existingContent.sha,
      }),
    });

    if (response.ok) {
      const result = (await response.json()) as GitHubCommitResponse;

      return {
        exportedAt: backup.exportedAt,
        transactions: backup.transactions.length,
        commitSha: result.commit?.sha ?? "",
        commitUrl: result.commit?.html_url ?? "",
      };
    }

    if (response.status === 409 && attempt < maxGitHubContentUpdateAttempts) {
      continue;
    }

    throw new Error(await formatGitHubError(response, "GitHub 공유 데이터 push 실패.", normalizedSettings));
  }

  throw new Error("GitHub 공유 데이터 push 실패. 다시 시도하세요.");
}

function normalizeSettings(settings: GitHubSharedDataSettings): GitHubSharedDataSettings {
  return {
    owner: settings.owner.trim() || defaultGitHubSharedDataSettings.owner,
    repo: settings.repo.trim() || defaultGitHubSharedDataSettings.repo,
    branch: settings.branch.trim() || defaultGitHubSharedDataSettings.branch,
    path: settings.path.trim() || defaultGitHubSharedDataSettings.path,
    token: settings.token.trim(),
  };
}

function getGitHubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function fetchExistingContent(
  apiUrl: string,
  headers: Record<string, string>,
  settings: GitHubSharedDataSettings,
) {
  const response = await fetch(apiUrl, { headers });

  if (response.status === 404) return { sha: undefined, raw: undefined };
  if (!response.ok) {
    throw new Error(await formatGitHubError(response, "GitHub 공유 데이터 파일 조회 실패.", settings));
  }

  const content = (await response.json()) as GitHubContentResponse;

  if (!content.content) {
    return { sha: content.sha, raw: undefined };
  }

  if (content.encoding && content.encoding !== "base64") {
    throw new Error("GitHub 공유 데이터 파일 조회 실패. GitHub 파일 인코딩이 base64가 아닙니다.");
  }

  return {
    sha: content.sha,
    raw: JSON.parse(decodeBase64Utf8(content.content)),
  };
}

function getContentApiUrl(settings: GitHubSharedDataSettings, includeRef = false) {
  const encodedPath = settings.path.split("/").map(encodeURIComponent).join("/");
  const url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${encodedPath}`,
  );

  if (includeRef) {
    url.searchParams.set("ref", settings.branch);
  }

  return url.toString();
}

function encodeBase64Utf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

function decodeBase64Utf8(value: string) {
  const binary = window.atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

async function formatGitHubError(response: Response, fallback: string, settings?: GitHubSharedDataSettings) {
  try {
    const body = (await response.json()) as { message?: string };
    const guidance = getGitHubErrorGuidance(response.status, body.message, settings);
    const gitHubMessage = body.message ? ` GitHub 응답은 ${body.message}` : "";

    return `${fallback} ${guidance}${gitHubMessage}`;
  } catch {
    return `${fallback} ${getGitHubErrorGuidance(response.status, undefined, settings)}`;
  }
}

function getGitHubErrorGuidance(status: number, message?: string, settings?: GitHubSharedDataSettings) {
  if (status === 401) {
    return "토큰이 만료되었거나 잘못되었습니다. GitHub 공유 설정에서 토큰을 새로 저장하세요.";
  }

  if (status === 403) {
    if (message?.toLowerCase().includes("resource not accessible")) {
      return "토큰 권한이 부족합니다. fine-grained token에서 Household-Account repo의 Contents 권한을 Read and write로 설정하세요.";
    }

    return "GitHub가 요청을 거부했습니다. 토큰 권한과 GitHub API 사용량 제한을 확인하세요.";
  }

  if (status === 404) {
    const target = settings ? `${settings.owner}/${settings.repo}/${settings.path}` : "공유 파일";

    return `저장 대상 ${target}을 찾지 못했습니다. owner, repository, branch, 공유 파일 경로 설정을 확인하세요.`;
  }

  if (status === 409) {
    return "다른 기기나 GitHub commit과 동시에 겹쳤습니다. 최신 파일 정보로 다시 시도했지만 실패했습니다. 페이지를 새로고침한 뒤 다시 누르세요.";
  }

  if (status === 422) {
    return "GitHub가 요청 내용을 처리하지 못했습니다. branch와 공유 파일 경로 설정을 확인하세요.";
  }

  return `GitHub API HTTP ${status} 오류입니다. 잠시 후 다시 시도하세요.`;
}
