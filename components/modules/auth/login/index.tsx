"use client";

import { Check, LoaderCircle, LockKeyhole } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/reusables/button";
import { Input } from "@/components/reusables/input";
import { Logo } from "@/components/reusables/logo";
import { useTheme } from "@/lib/theme/theme";

import { loginAction } from "../actions";

const initialState = { error: "" };

export function Login() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const { toggleTheme } = useTheme();

  return (
    <main className="grid min-h-dvh place-items-center bg-bk-100 p-5 text-fg-50">
      <section className="w-full max-w-[22rem] overflow-hidden rounded-2xl border border-bd-40 bg-bk-90">
        <header className="px-5 pt-5 pb-12">
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
            <span className="text-[13px] font-medium text-fg-30">
              Resend Mail
            </span>
          </div>
          <h1 className="mt-5 text-[16px] font-medium text-fg-30">
            Unlock your inbox
          </h1>
          <p className="mt-1 text-[11px] leading-5 text-fg-70">
            Enter the owner password configured for this deployment.
          </p>
        </header>

        <form action={formAction} className="space-y-2.5 p-5">
          {state.error ? (
            <p
              id="password-error"
              role="alert"
              className="text-[11px] text-[#c2410c] dark:text-[#fb923c]"
            >
              {state.error}
            </p>
          ) : null}

          <label className="block" htmlFor="password">
            <span className="flex gap-2">
              <span className="relative min-w-0 flex-1">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-70"
                />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  autoFocus
                  placeholder="Password"
                  aria-invalid={Boolean(state.error)}
                  aria-describedby={state.error ? "password-error" : undefined}
                  className="h-9 rounded-lg border-bd-40 bg-bk-80 px-2 py-1.5 pl-8 text-[11px] text-fg-50 shadow-none hover:border-bd-40 focus:border-bd-40 focus:ring-0 focus:shadow-[0_0_0_2px_rgb(var(--ac-02))]"
                />
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={pending}
                aria-label={pending ? "Unlocking inbox" : "Unlock inbox"}
                className="h-9 w-9 shrink-0 rounded-lg border border-bd-40 p-0 hover:border-bd-40"
              >
                {pending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3.5 animate-spin"
                  />
                ) : (
                  <Check aria-hidden="true" className="size-3.5" />
                )}
              </Button>
            </span>
          </label>
        </form>
      </section>
    </main>
  );
}
