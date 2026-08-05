"use client";

import Link from "next/link";
import type { FocusEvent } from "react";

import { Tooltip } from "@/components/reusables/tooltip";
import type { Connection, ConnectionDomain } from "@/lib/connection/types";
import type { Mailbox } from "@/lib/mailbox/types";
import { cn } from "@/lib/utils";

import { logoutAction } from "../../auth/actions";

type MailboxMenuVariant = "full" | "icon";
type MailboxMenuPlacement = "bottom-left" | "bottom-right" | "top" | "right";

interface MailboxMenuProps {
  activeConnection: Connection;
  activeDomain: ConnectionDomain;
  mailboxes: Mailbox[];
  open: boolean;
  placement: MailboxMenuPlacement;
  selectedMailbox?: Mailbox;
  variant: MailboxMenuVariant;
  onAdd: () => void;
  onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onManage: () => void;
  onDisconnect: () => void;
  onSelect: (mailbox: Mailbox) => void;
  onToggle: () => void;
}

export function MailboxMenu({
  activeConnection,
  activeDomain,
  mailboxes,
  open,
  placement,
  selectedMailbox,
  variant,
  onAdd,
  onBlur,
  onManage,
  onDisconnect,
  onSelect,
  onToggle,
}: MailboxMenuProps) {
  return (
    <div className="relative" onBlur={onBlur}>
      <MailboxMenuTrigger
        activeConnection={activeConnection}
        activeDomain={activeDomain}
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
          onDisconnect={onDisconnect}
          onSelect={onSelect}
        />
      ) : null}
    </div>
  );
}

function MailboxMenuTrigger({
  activeConnection,
  activeDomain,
  open,
  selectedMailbox,
  variant,
  onToggle,
}: {
  activeConnection: Connection;
  activeDomain: ConnectionDomain;
  open: boolean;
  selectedMailbox?: Mailbox;
  variant: MailboxMenuVariant;
  onToggle: () => void;
}) {
  if (variant === "icon") {
    return (
      <Tooltip
        content={`${activeConnection.label} · ${activeDomain.name}`}
        position="right"
        disabled={open}
      >
        <button
          type="button"
          aria-label={`Workspace: ${activeConnection.label}, ${activeDomain.name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={onToggle}
          className={cn(
            "grid size-7 cursor-pointer place-items-center rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-ac-02",
            open ? "bg-bk-60" : "hover:bg-bk-80",
          )}
        >
          <AccountAvatar connection={activeConnection} />
        </button>
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
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors focus-visible:ring-1 focus-visible:ring-ac-02",
        open ? "bg-bk-60" : "hover:bg-bk-70",
      )}
    >
      <AccountAvatar connection={activeConnection} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium text-fg-40">
          {activeConnection.label}
        </span>
        <span className="block truncate text-[9px] text-fg-70">
          {activeDomain.name}{selectedMailbox ? ` · ${selectedMailbox.name}` : ""}
        </span>
      </span>
      <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true" className={cn("shrink-0 text-fg-70 transition-transform", open && "rotate-180")}>
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
  onDisconnect,
  onSelect,
}: {
  mailboxes: Mailbox[];
  placement: MailboxMenuPlacement;
  selectedMailbox?: Mailbox;
  onAdd: () => void;
  onManage: () => void;
  onDisconnect: () => void;
  onSelect: (mailbox: Mailbox) => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Workspace and mailbox options"
      className={cn(
        "absolute z-40 overflow-hidden rounded-lg border border-bd-40 bg-bk-80 p-1 shadow-md",
        placement === "right" && "bottom-0 left-full ml-1 w-[220px]",
        placement === "top" && "right-0 bottom-full left-0 mb-1",
        placement === "bottom-right" && "top-full right-0 mt-1 w-[min(240px,calc(100vw-24px))]",
        placement === "bottom-left" && "top-full left-0 mt-1 w-[min(240px,calc(100vw-24px))]",
      )}
    >
      <div className="mb-1 rounded-md bg-bk-70 p-0.5">
        {mailboxes.length > 1 ? (
          <>
          <p className="px-2.5 py-1 text-[10px] text-fg-60">Switch mailbox</p>
          {mailboxes.map((mailbox) => (
            <button
              key={mailbox.id}
              type="button"
              role="menuitemradio"
              aria-checked={mailbox.id === selectedMailbox?.id}
              onClick={() => onSelect(mailbox)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02",
                mailbox.id === selectedMailbox?.id && "bg-bk-60",
              )}
            >
              <MailboxAvatar mailbox={mailbox} />
              <span className="flex min-w-0 flex-1 items-baseline gap-1 truncate text-[11px]">
                <span className="shrink-0 text-fg-50">{mailbox.name}</span>
                <span className="truncate text-[10px] text-fg-70">&lt;{mailbox.email}&gt;</span>
              </span>
            </button>
          ))}
          </>
        ) : null}

        <button type="button" role="menuitem" onClick={onAdd} className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1 text-[11px] text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02">
          New mailbox
        </button>
        {mailboxes.length ? (
          <button type="button" role="menuitem" onClick={onManage} className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1 text-[11px] text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02">
            Manage mailboxes
          </button>
        ) : null}
      </div>

      <div>
        <Link href="/setup/account" role="menuitem" className="flex w-full items-center rounded-md px-2 py-1 text-[11px] text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02">
          Switch account
        </Link>
        <Link href="/setup/domain" role="menuitem" className="flex w-full items-center rounded-md px-2 py-1 text-[11px] text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02">
          Switch domain
        </Link>
      </div>
      <button type="button" role="menuitem" onClick={onDisconnect} className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1 text-[11px] text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02">
          Sign out account
      </button>

      <form action={logoutAction}>
        <button type="submit" role="menuitem" className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1 text-[11px] text-fg-50 hover:bg-bk-60 focus-visible:ring-1 focus-visible:ring-ac-02">
          Lock app
        </button>
      </form>
    </div>
  );
}

export function MailboxAvatar({ mailbox }: { mailbox?: Mailbox }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-bk-50 text-[9px] font-medium text-fg-50">
      {mailbox?.name.charAt(0).toUpperCase() || "+"}
    </span>
  );
}

function AccountAvatar({ connection }: { connection: Connection }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-bk-50 text-[9px] font-medium text-fg-50">
      {connection.label.charAt(0).toUpperCase()}
    </span>
  );
}
