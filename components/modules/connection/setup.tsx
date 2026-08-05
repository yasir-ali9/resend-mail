"use client";

import {
  AlertTriangle,
  Check,
  LoaderCircle,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/reusables/button";
import { SetupShell } from "@/components/modules/setup/shell";
import { Input } from "@/components/reusables/input";
import { Tooltip } from "@/components/reusables/tooltip";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/reusables/modal";
import type { Connection } from "@/lib/connection/types";

import {
  addConnectionAction,
  deleteConnectionAction,
  replaceConnectionApiKeyAction,
  saveWebhookSecretAction,
  selectConnectionAction,
  updateConnectionLabelAction,
  type ConnectionFormState,
} from "./actions";

const initialState: ConnectionFormState = { ok: false, error: "" };

export function ConnectionSetup({ connections }: { connections: Connection[] }) {
  const router = useRouter();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [managedConnection, setManagedConnection] = useState<Connection>();
  const [selectedId, setSelectedId] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [deletingConnectionId, setDeletingConnectionId] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: ConnectionFormState, formData: FormData) => {
      const result = await addConnectionAction(previous, formData);
      if (result.ok) {
        router.push("/setup/domain");
      }
      return result;
    },
    initialState,
  );

  async function handleContinue() {
    if (!selectedId) return;
    setSelecting(true);
    setSelectionError("");
    const result = await selectConnectionAction(selectedId);
    setSelecting(false);
    if (!result.ok) {
      setSelectionError(result.error ?? "Unable to select this account.");
      return;
    }
    router.push("/setup/domain");
  }

  async function handleDeleteConnection(connection: Connection) {
    if (!window.confirm(`Delete ${connection.label} and all of its local mail data?`)) {
      return;
    }

    setDeletingConnectionId(connection.id);
    const result = await deleteConnectionAction(connection.id);
    setDeletingConnectionId("");
    if (!result.ok) {
      setSelectionError(result.error ?? "Unable to delete this account.");
      return;
    }
    if (selectedId === connection.id) setSelectedId("");
    router.refresh();
  }

  return (
    <SetupShell
      step={2}
      width="wide"
      spacing="tight"
      title="Choose an account"
      description="Select the Resend account you want to open."
    >
        {connections.length ? (
          <section className="space-y-2">
            {connections.map((connection) => {
              const needsAttention = connection.status !== "active";
              const selected = connection.id === selectedId;

              return (
                <div
                  key={connection.id}
                  className={`flex items-center overflow-hidden rounded-xl border bg-bk-80 ${
                    selected ? "border-ac-02 bg-bk-70" : "border-bd-40"
                  }`}
                >
                  <button
                    type="button"
                    disabled={needsAttention || selecting}
                    onClick={() => {
                      setSelectedId(connection.id);
                      setSelectionError("");
                    }}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 p-3 text-left disabled:cursor-not-allowed"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bk-60 text-[11px] font-medium text-fg-50">
                      {connection.label.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[12px] font-medium text-fg-30">
                          {connection.label}
                        </span>
                        {needsAttention ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#c2410c]/10 px-2 py-0.5 text-[9px] text-[#c2410c] dark:text-[#fb923c]">
                            <AlertTriangle className="size-2.5" />
                            Action required
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-[10px] text-fg-70">
                        {needsAttention ? "Connection needs attention" : "Connection successful"}
                      </span>
                    </span>
                    {selected ? <Check className="size-3.5 shrink-0 text-ac-02" /> : null}
                  </button>
                  <div className="flex shrink-0 items-center px-2">
                    <Tooltip
                      content={needsAttention ? "Update API key" : "Manage account"}
                      position="bottom"
                    >
                      <button
                        type="button"
                        onClick={() => setManagedConnection(connection)}
                        aria-label={needsAttention ? "Update API key" : "Manage account"}
                        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-60 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
                      >
                        <Settings className="size-3.5" strokeWidth={1.8} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete account" position="bottom">
                      <button
                        type="button"
                        disabled={selecting || deletingConnectionId === connection.id}
                        onClick={() => void handleDeleteConnection(connection)}
                        aria-label="Delete account"
                        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-60 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingConnectionId === connection.id ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" strokeWidth={1.8} />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selecting}
                onClick={() => setShowAddAccount(true)}
                className="border-bd-40 bg-bk-80 text-fg-50 hover:bg-bk-70 hover:text-fg-40"
              >
                <Plus className="size-3.5" />
                New account
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!selectedId || selecting}
                onClick={() => void handleContinue()}
              >
                {selecting ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                {selecting ? "Choosing..." : "Choose account"}
              </Button>
            </div>
            {selectionError ? (
              <p role="alert" className="text-[10px] text-[#c2410c] dark:text-[#fb923c]">
                {selectionError}
              </p>
            ) : null}
          </section>
        ) : null}

        {!connections.length ? (
          <div className="rounded-xl border border-dashed border-bd-40 bg-bk-80 p-5 text-center">
            <p className="text-[11px] font-medium text-fg-40">No Resend accounts connected</p>
            <p className="mt-1 text-[10px] text-fg-70">Add an account to continue.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddAccount(true)}
              className="mt-3 border-bd-40 bg-bk-70 text-fg-50 hover:bg-bk-60 hover:text-fg-40"
            >
              <Plus className="size-3.5" />
              New account
            </Button>
          </div>
        ) : null}

        <AddAccountModal
          open={showAddAccount}
          connectionsCount={connections.length}
          pending={pending}
          state={state}
          action={action}
          onOpenChange={setShowAddAccount}
        />

      {managedConnection ? (
        <ManageAccountModal
          connection={managedConnection}
          onClose={() => setManagedConnection(undefined)}
          onChanged={() => {
            setManagedConnection(undefined);
            router.refresh();
          }}
        />
      ) : null}
    </SetupShell>
  );
}

function AddAccountModal({
  open,
  connectionsCount,
  pending,
  state,
  action,
  onOpenChange,
}: {
  open: boolean;
  connectionsCount: number;
  pending: boolean;
  state: ConnectionFormState;
  action: (formData: FormData) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
      <ModalContent size="custom" className="flex w-full max-w-[28rem] flex-col border-bd-30 bg-bk-90 sm:w-[28rem]">
        <ModalHeader>
          <ModalTitle>{connectionsCount ? "Add another account" : "Connect Resend"}</ModalTitle>
          <ModalDescription>
            Connect an account to choose one of its verified domains.
          </ModalDescription>
        </ModalHeader>
        <form action={action}>
          <ModalBody className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] text-fg-60">
                Account name
              </span>
              <Input
                name="label"
                required
                maxLength={80}
                placeholder="Acme Resend"
                className="h-[26px] rounded border-bd-40 bg-bk-80 px-2 py-1.5 text-[11px] text-fg-50 shadow-none hover:border-bd-40 focus:border-ac-02 focus:ring-1 focus:ring-inset focus:ring-ac-02"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] text-fg-60">Resend API key</span>
              <Input
                name="apiKey"
                type="password"
                required
                autoComplete="off"
                placeholder="re_..."
                className="h-[26px] rounded border-bd-40 bg-bk-80 px-2 py-1.5 text-[11px] text-fg-50 shadow-none hover:border-bd-40 focus:border-ac-02 focus:ring-1 focus:ring-inset focus:ring-ac-02"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] text-fg-60">
                Webhook signing secret <span className="text-fg-70">(Optional)</span>
              </span>
              <Input
                name="webhookSecret"
                type="password"
                autoComplete="off"
                placeholder="whsec_..."
                className="h-[26px] rounded border-bd-40 bg-bk-80 px-2 py-1.5 text-[11px] text-fg-50 shadow-none hover:border-bd-40 focus:border-ac-02 focus:ring-1 focus:ring-inset focus:ring-ac-02"
              />
            </label>
            <div className="rounded-lg border border-bd-30 bg-bk-80 px-3 py-2.5">
              <p className="text-[10px] font-medium text-fg-50">Full-access key required</p>
              <p className="mt-0.5 text-[9px] leading-4 text-fg-70">
                Sending-only and domain-restricted keys cannot power an inbox. Resend does not expose the account owner through an API key, so choose a recognizable local name.
              </p>
            </div>
            {state.error ? (
              <p role="alert" className="text-[11px] text-[#c2410c] dark:text-[#fb923c]">
                {state.error}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter align="right" className="flex-col pt-1 sm:flex-row">
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => onOpenChange(false)} className="w-full bg-bk-80 hover:bg-bk-70 sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={pending} className="w-full sm:w-auto">
              {pending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : connectionsCount ? (
                <Plus className="size-3.5" />
              ) : (
                <Check className="size-3.5" />
              )}
              {pending ? "Checking..." : "Connect account"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

function ManageAccountModal({
  connection,
  onClose,
  onChanged,
}: {
  connection: Connection;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [label, setLabel] = useState(connection.label);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const needsAttention = connection.status !== "active";

  async function handleSave() {
    if (needsAttention && !apiKey.trim()) {
      setError("Enter a new full-access Resend API key.");
      return;
    }

    setSaving(true);
    setError("");

    if (apiKey.trim()) {
      const keyResult = await replaceConnectionApiKeyAction(connection.id, apiKey);
      if (!keyResult.ok) {
        setSaving(false);
        setError(keyResult.error);
        return;
      }
    }

    const labelResult = await updateConnectionLabelAction(connection.id, label);
    if (!labelResult.ok) {
      setSaving(false);
      setError(labelResult.error);
      return;
    }

    if (webhookSecret.trim()) {
      const webhookResult = await saveWebhookSecretAction(
        connection.id,
        webhookSecret,
      );
      if (!webhookResult.ok) {
        setSaving(false);
        setError(webhookResult.error ?? "Unable to save the webhook secret.");
        return;
      }
    }

    setSaving(false);
    onChanged();
  }

  return (
    <Modal open onOpenChange={(open) => !open && !saving && onClose()}>
      <ModalContent size="custom" className="flex w-full max-w-[28rem] flex-col border-bd-30 bg-bk-90 sm:w-[28rem]">
        <ModalHeader>
          <ModalTitle>Manage Resend account</ModalTitle>
          <ModalDescription>
            Update this account without affecting its mailboxes or email history.
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-3">
          {needsAttention ? (
            <div className="rounded-lg border border-[#c2410c]/30 bg-[#c2410c]/5 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-medium text-[#c2410c] dark:text-[#fb923c]">
                <AlertTriangle className="size-3" />
                API key required
              </p>
              <p className="mt-1 text-[9px] leading-4 text-fg-60">
                Update the key to restore syncing for this account.
              </p>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-[11px] text-fg-60">Account name</span>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={80}
              disabled={saving}
              className="h-[26px] rounded border-bd-40 bg-bk-80 px-2 py-1.5 text-[11px] text-fg-50 shadow-none hover:border-bd-40 focus:border-ac-02 focus:ring-1 focus:ring-inset focus:ring-ac-02"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] text-fg-60">
              {needsAttention ? "New full-access API key" : "Replace API key"}
            </span>
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
              placeholder={needsAttention ? "re_..." : "Leave blank to keep the current key"}
              disabled={saving}
              className="h-[26px] rounded border-bd-40 bg-bk-80 px-2 py-1.5 text-[11px] text-fg-50 shadow-none hover:border-bd-40 focus:border-ac-02 focus:ring-1 focus:ring-inset focus:ring-ac-02"
            />
          </label>

          <label className="block">
            <span className="mb-0.5 block text-[11px] text-fg-60">
              Webhook signing secret <span className="text-fg-70">(Optional)</span>
            </span>
            <span className="mb-1.5 block break-all text-[9px] leading-4 text-fg-70">
              {connection.webhookPath}
            </span>
            <Input
              type="password"
              value={webhookSecret}
              onChange={(event) => setWebhookSecret(event.target.value)}
              placeholder={
                connection.webhookConfigured
                  ? "Leave blank to keep the signing secret"
                  : "Webhook signing secret (optional)"
              }
              disabled={saving}
              className="h-[26px] rounded border-bd-40 bg-bk-80 px-2 py-1.5 text-[11px] text-fg-50 shadow-none hover:border-bd-40 focus:border-ac-02 focus:ring-1 focus:ring-inset focus:ring-ac-02"
            />
          </label>

          {error ? (
            <p role="alert" className="text-[10px] text-[#c2410c] dark:text-[#fb923c]">
              {error}
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter align="right" className="flex-col pt-1 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={onClose}
            className="w-full bg-bk-80 hover:bg-bk-70 sm:w-auto"
          >
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" disabled={saving} onClick={() => void handleSave()} className="w-full sm:w-auto">
            {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
