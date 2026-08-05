"use server";

import { Resend, type Domain } from "resend";

import {
  createConnection,
  deleteConnection,
  findConnectionByAccountMarkers,
  getConnection,
  getDomain,
  listConnections,
  replaceConnectionApiKey,
  setWebhookSecret,
  updateConnectionLabel,
} from "@/lib/connection/repository";
import {
  encryptCredential,
  fingerprintCredential,
} from "@/lib/server/credentials";
import {
  getSession,
  isAuthenticated,
  updateSessionSelection,
} from "@/lib/server/auth";

export interface ConnectionFormState {
  ok: boolean;
  error: string;
}

export async function addConnectionAction(
  _previousState: ConnectionFormState,
  formData: FormData,
): Promise<ConnectionFormState> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const label = readValue(formData, "label");
  const apiKey = readValue(formData, "apiKey");
  const webhookSecret = readValue(formData, "webhookSecret");

  if (!label || label.length > 80 || /[<>\r\n]/.test(label)) {
    return { ok: false, error: "Enter a name between 1 and 80 characters." };
  }
  if (!/^re_[A-Za-z0-9_-]{10,}$/.test(apiKey)) {
    return { ok: false, error: "Enter a valid Resend API key." };
  }

  try {
    const resend = new Resend(apiKey);
    const [verifiedDomains, apiKeys] = await Promise.all([
      listDomains(resend),
      listApiKeys(resend),
    ]);
    const accountMarkers = [
      ...verifiedDomains.map((domain) => `domain:${domain.id}`),
      ...apiKeys.map((key) => `key:${key.id}`),
    ];
    const existingConnection = await findConnectionByAccountMarkers(
      accountMarkers,
    );

    if (existingConnection) {
      return {
        ok: false,
        error: `This Resend account is already connected as ${existingConnection.label}. Switch to that account instead.`,
      };
    }
    const id = crypto.randomUUID();

    await createConnection({
      id,
      label,
      authType: "api_key",
      encryptedApiKey: encryptCredential(apiKey),
      credentialFingerprint: fingerprintCredential(apiKey),
      accountMarkers,
      webhookEndpointToken: crypto.randomUUID().replaceAll("-", ""),
      encryptedWebhookSecret: webhookSecret
        ? encryptCredential(webhookSecret)
        : undefined,
      domains: verifiedDomains.map((domain) => ({
        id: domain.id,
        name: domain.name.toLowerCase(),
        status: domain.status,
        sending: domain.capabilities.sending === "enabled",
        receiving: domain.capabilities.receiving === "enabled",
      })),
    });

    await updateSessionSelection({ connectionId: id });

    return { ok: true, error: "" };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "This Resend API key is already connected." };
    }
    console.error("Unable to add Resend connection.", error);
    if (error instanceof Error && error.message === "FULL_ACCESS_REQUIRED") {
      return {
        ok: false,
        error:
          "This app requires a full-access Resend API key. Sending-only and domain-restricted keys cannot read domains or inbox mail.",
      };
    }
    return {
      ok: false,
      error:
        error instanceof Error && error.message.startsWith("Resend:")
          ? error.message.slice(7).trim()
          : "Unable to verify this key. Use a full-access Resend API key.",
    };
  }
}

export async function deleteConnectionAction(id: string) {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  if (!isId(id)) return { ok: false, error: "Invalid connection." };

  try {
    const deleted = await deleteConnection(id);
    return deleted
      ? { ok: true }
      : { ok: false, error: "This connection no longer exists." };
  } catch (error) {
    console.error("Unable to delete Resend connection.", error);
    return { ok: false, error: "Unable to delete this connection." };
  }
}

export async function selectConnectionAction(id: string) {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  if (!isId(id)) return { ok: false, error: "Invalid connection." };

  try {
    const connection = await getConnection(id);
    if (!connection) {
      return { ok: false, error: "This Resend account no longer exists." };
    }
    if (connection.status !== "active") {
      return { ok: false, error: "Update this account’s API key before continuing." };
    }
    await updateSessionSelection({ connectionId: id });
    return { ok: true };
  } catch (error) {
    console.error("Unable to switch Resend account.", error);
    return { ok: false, error: "Unable to switch Resend account." };
  }
}

export async function selectDomainAction(domainId: string) {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  if (!isId(domainId)) return { ok: false, error: "Invalid domain." };

  try {
    const session = await getSession();
    if (!session?.connectionId) {
      return { ok: false, error: "Choose a Resend account first." };
    }
    const domain = await getDomain(domainId, session.connectionId);
    if (!domain || domain.status !== "verified") {
      return { ok: false, error: "Choose a verified domain from this account." };
    }
    if (!domain.sending || !domain.receiving) {
      return {
        ok: false,
        error: "This domain must have sending and receiving enabled.",
      };
    }
    await updateSessionSelection({
      connectionId: session.connectionId,
      domainId: domain.id,
    });
    return { ok: true };
  } catch (error) {
    console.error("Unable to select Resend domain.", error);
    return { ok: false, error: "Unable to select this domain." };
  }
}

