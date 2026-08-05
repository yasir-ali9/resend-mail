import "server-only";

import { cookies } from "next/headers";

import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  readSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";

export function isAuthenticationEnabled() {
  return Boolean(process.env.PASSWORD && process.env.SESSION_SECRET);
}

export async function isAuthenticated() {
  const password = process.env.PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!password || !sessionSecret) {
    return false;
  }

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token, sessionSecret);
}

export async function getSession() {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) return undefined;

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return readSessionToken(token, sessionSecret);
}

export async function updateSessionSelection(selection: {
  connectionId?: string;
  domainId?: string;
}) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || !(await isAuthenticated())) return false;

  const token = await createSessionToken(sessionSecret, selection);
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return true;
}
