"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/reusables/button";
import { StringInput } from "@/components/reusables/input/string";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/reusables/modal";
import { useToast } from "@/components/reusables/toast";
import type { Connection, ConnectionDomain } from "@/lib/connection/types";
import type {
  Mailbox,
  MailboxSuggestion,
  MailboxSuggestionsResult,
} from "@/lib/mailbox/types";

import { createMailboxAction } from "./actions";

interface AddMailboxModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (mailbox: Mailbox) => void;
  connection: Connection;
  domain: ConnectionDomain;
}

export function AddMailboxModal({
  open,
  onOpenChange,
  onCreated,
  connection,
  domain,
}: AddMailboxModalProps) {
  const [busy, setBusy] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!busy) onOpenChange(nextOpen);
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent
        size="sm"
        className="flex w-full flex-col border-bd-30 bg-bk-90"
      >
        <ModalHeader>
          <ModalTitle>New mailbox</ModalTitle>
          <ModalDescription>
            Configure a name and email address from a domain verified in Resend.
          </ModalDescription>
        </ModalHeader>

        <MailboxCreationForm
          active={open}
          connection={connection}
          domain={domain}
          onBusyChange={setBusy}
          onCancel={() => handleOpenChange(false)}
          onCreated={(mailbox) => {
            onCreated(mailbox);
            onOpenChange(false);
          }}
        />
      </ModalContent>
    </Modal>
  );
}

export function MailboxCreationForm({
  active = true,
  connection,
  domain,
  onBusyChange,
  onCancel,
  onCreated,
  pendingLabel = "Adding...",
  submitLabel = "Add mailbox",
}: {
  active?: boolean;
  connection: Connection;
  domain: ConnectionDomain;
  onBusyChange?: (busy: boolean) => void;
  onCancel?: () => void;
  onCreated: (mailbox: Mailbox) => void;
  pendingLabel?: string;
  submitLabel?: string;
}) {
  const [name, setName] = useState("");
  const [localPart, setLocalPart] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<MailboxSuggestionsResult>();
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const creatingRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSuggestionsLoading(true);
    });

    void fetch(`/api/mailboxes/suggestions?connection=${connection.id}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as
          | MailboxSuggestionsResult
          | { error?: string };

        if (!response.ok || !("suggestions" in result)) {
          const message = "error" in result ? result.error : undefined;
          throw new Error(message || "Unable to load suggestions.");
        }

        if (!cancelled) {
          setSuggestions({
            ...result,
            domains: result.domains.filter(
              (candidate) => candidate.id === domain.id,
            ),
            suggestions: result.suggestions.filter((suggestion) =>
              suggestion.email.toLowerCase().endsWith(`@${domain.name}`),
            ),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions({
            domains: [],
            suggestions: [],
            warning: "Unable to load suggestions from Resend.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active, connection.id, domain.id, domain.name]);

  async function handleCreate() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    onBusyChange?.(true);
    setError("");

    try {
      const email = `${localPart.trim()}@${domain.name}`;
      const result = await createMailboxAction({ name, email, domainId: domain.id });

      if (!result.ok || !result.mailbox) {
        const message = result.error || "Unable to add this mailbox.";
        setError(message);
        toast(message, "error");
        return;
      }

      onCreated(result.mailbox);
      toast(
        `${result.mailbox.name} <${result.mailbox.email}> added`,
        "success",
      );
    } catch {
      const message = "Unable to add this mailbox.";
      setError(message);
      toast(message, "error");
    } finally {
      creatingRef.current = false;
      setCreating(false);
      onBusyChange?.(false);
    }
  }

  return (
    <>
      <ModalBody className="space-y-3">
        <MailboxSuggestions
          loading={suggestionsLoading}
          result={suggestions}
          onSelect={(suggestion) => {
            setName(suggestion.name);
            setLocalPart(suggestion.email.split("@")[0] ?? "");
            setError("");
          }}
        />

        <label className="block">
          <span className="mb-1.5 block text-[11px] text-fg-60">Name</span>
          <StringInput
            value={name}
            onChange={setName}
            placeholder="Support"
            maxLength={60}
            disabled={creating}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] text-fg-60">Email</span>
          <div className="flex h-[26px] items-center rounded border border-bd-40 bg-bk-80 focus-within:border-ac-02 focus-within:ring-1 focus-within:ring-inset focus-within:ring-ac-02">
            <input
              value={localPart}
              onChange={(event) =>
                setLocalPart(event.target.value.replaceAll("@", ""))
              }
              placeholder="support"
              maxLength={64}
              disabled={creating}
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[11px] text-fg-50 outline-none placeholder:text-fg-70"
            />
            <span className="shrink-0 border-l border-bd-40 px-2 text-[10px] leading-[24px] text-fg-70">
              @{domain.name}
            </span>
          </div>
        </label>

        {error ? (
          <p role="alert" className="text-[11px] text-fg-60">
            {error}
          </p>
        ) : null}
      </ModalBody>

      <ModalFooter align="right" className="flex-col pt-1 sm:flex-row">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={creating}
            className="w-full bg-bk-80 hover:bg-bk-70 sm:w-auto"
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => void handleCreate()}
          disabled={creating || !localPart.trim() || !name.trim()}
          className="w-full sm:w-auto"
        >
          {creating ? pendingLabel : submitLabel}
        </Button>
      </ModalFooter>
    </>
  );
}

function MailboxSuggestions({
  loading,
  result,
  onSelect,
}: {
  loading: boolean;
  result?: MailboxSuggestionsResult;
  onSelect: (suggestion: MailboxSuggestion) => void;
}) {
  if (loading) {
    return (
      <div>
        <span className="mb-1.5 block text-[11px] text-fg-60">Found in Resend</span>
        <div className="rounded-lg border border-bd-30 bg-bk-80 px-3 py-2.5 text-[10px] text-fg-70">
          Checking recent Resend activity…
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div>
      <span className="mb-1.5 block text-[11px] text-fg-60">Found in Resend</span>
      <section className="max-h-40 overflow-y-auto rounded-lg border border-bd-30 bg-bk-80 p-1.5">
        {result.suggestions.length ? (
          <div className="space-y-0.5">
            {result.suggestions.map((suggestion) => (
              <button
                key={suggestion.email}
                type="button"
                onClick={() => onSelect(suggestion)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bk-70 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                <span className="flex min-w-0 flex-1 items-baseline gap-1 truncate text-[11px]">
                  <span className="shrink-0 text-fg-50">
                    {suggestion.name}
                  </span>
                  <span className="truncate text-[10px] text-fg-70">
                    &lt;{suggestion.email}&gt;
                  </span>
                </span>
                <span className="shrink-0 text-[9px] text-fg-70">
                  {suggestion.source === "sent-and-received"
                    ? "Sent + received"
                    : suggestion.source === "sent"
                      ? "Sent"
                      : "Received"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-1.5 py-1 text-[9px] leading-4 text-fg-70">
            No mailbox addresses were found in recent activity.
          </p>
        )}

        {result.warning ? (
          <p className="px-1.5 pt-1 pb-1 text-[9px] leading-4 text-fg-70">
            {result.warning}
          </p>
        ) : null}
      </section>
    </div>
  );
}
