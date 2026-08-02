"use client";

import { Check, CirclePlus, LogOut, Settings } from "lucide-react";
import type { FocusEvent } from "react";

import { Tooltip } from "@/components/reusables/tooltip";
import type { Mailbox } from "@/lib/mailbox/types";
import { cn } from "@/lib/utils";

import { logoutAction } from "../../auth/actions";

type MailboxMenuVariant = "full" | "icon";
type MailboxMenuPlacement = "bottom-left" | "bottom-right" | "top" | "right";

interface MailboxMenuProps {
  mailboxes: Mailbox[];
  open: boolean;
  placement: MailboxMenuPlacement;
  selectedMailbox?: Mailbox;
  variant: MailboxMenuVariant;
  onAdd: () => void;
  onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onManage: () => void;
  onSelect: (mailbox: Mailbox) => void;
  onToggle: () => void;
}

export function MailboxMenu({
  mailboxes,
  open,
  placement,
  selectedMailbox,
  variant,
  onAdd,
  onBlur,
  onManage,
  onSelect,
  onToggle,
}: MailboxMenuProps) {
  return (
    <div className="relative" onBlur={onBlur}>
      <MailboxMenuTrigger
        open={open}
        selectedMailbox={selectedMailbox}
        variant={variant}
        onToggle={onToggle}
      />

      {open ? (
        <MailboxMenuContent
          mailboxes={mailboxes}
          placement={placement}
          selectedMailbox={selectedMailbox}
          onAdd={onAdd}
          onManage={onManage}
          onSelect={onSelect}
        />
      ) : null}
    </div>
  );
}

function MailboxMenuTrigger({
  open,
  selectedMailbox,
  variant,
  onToggle,
}: {
  open: boolean;
  selectedMailbox?: Mailbox;
  variant: MailboxMenuVariant;
  onToggle: () => void;
}) {
  if (variant === "icon") {
    const button = (
      <button
        type="button"
        aria-label={
          selectedMailbox
            ? `Mailbox: ${selectedMailbox.email}`
            : "Configure mailbox"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          "grid size-7 cursor-pointer place-items-center rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-ac-02",
          open ? "bg-bk-60" : "hover:bg-bk-80",
        )}
      >
        <MailboxAvatar mailbox={selectedMailbox} />
      </button>
    );

    return (
      <Tooltip
        content={
          selectedMailbox ? selectedMailbox.email : "Configure mailbox"
        }
        position="right"
        disabled={open}
      >
        {button}
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-haspopup="menu"
      aria-expanded={open}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-bk-70 focus-visible:ring-1 focus-visible:ring-ac-02",
        open && "bg-bk-60",
      )}
    >
      <MailboxAvatar mailbox={selectedMailbox} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium text-fg-40">
          {selectedMailbox?.name || "Configure mailbox"}
        </span>
        <span className="block truncate text-[9px] text-fg-70">
          {selectedMailbox?.email || "Connect a Resend mailbox"}
        </span>
      </span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 20 20"
        aria-hidden="true"
        className={cn(
          "shrink-0 text-fg-70 transition-transform",
          open && "rotate-180",
        )}
      >
        <path fill="currentColor" d="m5.5 7.5 4.5 4.5 4.5-4.5" />
      </svg>
    </button>
  );
}

function MailboxMenuContent({
  mailboxes,
  placement,
  selectedMailbox,
  onAdd,
  onManage,
  onSelect,
}: {
  mailboxes: Mailbox[];
  placement: MailboxMenuPlacement;
  selectedMailbox?: Mailbox;
  onAdd: () => void;
  onManage: () => void;
  onSelect: (mailbox: Mailbox) => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Mailbox options"
      className={cn(
        "absolute z-40 overflow-hidden rounded-lg border border-bd-40 bg-bk-80 p-1 shadow-md",
        placement === "right" && "bottom-0 left-full ml-1 w-[220px]",
        placement === "top" && "right-0 bottom-full left-0 mb-1",
        placement === "bottom-right" &&
          "top-full right-0 mt-1 w-[min(240px,calc(100vw-24px))]",
        placement === "bottom-left" &&
          "top-full left-0 mt-1 w-[min(240px,calc(100vw-24px))]",
      )}
    >
      {mailboxes.length > 1 ? (
        <>
          <p className="px-2.5 py-1 text-[10px] tracking-tight text-fg-60">
            Switch mailboxes
          </p>
          {mailboxes.map((mailbox) => (
            <button
              key={mailbox.id}
              type="button"
              role="menuitemradio"
              aria-checked={mailbox.id === selectedMailbox?.id}
              onClick={() => onSelect(mailbox)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1 text-left text-[11px] tracking-tight text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02"
            >
              <MailboxAvatar mailbox={mailbox} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] text-fg-40">
                  {mailbox.name}
                </span>
                <span className="block truncate text-[9px] text-fg-70">
                  {mailbox.email}
                </span>
              </span>
              {mailbox.id === selectedMailbox?.id ? (
                <Check
                  aria-hidden="true"
                  className="size-3 shrink-0 text-ac-01"
                />
              ) : null}
            </button>
          ))}
          <div className="my-1 border-t border-bd-40" />
        </>
      ) : null}

      <button
        type="button"
        role="menuitem"
        onClick={onAdd}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1 text-[11px] tracking-tight text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02"
      >
        <CirclePlus aria-hidden="true" className="size-3 text-fg-60" />
        New mailbox
      </button>

      {mailboxes.length ? (
        <button
          type="button"
          role="menuitem"
          onClick={onManage}
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1 text-[11px] tracking-tight text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02"
        >
          <Settings
            aria-hidden="true"
            className="size-3 text-fg-60"
          />
          Manage mailboxes
        </button>
      ) : null}

      <div className="my-1 border-t border-bd-40" />

      <form action={logoutAction}>
        <button
          type="submit"
          role="menuitem"
          className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1 text-[11px] tracking-tight text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02"
        >
          <LogOut
            aria-hidden="true"
            className="size-3 text-fg-60"
          />
          Log out
        </button>
      </form>
    </div>
  );
}

export function MailboxAvatar({ mailbox }: { mailbox?: Mailbox }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-bk-50 text-[10px] font-medium text-fg-50">
      {mailbox?.name.charAt(0).toUpperCase() || "+"}
    </span>
  );
}
