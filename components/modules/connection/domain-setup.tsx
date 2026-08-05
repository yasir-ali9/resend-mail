"use client";

import { Check, Globe2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SetupShell } from "@/components/modules/setup/shell";
import { Button } from "@/components/reusables/button";
import type { Connection } from "@/lib/connection/types";
import { cn } from "@/lib/utils";

import { selectDomainAction } from "./actions";

export function DomainSetup({ connection }: { connection: Connection }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const verifiedDomains = connection.domains.filter(
    (domain) => domain.status === "verified",
  );
  const verifiedDomainCount = String(verifiedDomains.length).padStart(2, "0");
  const description = verifiedDomains.length
    ? `We found ${verifiedDomainCount} verified ${
        verifiedDomains.length === 1 ? "domain" : "domains"
      }. Select ${verifiedDomains.length === 1 ? "it" : "one"} to continue.`
    : "No verified domains were found yet.";

  async function handleContinue() {
    if (!selectedId) return;
    setPending(true);
    setError("");
    const result = await selectDomainAction(selectedId);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Unable to select this domain.");
      return;
    }
    router.push("/inbox");
  }

  return (
    <SetupShell
      step={3}
      width="wide"
      spacing="tight"
      backHref="/setup/account"
      backLabel="Back to accounts"
      title="Choose a domain"
      description={description}
    >
      {verifiedDomains.length ? (
        <div className="space-y-2">
          {verifiedDomains.map((domain) => {
            const usable = domain.sending && domain.receiving;
            const selected = domain.id === selectedId;

            return (
              <button
                key={domain.id}
                type="button"
                disabled={!usable || pending}
                onClick={() => {
                  setSelectedId(domain.id);
                  setError("");
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  selected
                    ? "border-ac-02 bg-bk-70"
                    : "border-bd-40 bg-bk-80 hover:bg-bk-70",
                  !usable && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bk-60 text-fg-60">
                  <Globe2 className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-fg-30">
                    {domain.name}
                  </span>
                  <span className="mt-0.5 block text-[9px] text-fg-70">
                    {usable
                      ? "Sending and receiving enabled"
                      : "Sending and receiving must both be enabled"}
                  </span>
                </span>
                {selected ? <Check className="size-3.5 text-ac-02" /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-bd-40 bg-bk-80 p-4 text-center">
          <p className="text-[11px] font-medium text-fg-40">No verified domains found</p>
          <p className="mt-1 text-[10px] leading-4 text-fg-70">
            Verify a domain in Resend, then update this account’s API key to refresh it.
          </p>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-[10px] text-[#c2410c] dark:text-[#fb923c]">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!selectedId || pending}
          onClick={() => void handleContinue()}
        >
          {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          {pending ? "Opening..." : "Open inbox"}
        </Button>
      </div>
    </SetupShell>
  );
}
