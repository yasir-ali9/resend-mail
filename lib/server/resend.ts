import "server-only";

import { Resend } from "resend";

import { getServerEnv } from "@/lib/server/env";

type GlobalWithResend = typeof globalThis & {
  inboundResend?: Resend;
};

const globalWithResend = globalThis as GlobalWithResend;

export const resend =
  globalWithResend.inboundResend ?? new Resend(getServerEnv("RESEND_API_KEY"));

if (process.env.NODE_ENV !== "production") {
  globalWithResend.inboundResend = resend;
}
