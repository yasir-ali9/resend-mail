import {
  Archive,
  Inbox,
  MoreVertical,
  Paperclip,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import type { MouseEventHandler } from "react";

import { Checkbox } from "@/components/reusables/checkbox";
import { Tooltip } from "@/components/reusables/tooltip";
import type { MailboxThread } from "@/lib/email/types";
import { cn } from "@/lib/utils";

import type { MailboxView } from "../thread/state";
import { Delivery } from "../thread/delivery";
import { formatEmailDate, senderName } from "../format";

interface ThreadRowProps {
  bulkUpdating: boolean;
  deletingPermanently: boolean;
  folder: MailboxView;
  mutationId?: string;
  selected: boolean;
  selectionMode: boolean;
  thread: MailboxThread;
  onArchive: (thread: MailboxThread) => void;
  onContextMenu: MouseEventHandler<HTMLLIElement>;
  onDeletePermanently: (thread: MailboxThread) => void;
  onMenu: MouseEventHandler<HTMLButtonElement>;
  onOpen: (thread: MailboxThread) => void;
  onSelect: (threadId: string) => void;
  onStar: (thread: MailboxThread) => void;
  onTrash: (thread: MailboxThread) => void;
}

export function ThreadRow({
  bulkUpdating,
  deletingPermanently,
  folder,
  mutationId,
  selected,
  selectionMode,
  thread,
  onArchive,
  onContextMenu,
  onDeletePermanently,
  onMenu,
  onOpen,
  onSelect,
  onStar,
  onTrash,
}: ThreadRowProps) {
  const email = thread.latestEmail;
  const unread = thread.unreadCount > 0;
  const busy = mutationId === thread.id;

  return (
    <li
      onContextMenu={onContextMenu}
      className={cn(
        "group flex min-w-0 items-stretch border-b border-bd-30 px-1 py-0 transition-colors hover:bg-bk-90 sm:pr-6 sm:pl-4",
        unread && "bg-bk-80",
        selected && "border-bd-40 bg-bk-80",
      )}
    >
      <span className="hidden shrink-0 items-center sm:flex">
        <SelectionButton
          bulkUpdating={bulkUpdating}
          selected={selected}
          threadId={thread.id}
          onSelect={onSelect}
        />
      </span>

      {selectionMode ? (
        <span className="flex shrink-0 items-center sm:hidden">
          <SelectionButton
            bulkUpdating={bulkUpdating}
            selected={selected}
            threadId={thread.id}
            onSelect={onSelect}
          />
        </span>
      ) : null}

      <Tooltip
        content={thread.starred ? "Unstar" : "Star"}
        position="right"
        className="hidden shrink-0 items-center sm:mr-2 sm:flex"
      >
        <button
          type="button"
          aria-label={
            thread.starred
              ? "Unstar conversation"
              : "Star conversation"
          }
          aria-pressed={thread.starred}
          disabled={busy}
          onClick={() => onStar(thread)}
          className={cn(
            "grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-70 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-50",
            thread.starred && "text-fg-40",
          )}
        >
          <Star
            aria-hidden="true"
            className={cn(
              "size-3.5",
              thread.starred && "fill-current",
            )}
          />
        </button>
      </Tooltip>

      <button
        type="button"
        onClick={() => onOpen(thread)}
        className="grid min-w-0 flex-1 cursor-pointer grid-cols-1 gap-0.5 py-2.5 text-left focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 sm:grid-cols-[minmax(140px,220px)_minmax(180px,1fr)] sm:items-center sm:gap-4 sm:py-3"
      >
        <span className="flex min-w-0 items-center gap-2 sm:contents">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "truncate text-[12px] font-medium text-fg-50",
                unread && "font-medium text-fg-30",
              )}
            >
              {email.direction === "outbound"
                ? email.to.join(", ")
                : senderName(email.from)}
            </span>
            {unread ? (
              <span
                aria-label={`${thread.unreadCount} unread`}
                className="size-1.5 shrink-0 rounded-full bg-ac-01"
              />
            ) : null}
            {thread.messageCount > 1 ? (
              <span className="shrink-0 text-[10px] text-fg-70">
                {thread.messageCount}
              </span>
            ) : null}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-fg-70 sm:hidden">
            <time dateTime={email.createdAt} className="text-[10px]">
              {formatEmailDate(email.createdAt)}
            </time>
          </span>
        </span>
        <span className="min-w-0 truncate text-[11px] text-fg-70 sm:text-[12px]">
          <span
            className={cn(
              "text-fg-50 sm:inline",
              unread && "font-medium text-fg-30",
            )}
          >
            {thread.subject}
          </span>
          {email.text ? (
            <span className="text-fg-70"> — {email.text}</span>
          ) : null}
        </span>
      </button>

      <Tooltip
        content="Conversation menu"
        position="left"
        className="shrink-0 self-center sm:hidden"
      >
        <button
          type="button"
          aria-label="Open conversation menu"
          onClick={onMenu}
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-70 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02"
        >
          <MoreVertical aria-hidden="true" className="size-3.5" />
        </button>
      </Tooltip>

      <span className="relative hidden w-40 shrink-0 self-stretch overflow-hidden sm:flex">
        <span className="flex w-full items-center justify-end gap-2 text-fg-70 transition-transform group-hover:-translate-x-28 group-focus-within:-translate-x-28">
          <Delivery email={email} mode="icon" />
          {thread.hasAttachments ? (
            <Paperclip
              aria-label="Conversation has attachments"
              className="size-3"
            />
          ) : null}
          <time dateTime={email.createdAt} className="text-[10px]">
            {formatEmailDate(email.createdAt)}
          </time>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {folder !== "trash" && folder !== "spam" ? (
            <Tooltip
              content={thread.archived ? "Move to inbox" : "Archive"}
              position="left"
            >
              <button
                type="button"
                aria-label={
                  thread.archived
                    ? "Move conversation to inbox"
                    : "Archive conversation"
                }
                disabled={busy}
                onClick={() => onArchive(thread)}
                className="grid size-7 cursor-pointer place-items-center rounded-md p-1.5 text-fg-70 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {thread.archived ? (
                  <Inbox aria-hidden="true" className="size-3.5" />
                ) : (
                  <Archive aria-hidden="true" className="size-3.5" />
                )}
              </button>
            </Tooltip>
          ) : null}

          <Tooltip
            content={folder === "trash" ? "Restore" : "Move to trash"}
            position="left"
          >
            <button
              type="button"
              aria-label={
                folder === "trash"
                  ? "Restore conversation"
                  : "Move conversation to trash"
              }
              disabled={busy}
              onClick={() => onTrash(thread)}
              className="grid size-7 cursor-pointer place-items-center rounded-md p-1.5 text-fg-70 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {folder === "trash" ? (
                <RotateCcw aria-hidden="true" className="size-3.5" />
              ) : (
                <Trash2 aria-hidden="true" className="size-3.5" />
              )}
            </button>
          </Tooltip>

          {folder === "trash" ? (
            <Tooltip
              content="Delete permanently"
              position="left"
              disabled={deletingPermanently}
            >
              <button
                type="button"
                aria-label="Delete conversation permanently"
                disabled={deletingPermanently}
                onClick={() => onDeletePermanently(thread)}
                className="grid size-7 cursor-pointer place-items-center rounded-md p-1.5 text-fg-70 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </button>
            </Tooltip>
          ) : null}

          <Tooltip content="More" position="left">
            <button
              type="button"
              aria-label="Open conversation menu"
              onClick={onMenu}
              className="grid size-7 cursor-pointer place-items-center rounded-md p-1.5 text-fg-70 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02"
            >
              <MoreVertical
                aria-hidden="true"
                className="size-3.5"
              />
            </button>
          </Tooltip>
        </span>
      </span>
    </li>
  );
}

function SelectionButton({
  bulkUpdating,
  selected,
  threadId,
  onSelect,
}: {
  bulkUpdating: boolean;
  selected: boolean;
  threadId: string;
  onSelect: (threadId: string) => void;
}) {
  return (
    <Tooltip
      content={selected ? "Remove from selection" : "Select conversation"}
      position="right"
      className="shrink-0"
      disabled={bulkUpdating}
    >
      <button
        type="button"
        aria-label={
          selected
            ? "Remove conversation from selection"
            : "Select conversation"
        }
        aria-pressed={selected}
        disabled={bulkUpdating}
        onClick={() => onSelect(threadId)}
        className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md p-1.5 text-fg-70 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Checkbox checked={selected} readOnly tabIndex={-1} />
      </button>
    </Tooltip>
  );
}
