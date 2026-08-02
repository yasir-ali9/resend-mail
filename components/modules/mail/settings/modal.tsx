"use client";

import {
  ChevronDown,
  Mail,
  PenLine,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/reusables/button";
import {
  Modal,
  ModalContent,
} from "@/components/reusables/modal";
import { Select } from "@/components/reusables/select";
import { ThemeToggle, ThemeVariantSelect } from "@/components/reusables/theme-toggle";
import { useToast } from "@/components/reusables/toast";
import type { Mailbox } from "@/lib/mailbox/types";
import { cn } from "@/lib/utils";

import { updateMailboxSignatureAction } from "./actions";

type SettingsTab = "general" | "signatures";

interface SettingsModalProps {
  open: boolean;
  mailboxes: Mailbox[];
  selectedMailbox?: Mailbox;
  onAddMailboxRequested: () => void;
  onOpenChange: (open: boolean) => void;
  onMailboxUpdated: (mailbox: Mailbox) => void;
}

interface SettingsNavigationItem {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
}

const navigation: SettingsNavigationItem[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "signatures", label: "Signatures", icon: PenLine },
];

const MAX_SIGNATURE_LENGTH = 5_000;

export function SettingsModal({
  open,
  mailboxes,
  selectedMailbox,
  onAddMailboxRequested,
  onOpenChange,
  onMailboxUpdated,
}: SettingsModalProps) {
  const initialMailboxId = selectedMailbox?.id ?? mailboxes[0]?.id ?? "";
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [expandedMobileTab, setExpandedMobileTab] =
    useState<SettingsTab | null>(null);
  const [signatureMailboxId, setSignatureMailboxId] =
    useState(initialMailboxId);
  const [signatureDrafts, setSignatureDrafts] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      mailboxes.map((mailbox) => [mailbox.id, mailbox.signature]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const signatureMailbox =
    mailboxes.find((mailbox) => mailbox.id === signatureMailboxId) ??
    mailboxes[0];
  const signature = signatureMailbox
    ? (signatureDrafts[signatureMailbox.id] ?? signatureMailbox.signature)
    : "";
  const signatureChanged = Boolean(
    signatureMailbox && signature !== signatureMailbox.signature,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!saving) {
      if (!nextOpen) {
        setExpandedMobileTab(null);
      }
      onOpenChange(nextOpen);
    }
  }

  function handleSignatureChange(value: string) {
    if (!signatureMailbox) {
      return;
    }

    setSignatureDrafts((currentDrafts) => ({
      ...currentDrafts,
      [signatureMailbox.id]: value,
    }));
    setError("");
  }

  async function saveSignature() {
    if (!signatureMailbox || !signatureChanged) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await updateMailboxSignatureAction({
        mailboxId: signatureMailbox.id,
        signature,
      });

      if (
        !result.ok ||
        !result.mailboxId ||
        result.signature === undefined
      ) {
        const message = result.error || "Unable to save this signature.";
        setError(message);
        toast(message, "error");
        return;
      }

      const savedMailboxId = result.mailboxId;
      const savedSignature = result.signature;

      onMailboxUpdated({
        ...signatureMailbox,
        signature: savedSignature,
      });
      setSignatureDrafts((currentDrafts) => ({
        ...currentDrafts,
        [savedMailboxId]: savedSignature,
      }));
      toast(
        savedSignature ? "Signature saved" : "Signature removed",
        "success",
      );
    } catch {
      const message = "Unable to save this signature.";
      setError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      ariaLabelledBy="settings-modal-title"
      overlayClassName="p-0"
    >
      <ModalContent
        size="2xl"
        className="h-dvh max-h-dvh w-screen max-w-none overflow-hidden rounded-none border-0 bg-bk-90 p-0 sm:h-[min(520px,calc(100dvh-32px))] sm:w-[min(720px,calc(100vw-32px))] sm:rounded-xl sm:border sm:border-bd-30"
      >
        <h1 id="settings-modal-title" className="sr-only">
          Settings
        </h1>
        <div className="flex h-full min-h-0 flex-col sm:hidden">
          <header className="flex h-12 shrink-0 items-center justify-between px-4">
            <p className="truncate text-[13px] font-medium text-fg-30">
              Settings
            </p>
            <CloseSettingsButton
              disabled={saving}
              onClick={() => handleOpenChange(false)}
            />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {navigation.map(({ id, label, icon: Icon }) => {
              const expanded = expandedMobileTab === id;
              const panelId = `mobile-settings-panel-${id}`;

              return (
                <section key={id} className="border-b border-bd-30">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => {
                      setExpandedMobileTab((currentTab) =>
                        currentTab === id ? null : id,
                      );
                      setError("");
                    }}
                    className={cn(
                      "flex h-12 w-full cursor-pointer items-center gap-3 px-4 text-left text-[12px] font-medium text-fg-50 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02",
                      expanded && "bg-bk-80 text-fg-30",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-fg-60"
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="grid size-7 shrink-0 place-items-center">
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          "size-3.5 text-fg-60 transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    </span>
                  </button>

                  {expanded ? (
                    id === "general" ? (
                      <GeneralSettings
                        panelId={panelId}
                        role="region"
                        className="px-4 pt-3 pb-6"
                        mailboxes={mailboxes}
                        selectedMailbox={selectedMailbox}
                        onAddMailboxRequested={onAddMailboxRequested}
                      />
                    ) : (
                      <SignatureSettings
                        panelId={panelId}
                        role="region"
                        className="px-4 pt-3 pb-6"
                        mailboxes={mailboxes}
                        signatureMailbox={signatureMailbox}
                        signature={signature}
                        signatureChanged={signatureChanged}
                        saving={saving}
                        error={error}
                        onMailboxChange={(mailboxId) => {
                          setSignatureMailboxId(mailboxId);
                          setError("");
                        }}
                        onSignatureChange={handleSignatureChange}
                        onSave={() => void saveSignature()}
                      />
                    )
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>

        <div className="hidden h-full min-h-0 sm:flex sm:flex-row">
          <aside className="flex shrink-0 flex-col border-b border-bd-30 bg-bk-80 px-2 py-0 sm:w-48 sm:border-r sm:border-b-0">
            <div className="hidden h-12 items-center gap-2 px-3 sm:flex">
              <p className="truncate text-[13px] font-medium text-fg-30">
                Settings
              </p>
            </div>

            <nav
              aria-label="Settings"
              role="tablist"
              aria-orientation="vertical"
              className="flex gap-1 py-2 sm:mt-1 sm:block sm:space-y-0.5 sm:py-0"
            >
              {navigation.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;

                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`desktop-settings-panel-${id}`}
                    onClick={() => {
                      setActiveTab(id);
                      setError("");
                    }}
                    className={cn(
                      "flex h-8 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-2 text-[11px] font-medium text-fg-60 transition-colors hover:bg-bk-70 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02 sm:w-full sm:flex-none sm:justify-start",
                      active && "bg-bk-60 text-fg-30",
                    )}
                    title={label}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-3.5 shrink-0"
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col bg-bk-90">
            <header className="flex h-12 shrink-0 items-center justify-between px-4 sm:px-5">
              <p className="text-[13px] font-medium text-fg-30">
                {activeTab === "general" ? "General" : "Signatures"}
              </p>
              <CloseSettingsButton
                disabled={saving}
                onClick={() => handleOpenChange(false)}
              />
            </header>

            {activeTab === "general" ? (
              <GeneralSettings
                panelId="desktop-settings-panel-general"
                role="tabpanel"
                mailboxes={mailboxes}
                selectedMailbox={selectedMailbox}
                onAddMailboxRequested={onAddMailboxRequested}
              />
            ) : (
              <SignatureSettings
                panelId="desktop-settings-panel-signatures"
                role="tabpanel"
                mailboxes={mailboxes}
                signatureMailbox={signatureMailbox}
                signature={signature}
                signatureChanged={signatureChanged}
                saving={saving}
                error={error}
                onMailboxChange={(mailboxId) => {
                  setSignatureMailboxId(mailboxId);
                  setError("");
                }}
                onSignatureChange={handleSignatureChange}
                onSave={() => void saveSignature()}
              />
            )}
          </section>
        </div>
      </ModalContent>
    </Modal>
  );
}

function CloseSettingsButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid size-7 cursor-pointer place-items-center rounded-md text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Close settings"
    >
      <X aria-hidden="true" className="size-3.5" />
    </button>
  );
}

function GeneralSettings({
  panelId,
  role,
  className,
  mailboxes,
  selectedMailbox,
  onAddMailboxRequested,
}: {
  panelId: string;
  role: "region" | "tabpanel";
  className?: string;
  mailboxes: Mailbox[];
  selectedMailbox?: Mailbox;
  onAddMailboxRequested: () => void;
}) {
  return (
    <div
      id={panelId}
      role={role}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-6",
        className,
      )}
    >
      <div className="mx-auto max-w-2xl">
        <SettingsSection title="Mailbox">
          <SettingsRow
            icon={Mail}
            title="Current mailbox"
            description={
              selectedMailbox
                ? `${selectedMailbox.name} <${selectedMailbox.email}>`
                : "No mailbox configured"
            }
            value={`${mailboxes.length} ${
              mailboxes.length === 1 ? "mailbox" : "mailboxes"
            }`}
            control={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddMailboxRequested}
                className="w-full shrink-0 border-bd-40 bg-bk-70 text-fg-60 hover:border-bd-40 hover:bg-bk-60 hover:text-fg-50 sm:w-auto"
              >
                New mailbox
              </Button>
            }
          />
        </SettingsSection>

        <SettingsSection title="Customize">
          <SettingsRow
            icon={Settings2}
            title="Color mode"
            description="Switch between the light and dark interface."
            control={<ThemeToggle />}
            controlLayout="inline"
          />
          <SettingsRow
            icon={Settings2}
            title="Theme variant"
            description="Choose between blue-tinted or neutral grey tones."
            control={
              <ThemeVariantSelect className="w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none" />
            }
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function SignatureSettings({
  panelId,
  role,
  className,
  mailboxes,
  signatureMailbox,
  signature,
  signatureChanged,
  saving,
  error,
  onMailboxChange,
  onSignatureChange,
  onSave,
}: {
  panelId: string;
  role: "region" | "tabpanel";
  className?: string;
  mailboxes: Mailbox[];
  signatureMailbox?: Mailbox;
  signature: string;
  signatureChanged: boolean;
  saving: boolean;
  error: string;
  onMailboxChange: (mailboxId: string) => void;
  onSignatureChange: (signature: string) => void;
  onSave: () => void;
}) {
  return (
    <div
      id={panelId}
      role={role}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-6",
        className,
      )}
    >
      <div className="mx-auto max-w-2xl">
        {signatureMailbox ? (
          <div className="space-y-4">
            <section>
              <h3 className="mb-2 text-[11px] font-medium text-fg-60">
                Mailbox
              </h3>
              <Select
                value={signatureMailbox.id}
                onChange={onMailboxChange}
                options={mailboxes.map((mailbox) => ({
                  label: `${mailbox.name} · ${mailbox.email}`,
                  value: mailbox.id,
                }))}
                className="max-w-sm"
                disabled={saving}
              />
            </section>

            <section>
              <h3 className="mb-2 flex items-center justify-between gap-4 text-[11px] font-medium text-fg-60">
                <span>Signature</span>
                <span className="text-[9px] font-normal text-fg-70">
                  {signature.length.toLocaleString()} /{" "}
                  {MAX_SIGNATURE_LENGTH.toLocaleString()}
                </span>
              </h3>
              <textarea
                value={signature}
                onChange={(event) =>
                  onSignatureChange(event.target.value)
                }
                maxLength={MAX_SIGNATURE_LENGTH}
                disabled={saving}
                placeholder={"Best regards,\nYour name"}
                className="min-h-24 w-full resize-y rounded-lg border border-bd-40 bg-bk-80 p-3 text-[12px] leading-5 text-fg-40 outline-none placeholder:text-fg-70 hover:border-bd-40 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </section>

            <div>
              <p className="mb-2 text-[11px] font-medium text-fg-60">
                Looks like
              </p>
              <div className="min-h-24 rounded-lg border border-bd-30 bg-bk-80 p-3 text-[12px] leading-5 whitespace-pre-wrap text-fg-50">
                {signature.trim() ? (
                  <>
                    <span className="text-fg-70">-- </span>
                    {"\n"}
                    {signature}
                  </>
                ) : (
                  <span className="text-fg-70">
                    No signature will be added for this mailbox.
                  </span>
                )}
              </div>
            </div>

            <div className="flex min-h-8 flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              {error ? (
                <p role="alert" className="text-[11px] text-fg-60">
                  {error}
                </p>
              ) : (
                <p className="text-[10px] text-fg-70">
                  Plain text keeps signatures predictable across email
                  clients.
                </p>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onSave}
                disabled={saving || !signatureChanged}
                className="w-full shrink-0 sm:w-auto"
              >
                {saving ? "Saving..." : "Save signature"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-bd-30 bg-bk-80 p-4">
            <p className="text-[11px] text-fg-60">
              Add a mailbox before configuring a signature.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="mb-2 text-[11px] font-medium text-fg-60">
        {title}
      </h3>
      <div className="overflow-hidden rounded-lg border border-bd-30 bg-bk-80">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  icon: Icon,
  title,
  description,
  value,
  control,
  controlLayout = "stacked",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  value?: string;
  control?: React.ReactNode;
  controlLayout?: "inline" | "stacked";
}) {
  return (
    <div className="flex min-h-14 flex-wrap items-start gap-3 px-3 py-3 sm:flex-nowrap sm:items-center sm:py-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-bk-70 text-fg-60">
        <Icon aria-hidden="true" className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-fg-40">
          {title}
        </span>
        <span className="mt-0.5 block text-[10px] text-fg-70 sm:truncate">
          {description}
        </span>
      </span>
      {value ? (
        <span className="shrink-0 text-[10px] text-fg-70">
          {value}
        </span>
      ) : null}
      {control ? (
        <span
          className={cn(
            "flex items-center justify-end sm:basis-auto sm:pl-0",
            controlLayout === "stacked"
              ? "basis-full pl-10"
              : "shrink-0 self-center",
          )}
        >
          {control}
        </span>
      ) : null}
    </div>
  );
}
