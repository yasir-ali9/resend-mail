"use client";

import { CircleAlert } from "lucide-react";

import { Button } from "@/components/reusables/button";
import { Logo } from "@/components/reusables/logo";

export function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bk-100 px-4 py-8 text-fg-50">
      <section className="w-full max-w-sm rounded-xl border border-bd-30 bg-bk-90 p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <Logo className="h-8 w-auto text-fg-30" />
          <span className="text-[13px] font-medium text-fg-30">
            Resend Mail
          </span>
          <CircleAlert
            aria-hidden="true"
            className="ml-auto size-4 text-fg-60"
          />
        </div>

        <h1 className="text-[15px] font-medium text-fg-30">
          Something went wrong
        </h1>
        <p className="mt-2 text-[11px] leading-5 text-fg-70">
          Resend Mail hit an unexpected error. Try loading this view again,
          or return to the inbox.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onRetry}
            className="w-full sm:w-auto"
          >
            Try again
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.assign("/")}
            className="w-full border-bd-30 bg-bk-80 hover:bg-bk-70 sm:w-auto"
          >
            Return to inbox
          </Button>
        </div>
      </section>
    </main>
  );
}
