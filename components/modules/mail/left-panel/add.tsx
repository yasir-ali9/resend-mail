"use client";

import { useEffect, useState } from "react";

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
  const [name, setName] = useState("");
  const [localPart, setLocalPart] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<MailboxSuggestionsResult>();
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => setSuggestionsLoading(true));

    void fetch(`/api/mailboxes/suggestions?connection=${connection.id}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as
          | MailboxSuggestionsResult
          | { error?: string };

        if (!response.ok || !("suggestions" in result)) {
          const message = "error" in result ? result.error : undefined;
          throw new Error(message || "Unable to load suggestions.");
        }

        setSuggestions({
          ...result,
          domains: result.domains.filter((candidate) => candidate.id === domain.id),
          suggestions: result.suggestions.filter((suggestion) =>
            suggestion.email.toLowerCase().endsWith(`@${domain.name}`),
          ),
        });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") {
          return;
        }

        setSuggestions({
          domains: [],
          suggestions: [],
          warning: "Unable to load suggestions from Resend.",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSuggestionsLoading(false);
        }
      });

    return () => controller.abort();
  }, [open, connection.id, domain.id, domain.name]);

  function handleClose(force = false) {
    if (creating && !force) {
      return;
    }

    setName("");
    setLocalPart("");
    setError("");
    setSuggestions(undefined);
    onOpenChange(false);
  }

  async function handleCreate() {
    setCreating(true);
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
      handleClose(true);
    } catch {
      const message = "Unable to add this mailbox.";
      setError(message);
      toast(message, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={handleClose}>
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
                onChange={(event) => setLocalPart(event.target.value.replaceAll("@", ""))}
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

        <ModalFooter
          align="right"
          className="flex-col pt-1 sm:flex-row"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleClose()}
            disabled={creating}
            className="w-full bg-bk-80 hover:bg-bk-70 sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => void handleCreate()}
            disabled={creating || !localPart.trim() || !name.trim()}
            className="w-full sm:w-auto"
          >
            {creating ? "Adding..." : "Add mailbox"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
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
