import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/session";

export function isAuthenticationEnabled() {
  return Boolean(process.env.PASSWORD);
}

export async function isAuthenticated() {
  const password = process.env.PASSWORD;

  if (!password) {
    return true;
  }

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token, password);
}
