import "server-only";

import type { EmailMessageDetails } from "@/lib/email/types";

const authenticationMethods = ["spf", "dkim", "dmarc"] as const;

export function getEmailMessageDetails(
  headers: Record<string, string> | null | undefined,
  messageId: string | null | undefined,
): EmailMessageDetails | undefined {
  const authenticationResults = readHeader(
    headers,
    "authentication-results",
  );
  const dkimSignature = readHeader(headers, "dkim-signature");
  const received = readHeader(headers, "received");
  const receivedSpf = readHeader(headers, "received-spf");
  const returnPath = readHeader(headers, "return-path");
  const mailedBy =
    domainFromAuthentication(authenticationResults, "smtp.mailfrom") ??
    domainFromAddress(returnPath);
  const signedBy =
    domainFromAuthentication(authenticationResults, "header.d") ??
    domainFromDkimSignature(dkimSignature);
  const authentication = authenticationMethods.flatMap((method) => {
    const result =
      authenticationResult(authenticationResults, method) ??
      (method === "spf" ? receivedSpfResult(receivedSpf) : undefined);

    return result ? [`${method.toUpperCase()} ${result}`] : [];
  });
  const details: EmailMessageDetails = {
    ...(messageId ? { messageId } : {}),
    ...(mailedBy ? { mailedBy } : {}),
    ...(signedBy ? { signedBy } : {}),
    ...(hasTls(received)
      ? { security: "Standard encryption (TLS)" }
      : {}),
    ...(authentication.length ? { authentication } : {}),
  };

  return Object.keys(details).length ? details : undefined;
}

function readHeader(
  headers: Record<string, string> | null | undefined,
  name: string,
) {
  if (!headers) {
    return undefined;
  }

  const key = Object.keys(headers).find(
    (header) => header.toLowerCase() === name,
  );
  const value = key ? headers[key]?.trim() : undefined;

  return value?.slice(0, 10_000) || undefined;
}

function authenticationResult(
  value: string | undefined,
  method: string,
) {
  const result = value?.match(
    new RegExp(`(?:^|[;\\s])${method}=([a-z_-]+)`, "i"),
  )?.[1];

  return normalizeToken(result);
}

function receivedSpfResult(value: string | undefined) {
  return normalizeToken(value?.match(/^\s*([a-z_-]+)/i)?.[1]);
}

function domainFromAuthentication(
  value: string | undefined,
  property: string,
) {
  const candidate = value?.match(
    new RegExp(`${property}=<?([^;\\s>]+)>?`, "i"),
  )?.[1];

  return property === "smtp.mailfrom"
    ? domainFromAddress(candidate)
    : normalizeDomain(candidate);
}

function domainFromDkimSignature(value: string | undefined) {
  return normalizeDomain(
    value?.match(/(?:^|;)\s*d=([^;\s]+)/i)?.[1],
  );
}

function domainFromAddress(value: string | undefined) {
  const normalized = value?.replace(/[<>]/g, "").trim();
  const at = normalized?.lastIndexOf("@") ?? -1;

  return at >= 0
    ? normalizeDomain(normalized?.slice(at + 1))
    : normalizeDomain(normalized);
}

function normalizeDomain(value: string | undefined) {
  const domain = value
    ?.trim()
    .replace(/[.;]+$/, "")
    .toLowerCase();

  return domain &&
    domain.length <= 253 &&
    /^[a-z0-9.-]+$/i.test(domain)
    ? domain
    : undefined;
}

function normalizeToken(value: string | undefined) {
  const token = value?.trim().toLowerCase();

  return token && /^[a-z_-]+$/.test(token) ? token : undefined;
}

function hasTls(value: string | undefined) {
  return Boolean(
    value &&
      /\b(?:ESMTPS|STARTTLS|TLSv1(?:\.\d+)?|with TLS|using TLS)\b/i.test(
        value,
      ),
  );
}
