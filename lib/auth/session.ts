export const SESSION_COOKIE_NAME = "resend_mail_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

export async function createSessionToken(secret: string) {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `v1:${expiresAt}`;
  const signature = await sign(payload, secret);

  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
) {
  if (!token) {
    return false;
  }

  const separator = token.lastIndexOf(".");

  if (separator < 0) {
    return false;
  }

  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  const [version, expiresAtValue] = payload.split(":");
  const expiresAt = Number(expiresAtValue);

  if (
    version !== "v1" ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    return false;
  }

  const expectedSignature = await sign(payload, secret);
  return constantTimeEqual(suppliedSignature, expectedSignature);
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
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}
