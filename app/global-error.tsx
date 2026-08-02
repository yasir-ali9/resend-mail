"use client";

import { useEffect, useLayoutEffect } from "react";

import { ErrorFallback } from "@/components/modules/error/fallback";

import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useLayoutEffect(() => {
    try {
      let theme = localStorage.getItem("theme");

      if (!theme || theme === "system") {
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }

      document.documentElement.setAttribute("data-theme", theme);
    } catch {
      // The CSS system-theme fallback remains available when storage is blocked.
    }
  }, []);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something went wrong · Resend Mail</title>
      </head>
      <body className="min-h-dvh bg-bk-100 font-sans text-fg-50 antialiased">
        <ErrorFallback onRetry={unstable_retry} />
      </body>
    </html>
  );
}
