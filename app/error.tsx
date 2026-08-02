"use client";

import { useEffect } from "react";

import { ErrorFallback } from "@/components/modules/error/fallback";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorFallback onRetry={unstable_retry} />;
}
