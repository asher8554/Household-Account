// 공유 데이터 암호화에 쓰는 WebCrypto 헬퍼를 모읍니다.
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const encryptedBackupFormat = "household-account-encrypted-backup";
export const pbkdf2Iterations = 310_000;

type AesGcmAlgorithm = "AES-GCM";
type Pbkdf2Hash = "PBKDF2-SHA-256";

// GitHub에 커밋되는 암호화 파일 봉투 형식입니다.
export type EncryptedPayloadEnvelope = {
  format: typeof encryptedBackupFormat;
  version: 1;
  kdf: Pbkdf2Hash;
  iterations: number;
  salt: string;
  cipher: AesGcmAlgorithm;
  iv: string;
  ciphertext: string;
};

function encodeBase64Bytes(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function decodeBase64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function encodeBase64Utf8(value: string) {
  return encodeBase64Bytes(textEncoder.encode(value));
}

export function decodeBase64Utf8(value: string) {
  return textDecoder.decode(decodeBase64ToBytes(value));
}

export function isEncryptedPayloadEnvelope(value: unknown): value is EncryptedPayloadEnvelope {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<EncryptedPayloadEnvelope>;

  return (
    candidate.format === encryptedBackupFormat &&
    candidate.version === 1 &&
    candidate.kdf === "PBKDF2-SHA-256" &&
    candidate.cipher === "AES-GCM" &&
    typeof candidate.iterations === "number" &&
    Number.isInteger(candidate.iterations) &&
    (candidate.iterations ?? 0) > 0 &&
    typeof candidate.salt === "string" &&
    candidate.salt.length > 0 &&
    typeof candidate.iv === "string" &&
    candidate.iv.length > 0 &&
    typeof candidate.ciphertext === "string" &&
    candidate.ciphertext.length > 0
  );
}

async function deriveAesKey(
  passphrase: string,
  saltBytes: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", textEncoder.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptTextWithPassphrase(
  passphrase: string,
  plaintext: string,
): Promise<EncryptedPayloadEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt, pbkdf2Iterations);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, textEncoder.encode(plaintext));

  return {
    format: encryptedBackupFormat,
    version: 1,
    kdf: "PBKDF2-SHA-256",
    iterations: pbkdf2Iterations,
    salt: encodeBase64Bytes(salt),
    cipher: "AES-GCM",
    iv: encodeBase64Bytes(iv),
    ciphertext: encodeBase64Bytes(new Uint8Array(ciphertext)),
  };
}

export async function decryptEnvelopeWithPassphrase(
  passphrase: string,
  envelope: EncryptedPayloadEnvelope,
): Promise<string> {
  const key = await deriveAesKey(passphrase, decodeBase64ToBytes(envelope.salt), envelope.iterations);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64ToBytes(envelope.iv) },
    key,
    decodeBase64ToBytes(envelope.ciphertext),
  );

  return textDecoder.decode(plaintext);
}
