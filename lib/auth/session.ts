export const SESSION_COOKIE_NAME = "resend_mail_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface SessionData {
  connectionId?: string;
  domainId?: string;
  expiresAt: number;
}

const encoder = new TextEncoder();

export async function createSessionToken(
  secret: string,
  selection: Pick<SessionData, "connectionId" | "domainId"> = {},
) {
  const data: SessionData = {
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    ...selection,
  };
  const payload = `v2:${encodePayload(data)}`;
  const signature = await sign(payload, secret);

  return `${payload}.${signature}`;
}

export async function readSessionToken(
  token: string | undefined,
  secret: string,
): Promise<SessionData | undefined> {
  if (!token) return undefined;

  const separator = token.lastIndexOf(".");
  if (separator < 0) return undefined;

  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  const expectedSignature = await sign(payload, secret);

  if (!constantTimeEqual(suppliedSignature, expectedSignature)) {
    return undefined;
  }

  if (payload.startsWith("v2:")) {
    const data = decodePayload(payload.slice(3));
    return data?.expiresAt && data.expiresAt > Date.now() ? data : undefined;
  }

  // Existing v1 sessions remain authenticated and continue through account setup.
  const [version, expiresAtValue] = payload.split(":");
  const expiresAt = Number(expiresAtValue);
  if (version !== "v1" || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) {
    return undefined;
  }
  return { expiresAt };
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
) {
  return Boolean(await readSessionToken(token, secret));
}

function encodePayload(data: SessionData) {
  const bytes = encoder.encode(JSON.stringify(data));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodePayload(value: string): SessionData | undefined {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes)) as SessionData;
    return typeof data.expiresAt === "number" ? data : undefined;
  } catch {
    return undefined;
  }
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
