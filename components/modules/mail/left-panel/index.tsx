"use client";

import {
  FileText,
  Inbox,
  Mails,
  Pencil,
  Send,
  ShieldAlert,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, type FocusEvent } from "react";

import { Button } from "@/components/reusables/button";
import { Logo } from "@/components/reusables/logo";
import { ResizablePanel } from "@/components/reusables/resizable";
import { Tooltip } from "@/components/reusables/tooltip";
import { useToast } from "@/components/reusables/toast";
import type { MailboxFolderCounts } from "@/lib/email/types";
import type { Connection, ConnectionDomain } from "@/lib/connection/types";
import type { Mailbox } from "@/lib/mailbox/types";
import { cn } from "@/lib/utils";

import type { HomeView } from "../types";
import { selectMailboxAction } from "./actions";
import { MailboxMenu } from "./mailbox-menu";
import { ManageMailboxesModal } from "./manage";

interface LeftPanelProps {
  activeView: HomeView;
  activeConnection: Connection;
  activeDomain: ConnectionDomain;
  collapsed?: boolean;
  composeOpen?: boolean;
  draftCount: number;
  folderCounts: MailboxFolderCounts;
  mailboxes: Mailbox[];
  mobile?: boolean;
  selectedMailbox?: Mailbox;
  onAddMailboxRequested: () => void;
  onDisconnectAccount: () => void;
  onMailboxDeleted: (
    deletedMailboxId: string,
    selectedMailbox?: Mailbox,
  ) => void;
  onMailboxSelect: (mailbox: Mailbox) => void;
  onMailboxUpdated: (mailbox: Mailbox) => void;
  onMobileClose?: () => void;
  onSidebarToggle: () => void;
  onViewChange: (view: HomeView) => void;
}

const navigation = [
  { id: "inbox" as const, label: "Inbox", icon: Inbox },
  { id: "starred" as const, label: "Starred", icon: Star },
  { id: "sent" as const, label: "Sent", icon: Send },
  { id: "drafts" as const, label: "Drafts", icon: FileText },
  { id: "everything" as const, label: "Everything", icon: Mails },
  { id: "spam" as const, label: "Spam", icon: ShieldAlert },
  { id: "trash" as const, label: "Trash", icon: Trash2 },
];

