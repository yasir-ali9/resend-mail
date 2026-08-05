import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";

export class CredentialDecryptionError extends Error {
  constructor() {
    super(
      "This stored credential cannot be decrypted. Update the account with its API key.",
    );
    this.name = "CredentialDecryptionError";
  }
}

function getEncryptionKey() {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!secret || secret.length < 16) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must contain at least 16 characters.",
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [VERSION, iv, tag, ciphertext]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

export function decryptCredential(value: string) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(".");

  if (
    version !== VERSION ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue
  ) {
    throw new Error("The encrypted credential is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  try {
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new CredentialDecryptionError();
  }
}

export function fingerprintCredential(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
