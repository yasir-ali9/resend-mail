"use client";

import {
  Inbox,
  LoaderCircle,
  Mails,
  Send,
  ShieldAlert,
  Star,
  Trash2,
} from "lucide-react";
import { useState, type MouseEvent } from "react";

import { Button } from "@/components/reusables/button";
import {
  ContextMenu,
  type ContextMenuItem,
} from "@/components/reusables/context-menu";
import type {
  EmailSearchFilters,
  EmailThreadBulkAction,
  MailboxEmail,
  MailboxThread,
} from "@/lib/email/types";

import { MailListSkeleton } from "./skeleton";
import type { ReplyMode } from "../thread";
import type { MailboxView } from "../thread/state";
import { ListHeader } from "./header";
import {
  getThreadMenuItems,
  type ThreadMenuActions,
} from "./menu";
import { ThreadRow } from "./row";

interface MailListProps {
  deletingPermanently: boolean;
  filters: EmailSearchFilters;
  folder: MailboxView;
  hasActiveSearch: boolean;
  loadError: string;
  loading: boolean;
  loadingMore: boolean;
  mutationId?: string;
  nextCursor: string | null;
  refreshing: boolean;
  search: string;
  selectedThreadIds: Set<string>;
  selection: {
    all: boolean;
    allArchived: boolean;
    allStarred: boolean;
    hasInbound: boolean;
    hasUnread: boolean;
    some: boolean;
  };
  updating: boolean;
  threads: MailboxThread[];
  actions: {
    archive: (thread: MailboxThread) => void;
    bulk: (action: EmailThreadBulkAction) => void;
    canReplyAll: (email: MailboxEmail) => boolean;
    cloneTemplate: (email: MailboxEmail) => void;
    clearSelection: () => void;
    deletePermanently: (thread: MailboxThread) => void;
    deleteSelected: () => void;
    emptyTrash: () => void;
    filtersChange: (filters: EmailSearchFilters) => void;
    forward: (email: MailboxEmail) => void;
    loadMore: () => void;
    markRead: (thread: MailboxThread) => void;
    markUnread: (thread: MailboxThread) => void;
    open: (thread: MailboxThread) => void;
    refresh: () => void;
    reply: (email: MailboxEmail, mode: ReplyMode) => void;
    retry: () => void;
    searchChange: (value: string) => void;
    searchSubmit: () => void;
    settingsOpen: () => void;
    spam: (thread: MailboxThread) => void;
    star: (thread: MailboxThread) => void;
    toggleAll: () => void;
    toggleSelection: (threadId: string) => void;
    trash: (thread: MailboxThread) => void;
  };
}

interface ThreadContextMenu {
  items: ContextMenuItem[];
  position: { x: number; y: number };
}

