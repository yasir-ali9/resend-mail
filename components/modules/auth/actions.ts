"use server";

import { createHash, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";

export async function loginAction(
  _previousState: { error: string },
  formData: FormData,
): Promise<{ error: string }> {
  const configuredPassword = process.env.PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;
  const suppliedPassword = formData.get("password");

  if (!configuredPassword || !sessionSecret) {
    return { error: "Authentication is not configured on this server." };
  }

  if (
    typeof suppliedPassword !== "string" ||
    !passwordsMatch(suppliedPassword, configuredPassword)
  ) {
    return { error: "The password is incorrect." };
  }

  const token = await createSessionToken(sessionSecret);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/setup/account");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/setup/access");
}

function passwordsMatch(supplied: string, configured: string) {
  const suppliedDigest = createHash("sha256").update(supplied).digest();
  const configuredDigest = createHash("sha256").update(configured).digest();

  return timingSafeEqual(suppliedDigest, configuredDigest);
}
