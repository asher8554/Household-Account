// 토큰·암호 같은 민감 값은 브라우저를 닫으면 사라지는 sessionStorage에만 보관합니다.
const tokenSessionKey = "household-account-github-shared-data-settings:token";
const passphraseSessionKey = "household-account-github-shared-data-settings:passphrase";
const notionKeySessionKey = "household-account:notion-backup-write-key:session";

function readSessionValue(key: string) {
  try {
    return window.sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeSessionValue(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage를 못 쓰는 환경에서는 세션 동안 값 없이 동작합니다.
  }
}

function removeSessionValue(key: string) {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // 무시합니다.
  }
}

export function loadSessionToken() {
  return readSessionValue(tokenSessionKey).trim();
}

export function saveSessionToken(value: string) {
  const trimmed = value.trim();

  if (trimmed) {
    writeSessionValue(tokenSessionKey, trimmed);
  } else {
    removeSessionValue(tokenSessionKey);
  }
}

export function clearSessionToken() {
  removeSessionValue(tokenSessionKey);
}

export function loadSessionPassphrase() {
  return readSessionValue(passphraseSessionKey).trim();
}

export function saveSessionPassphrase(value: string) {
  const trimmed = value.trim();

  if (trimmed) {
    writeSessionValue(passphraseSessionKey, trimmed);
  } else {
    removeSessionValue(passphraseSessionKey);
  }
}

export function clearSessionPassphrase() {
  removeSessionValue(passphraseSessionKey);
}

export function loadNotionWriteKeyFromSession() {
  return readSessionValue(notionKeySessionKey).trim();
}

export function saveNotionWriteKeyToSession(value: string) {
  const trimmed = value.trim();

  if (trimmed) {
    writeSessionValue(notionKeySessionKey, trimmed);
  } else {
    removeSessionValue(notionKeySessionKey);
  }
}

export function clearNotionWriteKeyFromSession() {
  removeSessionValue(notionKeySessionKey);
}
