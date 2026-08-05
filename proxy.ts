import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "./lib/auth/session";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  const password = process.env.PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!password || !sessionSecret) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "App authentication is not configured." },
        { status: 503 },
      );
    }
    return NextResponse.redirect(new URL("/setup/access", request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (await verifySessionToken(token, sessionSecret)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/setup/access", request.url));
}

export const config = {
  matcher: [
    "/((?!login|setup/access|api/webhooks/resend|_next/static|_next/image|favicon.ico|icon).*)",
  ],
};
