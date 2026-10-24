// 공유 암호 없이 JSON을 게시하고 기존 암호화 파일을 보존하는지 검증합니다.
import { expect, test } from "@playwright/test";
import { db } from "../src/db/db";
import { createDefaultCategories } from "../src/features/categories/category-presets";
import {
  defaultGitHubSharedDataSettings,
  parseSharedDataPayload,
  pushCurrentSharedDataToGitHub,
} from "../src/features/shared-data/github-shared-data-service";
import { decodeBase64Utf8, encodeBase64Utf8, encryptedBackupFormat } from "../src/lib/web-crypto";

test("GitHub update sends ordinary JSON with categories using only a token", async () => {
  const originalFetch = globalThis.fetch;
  const originals = { count: db.categories.count, get: db.categories.get, orderBy: db.categories.orderBy };
  const originalTransactionsOrderBy = db.transactions.orderBy;
  const categories = createDefaultCategories("2026-10-25T00:00:00.000Z");
  const payloads: Record<string, unknown>[] = [];

  db.categories.count = async () => categories.length;
  db.categories.get = (async () => categories[0]) as typeof db.categories.get;
  db.categories.orderBy = (() => ({ toArray: async () => categories })) as typeof db.categories.orderBy;
  db.transactions.orderBy = (() => ({ toArray: async () => [] })) as typeof db.transactions.orderBy;
  globalThis.fetch = async (_url, init) => {
    if (init?.method !== "PUT") return new Response(null, { status: 404 });
    payloads.push(JSON.parse(String(init.body)));
    return Response.json({ commit: { sha: "test-commit", html_url: "https://github.test/commit/test" } });
  };

  try {
    const result = await pushCurrentSharedDataToGitHub({ ...defaultGitHubSharedDataSettings, token: "test-token" });
    expect(result.commitSha).toBe("test-commit");
    expect(payloads).toHaveLength(1);
    const published = JSON.parse(decodeBase64Utf8(String(payloads[0].content)));
    expect(published.categories).toEqual(categories);
    expect(published.transactions).toEqual([]);
    expect(published).not.toHaveProperty("ciphertext");
    expect(published).not.toHaveProperty("format");
  } finally {
    globalThis.fetch = originalFetch;
    Object.assign(db.categories, originals);
    db.transactions.orderBy = originalTransactionsOrderBy;
  }
});

test("legacy encrypted backups still open with the saved key and fail closed without it", async () => {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode("old-key"), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 1000 },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const backup = { version: 1, exportedAt: "2026-10-25T00:00:00.000Z", categories: [], transactions: [] };
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(backup)));
  const envelope = {
    format: encryptedBackupFormat, version: 1, kdf: "PBKDF2-SHA-256", iterations: 1000, cipher: "AES-GCM",
    salt: btoa(String.fromCharCode(...salt)), iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
  expect(await parseSharedDataPayload(envelope, "old-key")).toEqual({ backup });
  expect(await parseSharedDataPayload(envelope, "")).toEqual({ undecryptable: true });
  expect(await parseSharedDataPayload(envelope, "wrong-key")).toEqual({ undecryptable: true });
  expect(await parseSharedDataPayload(backup, "")).toEqual({ backup });
  expect(JSON.parse(decodeBase64Utf8(encodeBase64Utf8(JSON.stringify(backup))))).toEqual(backup);
});
