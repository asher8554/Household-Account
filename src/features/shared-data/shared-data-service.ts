// GitHub Pages에 배포된 공개 공유 데이터를 IndexedDB에 반영합니다.
import {
  backupFileSchema,
  type ParsedBackupFile,
} from "../backup/backup-schema";
import { importBackupData } from "../backup/backup-service";
import { decryptEnvelopeWithPassphrase, isEncryptedPayloadEnvelope } from "../../lib/web-crypto";
import { loadSessionPassphrase } from "./sync-session-store";

const sharedDataFileName = "shared-data.json";
const appliedExportedAtKey = "household-account-shared-data-exported-at";

export type SharedDataLoadResult = {
  status: "missing" | "empty" | "current" | "applied" | "invalid" | "locked" | "error";
  exportedAt?: string;
  transactions?: number;
};

function getSharedDataUrl() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(`${normalizedBaseUrl}${sharedDataFileName}`, window.location.href);

  url.searchParams.set("v", Date.now().toString());
  return url.toString();
}

export async function loadPublishedSharedData(): Promise<SharedDataLoadResult> {
  try {
    // GitHub Pages 공유 데이터는 updatedAt 기준 병합으로 로컬 최신 변경을 보존한다.
    const response = await fetch(getSharedDataUrl(), { cache: "no-store" });

    if (response.status === 404) {
      return { status: "missing" };
    }

    if (!response.ok) {
      return { status: "error" };
    }

    const raw = (await response.json()) as unknown;
    let backup: ParsedBackupFile;

    if (isEncryptedPayloadEnvelope(raw)) {
      const passphrase = loadSessionPassphrase();

      if (!passphrase) {
        return { status: "locked" };
      }

      let plaintext: string;

      try {
        plaintext = await decryptEnvelopeWithPassphrase(passphrase, raw);
      } catch {
        return { status: "locked" };
      }

      const parsed = backupFileSchema.safeParse(JSON.parse(plaintext));

      if (!parsed.success) {
        return { status: "invalid" };
      }

      backup = parsed.data;
    } else {
      const parsed = backupFileSchema.safeParse(raw);

      if (!parsed.success) {
        return { status: "invalid" };
      }

      backup = parsed.data;
    }

    if (backup.categories.length === 0 && backup.transactions.length === 0) {
      return { status: "empty", exportedAt: backup.exportedAt, transactions: 0 };
    }

    const appliedExportedAt = window.localStorage.getItem(appliedExportedAtKey);

    if (appliedExportedAt === backup.exportedAt) {
      return { status: "current", exportedAt: backup.exportedAt, transactions: backup.transactions.length };
    }

    await importBackupData(backup);
    window.localStorage.setItem(appliedExportedAtKey, backup.exportedAt);

    return { status: "applied", exportedAt: backup.exportedAt, transactions: backup.transactions.length };
  } catch {
    return { status: "error" };
  }
}
