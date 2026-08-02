"use client";

import {
  Check,
  CirclePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";

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
import type { Mailbox } from "@/lib/mailbox/types";
import { cn } from "@/lib/utils";

import {
  deleteMailboxAction,
  updateMailboxAction,
} from "./actions";

interface ManageMailboxesModalProps {
  open: boolean;
  mailboxes: Mailbox[];
  onOpenChange: (open: boolean) => void;
  onAddRequested: () => void;
  onMailboxDeleted: (
    deletedMailboxId: string,
    selectedMailbox?: Mailbox,
  ) => void;
  onMailboxUpdated: (mailbox: Mailbox) => void;
}

export function ManageMailboxesModal({
  open,
  mailboxes,
  onOpenChange,
  onAddRequested,
  onMailboxDeleted,
  onMailboxUpdated,
}: ManageMailboxesModalProps) {
  const [editingMailboxId, setEditingMailboxId] = useState<string>();
  const [deletingMailboxId, setDeletingMailboxId] = useState<string>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  function handleOpenChange(nextOpen: boolean) {
    if (busy) {
      return;
    }

    if (!nextOpen) {
      resetEditor();
    }

    onOpenChange(nextOpen);
  }

  function startEditing(mailbox: Mailbox) {
    setEditingMailboxId(mailbox.id);
    setDeletingMailboxId(undefined);
    setName(mailbox.name);
    setEmail(mailbox.email);
    setError("");
  }

  function resetEditor() {
    setEditingMailboxId(undefined);
    setDeletingMailboxId(undefined);
    setName("");
    setEmail("");
    setError("");
  }

  async function handleUpdate() {
    if (!editingMailboxId) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await updateMailboxAction({
        id: editingMailboxId,
        name,
        email,
      });

      if (!result.ok || !result.mailbox) {
        const message = result.error || "Unable to update this mailbox.";
        setError(message);
        toast(message, "error");
        return;
      }

      onMailboxUpdated(result.mailbox);
      toast("Mailbox updated", "success");
      resetEditor();
    } catch {
      const message = "Unable to update this mailbox.";
      setError(message);
      toast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(mailbox: Mailbox) {
    setBusy(true);
    setError("");

    try {
      const result = await deleteMailboxAction(mailbox.id);

      if (!result.ok || !result.deletedMailboxId) {
        const message = result.error || "Unable to delete this mailbox.";
        setError(message);
        toast(message, "error");
        return;
      }

      onMailboxDeleted(result.deletedMailboxId, result.selectedMailbox);
      toast(`${mailbox.name} deleted`, "success");
      resetEditor();
    } catch {
      const message = "Unable to delete this mailbox.";
      setError(message);
      toast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  const editingMailbox = mailboxes.find(
    (mailbox) => mailbox.id === editingMailboxId,
  );

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent
        size="md"
        className="flex w-full flex-col border-bd-30 bg-bk-90"
      >
        <ModalHeader>
          <ModalTitle>
            {editingMailbox ? "Edit mailbox" : "Manage mailboxes"}
          </ModalTitle>
          <ModalDescription>
            {editingMailbox
              ? "Update the name or address used in the From field."
              : "Add, edit, or remove the identities available when composing."}
          </ModalDescription>
        </ModalHeader>

        {editingMailbox ? (
          <EditMailboxBody
            name={name}
            email={email}
            busy={busy}
            error={error}
            onNameChange={setName}
            onEmailChange={setEmail}
          />
        ) : (
          <ModalBody className="min-h-0 space-y-2 overflow-y-auto">
            {mailboxes.map((mailbox) => {
              const confirmingDelete = deletingMailboxId === mailbox.id;
              const isLastMailbox = mailboxes.length === 1;

              return (
                <div
                  key={mailbox.id}
                  className="rounded-lg border border-bd-30 bg-bk-80 p-2.5"
                >
                  <div className="flex items-start gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-bk-70 text-[10px] font-medium text-fg-50">
                      {mailbox.name.charAt(0).toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <p className="truncate text-[11px] font-medium text-fg-40">
                          {mailbox.name}
                        </p>
                        {mailbox.isDefault ? (
                          <span className="rounded border border-bd-40 px-1 py-0.5 text-[8px] uppercase tracking-wide text-fg-70">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-fg-70">
                        {mailbox.email}
                      </p>
                      <VerificationStatus mailbox={mailbox} />
                    </div>

                    <button
                      type="button"
                      aria-label={`Edit ${mailbox.name}`}
                      title={`Edit ${mailbox.name}`}
                      onClick={() => startEditing(mailbox)}
                      disabled={busy}
                      className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-fg-70 hover:bg-bk-70 hover:text-fg-40 focus-visible:ring-1 focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil aria-hidden="true" className="size-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${mailbox.name}`}
                      title={
                        isLastMailbox
                          ? "Add another mailbox before deleting this one"
                          : `Delete ${mailbox.name}`
                      }
                      onClick={() => {
                        setDeletingMailboxId(mailbox.id);
                        setError("");
                      }}
                      disabled={busy || isLastMailbox}
                      className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-fg-70 hover:bg-bk-70 hover:text-fg-40 focus-visible:ring-1 focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 aria-hidden="true" className="size-3" />
                    </button>
                  </div>

                  {confirmingDelete ? (
                    <div className="mt-2 flex flex-col gap-2 border-t border-bd-30 pt-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[10px] text-fg-60">
                        Delete this mailbox?
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingMailboxId(undefined)}
                          disabled={busy}
                          className="h-6 bg-bk-70 px-2 py-0 text-[10px] hover:bg-bk-60"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => void handleDelete(mailbox)}
                          disabled={busy}
                          className="h-6 px-2 py-0 text-[10px]"
                        >
                          {busy ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {error ? (
              <p role="alert" className="text-[11px] text-fg-60">
                {error}
              </p>
            ) : null}
          </ModalBody>
        )}

        <ModalFooter
          align="right"
          className="flex-col pt-1 sm:flex-row"
        >
          {editingMailbox ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetEditor}
                disabled={busy}
                className="w-full bg-bk-80 hover:bg-bk-70 sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void handleUpdate()}
                disabled={busy}
                className="w-full sm:w-auto"
              >
                {busy ? "Saving..." : "Save changes"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                className="w-full border-bd-40 bg-bk-80 text-fg-60 hover:bg-bk-70 hover:text-fg-50 sm:w-auto"
              >
                Done
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  handleOpenChange(false);
                  onAddRequested();
                }}
                className="w-full gap-1.5 sm:w-auto"
              >
                <CirclePlus aria-hidden="true" className="size-3" />
                New mailbox
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

interface EditMailboxBodyProps {
  name: string;
  email: string;
  busy: boolean;
  error: string;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
}

function EditMailboxBody({
  name,
  email,
  busy,
  error,
  onNameChange,
  onEmailChange,
}: EditMailboxBodyProps) {
  return (
    <ModalBody className="min-h-0 space-y-3 overflow-y-auto">
      <label className="block">
        <span className="mb-1.5 block text-[11px] text-fg-60">Name</span>
        <StringInput
          value={name}
          onChange={onNameChange}
          placeholder="Support"
          maxLength={60}
          disabled={busy}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] text-fg-60">Email</span>
        <StringInput
          type="email"
          value={email}
          onChange={onEmailChange}
          placeholder="support@example.com"
          maxLength={254}
          disabled={busy}
        />
      </label>

      <div className="rounded-lg border border-bd-30 bg-bk-80 px-2.5 py-2">
        <p className="text-[10px] text-fg-70">Looks like</p>
        <p className="mt-1 truncate text-[11px] text-fg-50">
          {name.trim() || "Support"} &lt;
          {email.trim() || "support@example.com"}&gt;
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-[11px] text-fg-60">
          {error}
        </p>
      ) : null}
    </ModalBody>
  );
}

function VerificationStatus({ mailbox }: { mailbox: Mailbox }) {
  const verified = mailbox.verificationStatus === "verified";
  const label =
    mailbox.verificationStatus === "unknown"
      ? "Verification unavailable"
      : verified
        ? "Verified in Resend"
        : "Domain not verified";

  return (
    <p
      className={cn(
        "mt-1.5 flex items-center gap-1 text-[9px] text-fg-70",
        verified && "text-ac-01",
      )}
    >
      <span
        className={cn(
          "grid size-3 place-items-center rounded-full border border-bd-30",
          verified && "border-ac-01 bg-ac-01 text-white",
        )}
      >
        {verified ? (
          <Check aria-hidden="true" className="size-2" />
        ) : null}
      </span>
      {label}
    </p>
  );
}