export async function replaceConnectionApiKeyAction(
  connectionId: string,
  apiKey: string,
): Promise<ConnectionFormState> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  if (!isId(connectionId) || !/^re_[A-Za-z0-9_-]{10,}$/.test(apiKey.trim())) {
    return { ok: false, error: "Enter a valid Resend API key." };
  }

  try {
    const current = await getConnection(connectionId);
    if (!current) {
      return { ok: false, error: "This Resend account no longer exists." };
    }

    const resend = new Resend(apiKey.trim());
    const [resendDomains, apiKeys, publicConnections] = await Promise.all([
      listDomains(resend),
      listApiKeys(resend),
      listConnections(),
    ]);
    const accountMarkers = [
      ...resendDomains.map((domain) => `domain:${domain.id}`),
      ...apiKeys.map((key) => `key:${key.id}`),
    ];
    const fingerprint = fingerprintCredential(apiKey.trim());
    const currentPublic = publicConnections.find(
      (connection) => connection.id === connectionId,
    );
    const belongsToCurrentAccount =
      fingerprint === current.credentialFingerprint ||
      accountMarkers.some((marker) => current.accountMarkers.includes(marker)) ||
      resendDomains.some((domain) =>
        currentPublic?.domains.some((savedDomain) => savedDomain.id === domain.id),
      );

    if (!belongsToCurrentAccount) {
      return {
        ok: false,
        error:
          "This key could not be verified as belonging to the same Resend account. Add it as a separate account instead.",
      };
    }

    const duplicate = await findConnectionByAccountMarkers(accountMarkers);
    if (duplicate && duplicate.id !== connectionId) {
      return {
        ok: false,
        error: `This Resend account is already connected as ${duplicate.label}.`,
      };
    }

    const updated = await replaceConnectionApiKey({
      id: connectionId,
      encryptedApiKey: encryptCredential(apiKey.trim()),
      credentialFingerprint: fingerprint,
      accountMarkers,
      domains: resendDomains.map((domain) => ({
        id: domain.id,
        name: domain.name.toLowerCase(),
        status: domain.status,
        sending: domain.capabilities.sending === "enabled",
        receiving: domain.capabilities.receiving === "enabled",
      })),
    });

    return updated
      ? { ok: true, error: "" }
      : { ok: false, error: "This Resend account no longer exists." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "This API key is already used by another account." };
    }
    console.error("Unable to replace Resend API key.", error);
    if (error instanceof Error && error.message === "FULL_ACCESS_REQUIRED") {
      return {
        ok: false,
        error:
          "Use a full-access Resend API key. Sending-only and domain-restricted keys cannot power an inbox.",
      };
    }
    return { ok: false, error: "Unable to verify this Resend API key." };
  }
}

export async function updateConnectionLabelAction(id: string, label: string) {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  const normalizedLabel = label.trim();
  if (
    !isId(id) ||
    !normalizedLabel ||
    normalizedLabel.length > 80 ||
    /[<>\r\n]/.test(normalizedLabel)
  ) {
    return { ok: false, error: "Enter an account name between 1 and 80 characters." };
  }

  try {
    const updated = await updateConnectionLabel(id, normalizedLabel);
    return updated
      ? { ok: true, error: "" }
      : { ok: false, error: "This Resend account no longer exists." };
  } catch (error) {
    console.error("Unable to rename Resend account.", error);
    return { ok: false, error: "Unable to update this account." };
  }
}

export async function saveWebhookSecretAction(
  connectionId: string,
  webhookSecret: string,
) {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  if (!isId(connectionId) || !webhookSecret.trim()) {
    return { ok: false, error: "Enter a valid webhook signing secret." };
  }

  try {
    const updated = await setWebhookSecret(
      connectionId,
      encryptCredential(webhookSecret.trim()),
    );
    return updated
      ? { ok: true }
      : { ok: false, error: "This connection no longer exists." };
  } catch (error) {
    console.error("Unable to save webhook secret.", error);
    return { ok: false, error: "Unable to save the webhook secret." };
  }
}

async function listDomains(resend: Resend) {
  const found: Domain[] = [];
  let after: string | undefined;

  do {
    const result = await resend.domains.list({
      limit: 100,
      ...(after ? { after } : {}),
    });
    if (result.error || !result.data) {
      if (isRestrictedResendError(result.error)) {
        throw new Error("FULL_ACCESS_REQUIRED");
      }
      throw new Error(`Resend: ${result.error?.message || "Unable to list domains."}`);
    }
    found.push(...result.data.data);
    after = result.data.has_more ? result.data.data.at(-1)?.id : undefined;
  } while (after);

  return found;
}

async function listApiKeys(resend: Resend) {
  const found: Array<{ id: string }> = [];
  let after: string | undefined;

  do {
    const result = await resend.apiKeys.list({
      limit: 100,
      ...(after ? { after } : {}),
    });
    if (result.error || !result.data) {
      throw new Error("FULL_ACCESS_REQUIRED");
    }
    found.push(...result.data.data);
    after = result.data.has_more ? result.data.data.at(-1)?.id : undefined;
  } while (after);

  return found;
}

function readValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isId(value: string) {
  return value.length >= 10 && value.length <= 100 && !/[\r\n]/.test(value);
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function isRestrictedResendError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (("name" in error && error.name === "restricted_api_key") ||
      ("message" in error &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("restricted")))
  );
}
