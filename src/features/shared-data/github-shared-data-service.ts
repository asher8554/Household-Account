// GitHub Contents API로 공유 데이터 파일을 암호화해 커밋합니다.
import { createBackupData, importBackupData } from "../backup/backup-service";
import { backupFileSchema, type ParsedBackupFile } from "../backup/backup-schema";
import {
  decodeBase64Utf8,
  decryptEnvelopeWithPassphrase,
  encodeBase64Utf8,
  encryptTextWithPassphrase,
  isEncryptedPayloadEnvelope,
} from "../../lib/web-crypto";
import { formatKrw } from "../../lib/money";
import {
  clearSessionPassphrase,
  clearSessionToken,
  loadSessionPassphrase,
  loadSessionToken,
  saveSessionPassphrase,
  saveSessionToken,
} from "./sync-session-store";

export type GitHubSharedDataSettings = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
  passphrase: string;
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

// 원격 공유 데이터 대비 이 범위를 넘는 변화는 실수나 오염일 수 있어 커밋 전 확인을 요구합니다.
const minConfirmTransactionDelta = 30;
const maxSilentTransactionDeltaRatio = 0.25;
const minConfirmExpenseDelta = 500_000;
const maxSilentExpenseDeltaRatio = 0.4;

export const defaultGitHubSharedDataSettings: GitHubSharedDataSettings = {
  owner: "asher8554",
  repo: "Household-Account",
  branch: "main",
  path: "public/shared-data.json",
  token: "",
  passphrase: "",
};

export function loadGitHubSharedDataSettings(): GitHubSharedDataSettings {
  let stored: Record<string, unknown> = {};

  try {
    stored = JSON.parse(window.localStorage.getItem(settingsKey) ?? "{}") as Record<string, unknown>;
  } catch {
    stored = {};
  }

  // 과거 버전은 토큰·암호를 localStorage에 함께 저장했습니다. 발견하면 sessionStorage로 옮기고 흔적을 지웁니다.
  const legacyToken = typeof stored.token === "string" ? stored.token.trim() : "";
  const legacyPassphrase = typeof stored.passphrase === "string" ? stored.passphrase.trim() : "";
  const persisted = {
    owner: readStoredText(stored.owner, defaultGitHubSharedDataSettings.owner),
    repo: readStoredText(stored.repo, defaultGitHubSharedDataSettings.repo),
    branch: readStoredText(stored.branch, defaultGitHubSharedDataSettings.branch),
    path: readStoredText(stored.path, defaultGitHubSharedDataSettings.path),
  };

  if (legacyToken) saveSessionToken(legacyToken);
  if (legacyPassphrase) saveSessionPassphrase(legacyPassphrase);
  if (legacyToken || legacyPassphrase) {
    window.localStorage.setItem(settingsKey, JSON.stringify(persisted));
  }

  return {
    ...persisted,
    token: loadSessionToken() || legacyToken,
    passphrase: loadSessionPassphrase() || legacyPassphrase,
  };
}

export function saveGitHubSharedDataSettings(settings: GitHubSharedDataSettings) {
  const normalizedSettings = normalizeSettings(settings);
  const persisted = {
    owner: normalizedSettings.owner,
    repo: normalizedSettings.repo,
    branch: normalizedSettings.branch,
    path: normalizedSettings.path,
  };

  window.localStorage.setItem(settingsKey, JSON.stringify(persisted));
  saveSessionToken(normalizedSettings.token);
  saveSessionPassphrase(normalizedSettings.passphrase);
}

export function clearGitHubSharedDataSettings() {
  window.localStorage.removeItem(settingsKey);
  clearSessionToken();
  clearSessionPassphrase();
}

export function hasGitHubSharedDataToken(settings: GitHubSharedDataSettings) {
  return settings.token.trim().length > 0;
}

export function hasSyncPassphrase(settings: GitHubSharedDataSettings) {
  return settings.passphrase.trim().length > 0;
}

