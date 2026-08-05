import "server-only";

import { Resend } from "resend";

import {
  getConnection,
  setConnectionStatus,
} from "@/lib/connection/repository";
import {
  CredentialDecryptionError,
  decryptCredential,
} from "@/lib/server/credentials";

export async function getResendClient(connectionId: string) {
  const connection = await getConnection(connectionId);

  if (!connection || connection.status !== "active") {
    throw new Error("This Resend connection is unavailable.");
  }

  const encryptedCredential =
    connection.authType === "api_key"
      ? connection.encryptedApiKey
      : connection.encryptedAccessToken;

  if (!encryptedCredential) {
    throw new Error("This Resend connection has no usable credential.");
  }

  try {
    return new Resend(decryptCredential(encryptedCredential));
  } catch (error) {
    if (error instanceof CredentialDecryptionError) {
      await setConnectionStatus(connectionId, "error");
    }
    throw error;
  }
}
