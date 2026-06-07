// GitHub Contents API로 공개 공유 데이터 파일을 커밋합니다.
import { createBackupData } from "../backup/backup-service";

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
};

type GitHubCommitResponse = {
  commit?: {
    sha?: string;
    html_url?: string;
  };
};

const settingsKey = "household-account-github-shared-data-settings";
const unsafeAppRepositoryOwner = "asher8554";
const unsafeAppRepositoryName = "Household-Account";
const unsafePublicSharedDataPath = "public/shared-data.json";

export const defaultGitHubSharedDataSettings: GitHubSharedDataSettings = {
  owner: "asher8554",
  repo: "Household-Account-Data",
  branch: "main",
  path: "data/household-account.json",
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

export function isUnsafePublicSharedDataTarget(settings: GitHubSharedDataSettings) {
  const normalizedSettings = normalizeSettings(settings);
  const normalizedPath = normalizedSettings.path.replace(/\\/g, "/").toLowerCase();

  return (
    normalizedSettings.owner.toLowerCase() === unsafeAppRepositoryOwner.toLowerCase() &&
    normalizedSettings.repo.toLowerCase() === unsafeAppRepositoryName.toLowerCase() &&
    normalizedPath === unsafePublicSharedDataPath
  );
}

export async function pushCurrentSharedDataToGitHub(
  settings: GitHubSharedDataSettings,
): Promise<GitHubSharedDataPushResult> {
  const normalizedSettings = normalizeSettings(settings);

  if (!hasGitHubSharedDataToken(normalizedSettings)) {
    throw new Error("GitHub 토큰을 먼저 저장하세요.");
  }

  if (isUnsafePublicSharedDataTarget(normalizedSettings)) {
    throw new Error("공개 GitHub Pages 파일로 거래 내역을 push하지 않습니다. private repo 경로를 사용하세요.");
  }

  const backup = await createBackupData();
  const content = encodeBase64Utf8(JSON.stringify(backup, null, 2));
  const apiUrl = getContentApiUrl(normalizedSettings);
  const headers = getGitHubHeaders(normalizedSettings.token);
  const existingSha = await fetchExistingContentSha(getContentApiUrl(normalizedSettings, true), headers);
  const response = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `data: shared-data ${backup.exportedAt.slice(0, 10)}`,
      content,
      branch: normalizedSettings.branch,
      sha: existingSha,
    }),
  });

  if (!response.ok) {
    throw new Error(await formatGitHubError(response, "GitHub 공유 데이터 push 실패."));
  }

  const result = (await response.json()) as GitHubCommitResponse;

  return {
    exportedAt: backup.exportedAt,
    transactions: backup.transactions.length,
    commitSha: result.commit?.sha ?? "",
    commitUrl: result.commit?.html_url ?? "",
  };
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

async function fetchExistingContentSha(apiUrl: string, headers: Record<string, string>) {
  const response = await fetch(apiUrl, { headers });

  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(await formatGitHubError(response, "GitHub 공유 데이터 파일 조회 실패."));
  }

  const content = (await response.json()) as GitHubContentResponse;
  return content.sha;
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

async function formatGitHubError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ? `${fallback} ${body.message}` : fallback;
  } catch {
    return fallback;
  }
}