export async function pushCurrentSharedDataToGitHub(
  settings: GitHubSharedDataSettings,
): Promise<GitHubSharedDataPushResult> {
  const normalizedSettings = normalizeSettings(settings);

  if (!hasGitHubSharedDataToken(normalizedSettings)) {
    throw new Error("GitHub 토큰을 먼저 저장하세요.");
  }

  if (!hasSyncPassphrase(normalizedSettings)) {
    throw new Error("공유 데이터 암호를 먼저 저장하세요.");
  }

  const apiUrl = getContentApiUrl(normalizedSettings);
  const headers = getGitHubHeaders(normalizedSettings.token);

  for (let attempt = 1; attempt <= maxGitHubContentUpdateAttempts; attempt += 1) {
    const existingContent = await fetchExistingContent(
      getContentApiUrl(normalizedSettings, true),
      headers,
      normalizedSettings,
    );

    if (existingContent.undecryptable) {
      throw new Error(
        "원격 공유 파일이 다른 암호로 잠겨 있습니다. 공유 데이터 암호를 확인한 뒤 다시 시도하세요.",
      );
    }

    if (existingContent.backup) {
      await importBackupData(existingContent.backup);
    }

    const backup = await createBackupData();
    assertRemoteDeltaIsIntentional(existingContent.backup?.transactions, backup.transactions);

    const envelope = await encryptTextWithPassphrase(
      normalizedSettings.passphrase,
      JSON.stringify(backup, null, 2),
    );
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: `data: shared-data ${backup.exportedAt.slice(0, 10)}`,
        content: encodeBase64Utf8(JSON.stringify(envelope, null, 2)),
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
    passphrase: settings.passphrase.trim(),
  };
}

function readStoredText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getGitHubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

type ExistingSharedContent = {
  sha?: string;
  backup?: ParsedBackupFile;
  undecryptable?: boolean;
};

async function fetchExistingContent(
  apiUrl: string,
  headers: Record<string, string>,
  settings: GitHubSharedDataSettings,
): Promise<ExistingSharedContent> {
  const response = await fetch(apiUrl, { headers });

  if (response.status === 404) return {};
  if (!response.ok) {
    throw new Error(await formatGitHubError(response, "GitHub 공유 데이터 파일 조회 실패.", settings));
  }

  const content = (await response.json()) as GitHubContentResponse;

  if (!content.content) {
    return { sha: content.sha };
  }

  if (content.encoding && content.encoding !== "base64") {
    throw new Error("GitHub 공유 데이터 파일 조회 실패. GitHub 파일 인코딩이 base64가 아닙니다.");
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(decodeBase64Utf8(content.content));
  } catch {
    return { sha: content.sha };
  }

  const parsed = await parseSharedDataPayload(decoded, settings.passphrase);

  if (parsed.undecryptable) {
    return { sha: content.sha, undecryptable: true };
  }

  return { sha: content.sha, backup: parsed.backup };
}

// 공유 파일 본문을 해석합니다. 암호화 봉투면 암호로 열고, 아니면 예전 평문 형식으로 읽습니다.
export async function parseSharedDataPayload(
  value: unknown,
  passphrase: string,
): Promise<{ backup?: ParsedBackupFile; undecryptable?: boolean }> {
  if (isEncryptedPayloadEnvelope(value)) {
    if (!passphrase) return { undecryptable: true };

    let plaintext: string;

    try {
      plaintext = await decryptEnvelopeWithPassphrase(passphrase, value);
    } catch {
      return { undecryptable: true };
    }

    try {
      const parsed = backupFileSchema.safeParse(JSON.parse(plaintext));

      return parsed.success ? { backup: parsed.data } : {};
    } catch {
      return {};
    }
  }

  const parsed = backupFileSchema.safeParse(value);

  return parsed.success ? { backup: parsed.data } : {};
}

// 원격본과 비교해 급격한 변화는 사용자에게 확인하고 넘어갑니다.
type TransactionAmountSummary = {
  type: "income" | "expense";
  amount: number;
};

export function assertRemoteDeltaIsIntentional(
  remoteTransactions: readonly TransactionAmountSummary[] | undefined,
  nextTransactions: readonly TransactionAmountSummary[],
) {
  if (!remoteTransactions) return;

  const remoteCount = remoteTransactions.length;
  const nextCount = nextTransactions.length;
  const countDelta = Math.abs(nextCount - remoteCount);
  const remoteExpense = sumExpenses(remoteTransactions);
  const expenseDelta = Math.abs(sumExpenses(nextTransactions) - remoteExpense);
  const countLimit = Math.max(minConfirmTransactionDelta, Math.ceil(remoteCount * maxSilentTransactionDeltaRatio));
  const expenseLimit = Math.max(minConfirmExpenseDelta, Math.ceil(remoteExpense * maxSilentExpenseDeltaRatio));

  if (countDelta <= countLimit && expenseDelta <= expenseLimit) return;

  const confirmed = window.confirm(
    [
      "공유 데이터가 원격본과 크게 다릅니다.",
      `거래 수: ${remoteCount}건 → ${nextCount}건 (${countDelta}건 차이)`,
      `지출 합계: ${formatKrw(remoteExpense)} → ${formatKrw(sumExpenses(nextTransactions))} (${formatKrw(expenseDelta)} 차이)`,
      "계속 커밋할까요?",
    ].join("\n"),
  );

  if (!confirmed) {
    throw new Error("사용자가 업데이트를 취소했습니다.");
  }
}

function sumExpenses(transactions: readonly TransactionAmountSummary[]) {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
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