export function MailList({
  actions,
  deletingPermanently,
  filters,
  folder,
  hasActiveSearch,
  loadError,
  loading,
  loadingMore,
  mutationId,
  nextCursor,
  refreshing,
  search,
  selectedThreadIds,
  selection,
  threads,
  updating,
}: MailListProps) {
  const [contextMenu, setContextMenu] =
    useState<ThreadContextMenu>();
  const menuActions: ThreadMenuActions = {
    archive: actions.archive,
    canReplyAll: actions.canReplyAll,
    cloneTemplate: actions.cloneTemplate,
    deletePermanently: actions.deletePermanently,
    forward: actions.forward,
    markRead: actions.markRead,
    markUnread: actions.markUnread,
    open: actions.open,
    reply: actions.reply,
    select: actions.toggleSelection,
    spam: actions.spam,
    star: actions.star,
    trash: actions.trash,
  };

  function showContextMenu(
    thread: MailboxThread,
    event: MouseEvent<HTMLElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      items: getThreadMenuItems({
        actions: menuActions,
        busy: mutationId === thread.id,
        folder,
        selected: selectedThreadIds.has(thread.id),
        thread,
      }),
      position: { x: event.clientX, y: event.clientY },
    });
  }

  return (
    <>
      <ListHeader
        deletingPermanently={deletingPermanently}
        filters={filters}
        folder={folder}
        search={search}
        selection={{
          ...selection,
          count: selectedThreadIds.size,
        }}
        status={{ bulkUpdating: updating, refreshing }}
        threadCount={threads.length}
        onBulkAction={actions.bulk}
        onClearSelection={actions.clearSelection}
        onDeleteSelected={actions.deleteSelected}
        onEmptyTrash={actions.emptyTrash}
        onFiltersChange={actions.filtersChange}
        onRefresh={actions.refresh}
        onSearchChange={actions.searchChange}
        onSearchSubmit={actions.searchSubmit}
        onSettingsOpen={actions.settingsOpen}
        onToggleAll={actions.toggleAll}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <MailListSkeleton />
        ) : loadError ? (
          <div className="grid h-full min-h-72 place-items-center p-6">
            <div className="max-w-sm text-center">
              <p className="text-[12px] text-fg-50">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={actions.retry}
                className="mt-3"
              >
                Try again
              </Button>
            </div>
          </div>
        ) : threads.length || nextCursor ? (
          <div>
            <ul>
              {threads.map((thread) => (
                <ThreadRow
                  key={thread.id}
                  bulkUpdating={updating}
                  deletingPermanently={deletingPermanently}
                  folder={folder}
                  mutationId={mutationId}
                  selected={selectedThreadIds.has(thread.id)}
                  selectionMode={selectedThreadIds.size > 0}
                  thread={thread}
                  onArchive={actions.archive}
                  onContextMenu={(event) =>
                    showContextMenu(thread, event)
                  }
                  onDeletePermanently={actions.deletePermanently}
                  onMenu={(event) => showContextMenu(thread, event)}
                  onOpen={actions.open}
                  onSelect={actions.toggleSelection}
                  onStar={actions.star}
                  onTrash={actions.trash}
                />
              ))}
            </ul>
            {nextCursor ? (
              <div className="flex justify-center border-b border-bd-30 px-4 py-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={actions.loadMore}
                  className="min-w-28 gap-2"
                >
                  {loadingMore ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-3.5 animate-spin"
                    />
                  ) : null}
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyList
            folder={folder}
            hasActiveSearch={hasActiveSearch}
            search={search}
          />
        )}
      </div>

      {contextMenu ? (
        <ContextMenu
          items={contextMenu.items}
          isOpen
          position={contextMenu.position}
          variant="elevated"
          onClose={() => setContextMenu(undefined)}
        />
      ) : null}
    </>
  );
}

function EmptyList({
  folder,
  hasActiveSearch,
  search,
}: {
  folder: MailboxView;
  hasActiveSearch: boolean;
  search: string;
}) {
  const iconClass = "size-6 text-fg-70";
  const icon =
    folder === "sent" ? (
      <Send aria-hidden="true" className={iconClass} />
    ) : folder === "starred" ? (
      <Star aria-hidden="true" className={iconClass} />
    ) : folder === "spam" ? (
      <ShieldAlert aria-hidden="true" className={iconClass} />
    ) : folder === "trash" ? (
      <Trash2 aria-hidden="true" className={iconClass} />
    ) : folder === "everything" ? (
      <Mails aria-hidden="true" className={iconClass} />
    ) : (
      <Inbox aria-hidden="true" className={iconClass} />
    );
  const title = hasActiveSearch
    ? "No matching conversations"
    : folder === "sent"
      ? "No sent conversations"
      : folder === "starred"
        ? "No starred conversations"
        : folder === "everything"
          ? "No conversations yet"
          : folder === "spam"
            ? "No spam conversations"
            : folder === "trash"
              ? "Trash is empty"
              : "No conversations yet";
  const description = hasActiveSearch
    ? search.trim()
      ? `No results for “${search.trim()}” with these filters.`
      : "No conversations match these filters."
    : folder === "sent"
      ? "Messages sent from this mailbox will appear here."
      : folder === "starred"
        ? "Star a conversation to keep it easy to find."
        : folder === "everything"
          ? "Every non-trashed conversation will appear here."
          : folder === "spam"
            ? "Conversations marked as spam will appear here."
            : folder === "trash"
              ? "Trashed conversations will appear here."
              : "Incoming Resend emails will appear here.";

  return (
    <div className="grid h-full min-h-72 place-items-center p-6">
      <div className="flex max-w-xs flex-col items-center text-center">
        {icon}
        <h1 className="mt-3 text-[13px] font-medium text-fg-40">
          {title}
        </h1>
        <p className="mt-1 text-[11px] text-fg-70">{description}</p>
      </div>
    </div>
  );
}
