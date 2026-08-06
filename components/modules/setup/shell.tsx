"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/reusables/logo";
import { useTheme } from "@/lib/theme/theme";

export function SetupShell({
  step,
  title,
  description,
  children,
  backHref,
  backLabel = "Back",
  width = "compact",
  spacing = "loose",
}: {
  step: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  width?: "compact" | "wide";
  spacing?: "loose" | "tight";
}) {
  const { toggleTheme } = useTheme();

  return (
    <main className="grid min-h-dvh place-items-center bg-bk-100 p-4 text-fg-50">
      <div className={width === "wide" ? "w-full max-w-[28rem]" : "w-full max-w-[22rem]"}>
        {backHref ? (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[11px] text-fg-70 transition-colors hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
          >
            <ArrowLeft className="size-3.5" />
            {backLabel}
          </Link>
        ) : null}
        <section className="w-full overflow-hidden rounded-2xl border border-bd-40 bg-bk-90">
        <header className={`px-4 pt-4 ${spacing === "loose" ? "pb-10" : "pb-2"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle color theme"
                title="Toggle color theme"
                className="grid size-8 cursor-pointer place-items-center text-fg-50 transition-colors hover:text-fg-30 focus:outline-none focus-visible:text-fg-30"
              >
                <Logo className="size-8 -translate-x-0.5" />
              </button>
              <span className="text-[13px] font-medium text-fg-30">Resend Mail</span>
            </div>
            <span className="text-[10px] text-fg-70">{step} of 4</span>
          </div>
          <div className="mt-4 flex gap-1">
            {[1, 2, 3, 4].map((item) => (
              <span
                key={item}
                className={`h-0.5 flex-1 rounded-full ${
                  item <= step ? "bg-fg-60" : "bg-bk-60"
                }`}
              />
            ))}
          </div>
          <h1 className="mt-4 text-[13px] font-medium text-fg-30">{title}</h1>
          <p className="mt-0.5 text-[11px] leading-5 text-fg-70">{description}</p>
        </header>
        <div className="p-4">{children}</div>
        </section>
      </div>
    </main>
  );
}