export function LeftPanel({
  activeView,
  activeConnection,
  activeDomain,
  collapsed = false,
  composeOpen = false,
  draftCount,
  folderCounts,
  mailboxes,
  mobile = false,
  selectedMailbox,
  onAddMailboxRequested,
  onDisconnectAccount,
  onMailboxDeleted,
  onMailboxSelect,
  onMailboxUpdated,
  onMobileClose,
  onSidebarToggle,
  onViewChange,
}: LeftPanelProps) {
  const [mailboxMenuOpen, setMailboxMenuOpen] = useState(false);
  const [manageMailboxesOpen, setManageMailboxesOpen] = useState(false);
  const { toast } = useToast();

  function handleMenuBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setMailboxMenuOpen(false);
    }
  }

  async function handleMailboxSelect(mailbox: Mailbox) {
    const previousMailbox = selectedMailbox;
    onMailboxSelect(mailbox);
    setMailboxMenuOpen(false);

    const result = await selectMailboxAction(mailbox.id);

    if (!result.ok) {
      if (previousMailbox) {
        onMailboxSelect(previousMailbox);
      }
      toast(result.error || "Unable to switch mailbox.", "error");
    }
  }

  function handleSidebarToggle() {
    setMailboxMenuOpen(false);
    onSidebarToggle();
  }

  const sharedNavigationProps = {
    activeView,
    draftCount,
    folderCounts,
    onViewChange,
  };
  const sharedMailboxProps = {
    activeConnection,
    activeDomain,
    mailboxes,
    selectedMailbox,
    open: mailboxMenuOpen,
    onToggle: () => setMailboxMenuOpen((open) => !open),
    onSelect: (mailbox: Mailbox) => void handleMailboxSelect(mailbox),
    onAdd: () => {
      setMailboxMenuOpen(false);
      onAddMailboxRequested();
    },
    onDisconnect: () => {
      setMailboxMenuOpen(false);
      onDisconnectAccount();
    },
    onManage: () => {
      setMailboxMenuOpen(false);
      setManageMailboxesOpen(true);
    },
    onBlur: handleMenuBlur,
  };

  if (mobile) {
    return (
      <>
        <aside
          aria-label="Mailbox navigation"
          className="flex h-full min-w-0 flex-col border-r border-bd-30/90 bg-bk-90"
        >
          <div className="flex h-12 shrink-0 items-center justify-between px-3">
            <Link
              href="/"
              aria-label="Resend Mail home"
              className="flex min-w-0 items-center gap-1.5"
            >
              <span className="grid size-7 shrink-0 place-items-center text-fg-50">
                <Logo className="size-7 -translate-x-0.5 -translate-y-px" />
              </span>
              <span className="truncate text-[12px] leading-none font-medium text-fg-30">
                Resend Mail
              </span>
            </Link>
            {onMobileClose ? (
              <button
                type="button"
                aria-label="Close mailbox navigation"
                onClick={onMobileClose}
                className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            ) : null}
          </div>

          <div className="px-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onViewChange("compose")}
              aria-pressed={composeOpen}
              className="h-8 w-full justify-start gap-2 border-bd-30 bg-bk-60 px-2.5 text-[11px] font-medium hover:border-bd-30 hover:!bg-bk-50"
            >
              <Pencil
                aria-hidden="true"
                className="size-3.5 text-fg-60"
              />
              <span>Compose</span>
              {composeOpen ? (
                <span
                  aria-hidden="true"
                  className="ml-auto mr-0.5 size-1 rounded-full bg-fg-70"
                />
              ) : null}
            </Button>
          </div>

          <MailboxNavigation {...sharedNavigationProps} />

          <div className="mt-auto space-y-2 p-2">
            <MailboxMenu
              {...sharedMailboxProps}
              placement="top"
              variant="full"
            />
          </div>
        </aside>

        <ManageMailboxesModal
          open={manageMailboxesOpen}
          mailboxes={mailboxes}
          onOpenChange={setManageMailboxesOpen}
          onAddRequested={onAddMailboxRequested}
          onMailboxDeleted={onMailboxDeleted}
          onMailboxUpdated={onMailboxUpdated}
        />
      </>
    );
  }

  return (
    <>
      {collapsed ? (
        <aside
          aria-label="Mailbox sidebar"
          className="hidden h-full w-12 shrink-0 flex-col border-r border-bd-30/90 bg-bk-90 md:flex"
        >
          <div className="flex h-12 items-center justify-center">
            <Tooltip content="Expand sidebar" position="right">
              <button
                type="button"
                aria-label="Expand sidebar"
                aria-expanded={false}
                onClick={handleSidebarToggle}
                className="grid size-7 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                <SidebarToggleIcon className="-scale-x-100" />
              </button>
            </Tooltip>
          </div>

          <div className="flex justify-center pt-2">
            <Tooltip content="Compose" position="right">
              <button
                type="button"
                aria-label="Compose"
                aria-pressed={composeOpen}
                onClick={() => onViewChange("compose")}
                className="grid size-7 cursor-pointer place-items-center rounded-md border border-bd-30 bg-bk-60 p-1.5 text-fg-60 transition-colors hover:border-bd-30 hover:bg-bk-50 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                <Pencil
                  aria-hidden="true"
                  className="size-3.5 text-fg-60"
                />
              </button>
            </Tooltip>
          </div>

          <MailboxNavigation {...sharedNavigationProps} collapsed />

          <div className="mt-auto flex flex-col items-center gap-1 pb-2">
            <MailboxMenu
              {...sharedMailboxProps}
              placement="right"
              variant="icon"
            />
          </div>
        </aside>
      ) : (
        <ResizablePanel
          defaultWidth={220}
          minWidth={190}
          maxWidth={300}
          position="left"
          className="hidden h-full border-r border-bd-30/90 !bg-bk-90 md:block"
        >
          <aside
            aria-label="Mailbox sidebar"
            className="flex h-full min-w-0 flex-col"
          >
            <div className="flex h-12 shrink-0 items-center justify-between px-2">
              <Link
                href="/"
                aria-label="Resend Mail home"
                className="flex min-w-0 items-center gap-1.5 px-1"
              >
                <span className="grid size-7 shrink-0 place-items-center text-fg-50">
                  <Logo className="size-7 -translate-x-0.5 -translate-y-px" />
                </span>
                <span className="truncate text-[12px] leading-none font-medium text-fg-30">
                  Resend Mail
                </span>
              </Link>

              <Tooltip content="Collapse sidebar" position="bottom">
                <button
                  type="button"
                  aria-label="Collapse sidebar"
                  aria-expanded={true}
                  onClick={handleSidebarToggle}
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
                >
                  <SidebarToggleIcon />
                </button>
              </Tooltip>
            </div>

            <div className="px-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onViewChange("compose")}
                aria-pressed={composeOpen}
                className="h-8 w-full justify-start gap-2 border-bd-30 bg-bk-60 px-2.5 text-[11px] font-medium hover:border-bd-30 hover:!bg-bk-50"
              >
                <Pencil
                  aria-hidden="true"
                  className="size-3.5 text-fg-60"
                />
                <span>Compose</span>
                {composeOpen ? (
                  <span
                    aria-hidden="true"
                    className="ml-auto mr-0.5 size-1 rounded-full bg-fg-70"
                  />
                ) : null}
              </Button>
            </div>

            <MailboxNavigation {...sharedNavigationProps} />

            <div className="mt-auto space-y-2 p-2">
              <MailboxMenu
                {...sharedMailboxProps}
                placement="top"
                variant="full"
              />
            </div>
          </aside>
        </ResizablePanel>
      )}

      <ManageMailboxesModal
        open={manageMailboxesOpen}
        mailboxes={mailboxes}
        onOpenChange={setManageMailboxesOpen}
        onAddRequested={onAddMailboxRequested}
        onMailboxDeleted={onMailboxDeleted}
        onMailboxUpdated={onMailboxUpdated}
      />
    </>
  );
}

function SidebarToggleIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4.67 9.336V4.67M6.417 1.75H7.583C9.783 1.75 10.883 1.75 11.567 2.433C12.25 3.117 12.25 4.217 12.25 6.417V7.583C12.25 9.783 12.25 10.883 11.567 11.567C10.883 12.25 9.783 12.25 7.583 12.25H6.417C4.217 12.25 3.117 12.25 2.433 11.567C1.75 10.883 1.75 9.783 1.75 7.583V6.417C1.75 4.217 1.75 3.117 2.433 2.433C3.117 1.75 4.217 1.75 6.417 1.75Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface MailboxNavigationProps {
  activeView: HomeView;
  collapsed?: boolean;
  draftCount: number;
  folderCounts: MailboxFolderCounts;
  onViewChange: (view: HomeView) => void;
}

function MailboxNavigation({
  activeView,
  collapsed = false,
  draftCount,
  folderCounts,
  onViewChange,
}: MailboxNavigationProps) {
  return (
    <nav
      aria-label="Mailbox"
      className={cn(
        "flex flex-col gap-0.5 pt-2",
        collapsed ? "px-1.5" : "px-2",
      )}
    >
      {navigation.map(({ id, label, icon: Icon }) => {
        const active = activeView === id;
        const unreadCount =
          id === "inbox" || id === "spam" || id === "starred"
            ? folderCounts[id]
            : 0;
        const count = id === "drafts" ? draftCount : unreadCount;
        const displayedCount =
          count > 999 ? "999+" : String(count);
        const accessibleLabel =
          id === "drafts" && count
            ? `${label}, ${count} saved`
            : unreadCount
              ? `${label}, ${unreadCount} unread`
              : label;
        const button = (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            className={cn(
              "relative flex cursor-pointer items-center rounded-md text-left text-[11px] font-medium text-fg-60 transition-colors focus-visible:ring-1 focus-visible:ring-ac-02",
              collapsed
                ? "mx-auto size-7 justify-center p-1.5"
                : "w-full gap-2.5 px-2 py-1.5",
              active ? "bg-bk-60 text-fg-30" : "hover:bg-bk-70 hover:text-fg-30",
            )}
            aria-current={active ? "page" : undefined}
            aria-label={accessibleLabel}
          >
            <Icon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-fg-60"
            />
            {collapsed ? (
              count ? (
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 right-0.5 text-[8px] leading-none tabular-nums text-fg-50"
                >
                  {count > 99 ? "99+" : displayedCount}
                </span>
              ) : null
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {count ? (
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[10px] tabular-nums text-fg-50"
                  >
                    {displayedCount}
                  </span>
                ) : null}
              </>
            )}
          </button>
        );

        return collapsed ? (
          <Tooltip key={id} content={accessibleLabel} position="right">
            {button}
          </Tooltip>
        ) : (
          button
        );
      })}
    </nav>
  );
}
