"use client";

import {
  Archive,
  ArrowLeft,
  Inbox,
  LoaderCircle,
  Mail,
  RotateCcw,
  ShieldAlert,
  Star,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/reusables/button";
import type { MailDraft } from "@/lib/draft/types";
import {
  DEFAULT_EMAIL_SEARCH_FILTERS,
  getEmailSearchFilterCount,
  type EmailSearchFilters,
  type MailboxFolderCounts,
  type MailboxThread,
} from "@/lib/email/types";
import { formatMailbox, type Mailbox } from "@/lib/mailbox/types";
import { cn } from "@/lib/utils";

import type { ComposeRouteMode, HomeView } from "../types";
import { Compose } from "./compose";
import { useCompose } from "./compose/use-compose";
import { HeaderActions } from "./controls";
import { Drafts } from "./draft";
import { MailList } from "./list";
import { ThreadMessage } from "./thread";
import { DeleteMailModal } from "./thread/delete";
import {
  folderLabels,
  isMailboxView,
  type MailboxView,
} from "./thread/state";
import { useThreads } from "./thread/use-threads";

interface MailPanelProps {
  activeView: HomeView;
  activeThreadId?: string;
  composeMode?: ComposeRouteMode;
  drafts: MailDraft[];
  selectedMailbox?: Mailbox;
  onDraftDeleted: (draftId: string) => void;
  onDraftUpsert: (draft: MailDraft) => void;
  onFolderCountsChange: (
    updater: (currentCounts: MailboxFolderCounts) => MailboxFolderCounts,
  ) => void;
  onSettingsOpen: () => void;
  onComposeClose: () => void;
  onComposeModeChange: (mode: ComposeRouteMode) => void;
  onThreadClose: () => void;
  onThreadOpen: (threadId: string) => void;
  onViewChange: (view: HomeView) => void;
}

export function MailPanel({
  activeView,
  activeThreadId,
  composeMode,
  drafts,
  selectedMailbox,
  onDraftDeleted,
  onDraftUpsert,
  onFolderCountsChange,
  onSettingsOpen,
  onComposeClose,
  onComposeModeChange,
  onThreadClose,
  onThreadOpen,
  onViewChange,
}: MailPanelProps) {
  const [search, setSearch] = useState("");
  const [searchFilters, setSearchFilters] = useState<EmailSearchFilters>(
    () => ({ ...DEFAULT_EMAIL_SEARCH_FILTERS }),
  );
  const [viewSnapshot, setViewSnapshot] = useState<{
    folder: MailboxView;
    view: HomeView;
  }>(() => ({
    folder: isMailboxView(activeView) ? activeView : "inbox",
    view: activeView,
  }));

  if (viewSnapshot.view !== activeView) {
    setViewSnapshot({
      folder: isMailboxView(activeView)
        ? activeView
        : viewSnapshot.folder,
      view: activeView,
    });
  }

  const currentFolder = isMailboxView(activeView)
    ? activeView
    : viewSnapshot.folder;
  const mailbox = useThreads({
    activeView,
    currentFolder,
    filters: searchFilters,
    mailboxEmail: selectedMailbox?.id,
    requestedThreadId: activeThreadId,
    search,
    onFolderCountsChange,
  });
  const {
    bulkUpdating,
    deleteConfirmation,
    deletingPermanently,
    loadError,
    loading,
    loadingMore,
    loadingThreadDetailId,
    nextCursor,
    refreshing,
    selectedThread,
    selectedThreadIds,
    selectedThreadMessages,
    threadMutationId,
    threads,
  } = mailbox.state;
  const {
    allThreadsSelected,
    selectedThreads,
    selectionAllArchived,
    selectionAllStarred,
    selectionHasInbound,
    selectionHasUnread,
    someThreadsSelected,
  } = mailbox.selection;
  const {
    cancelDelete,
    clearSelection,
    closeThread,
    confirmPermanentDelete,
    loadEmails,
    loadMoreThreads,
    markThreadRead,
    markThreadUnread,
    openThread,
    requestEmptyTrash,
    requestPermanentDelete,
    runBulkAction,
    searchImmediately,
    toggleAllThreadSelection,
    toggleThreadSelection,
    toggleThreadStar,
    updateThreadArchive,
    updateThreadSpam,
    updateThreadTrash,
    warn,
  } = mailbox.actions;
  const handleThreadClose = useCallback(() => {
    closeThread();
    onThreadClose();
  }, [closeThread, onThreadClose]);
  const handleThreadOpen = useCallback(
    (thread: MailboxThread) => {
      onThreadOpen(thread.id);
      void openThread(thread);
    },
    [onThreadOpen, openThread],
  );
  const compose = useCompose({
    activeView,
    composeMode,
    currentFolder,
    selectedMailbox,
    onDraftDeleted,
    onDraftUpsert,
    onComposeClose,
    onComposeModeChange,
    onViewChange,
    onWarning: warn,
  });
  const activeSearchFilterCount =
    getEmailSearchFilterCount(searchFilters);
  const hasActiveSearch =
    Boolean(search.trim()) || activeSearchFilterCount > 0;
  const visibleDrafts = useMemo(
    () =>
      selectedMailbox
        ? drafts.filter(
            (draft) => draft.mailboxId === selectedMailbox.id,
          )
        : [],
    [drafts, selectedMailbox],
  );

  if (activeView === "drafts") {
    return (
      <>
        <Drafts
          drafts={visibleDrafts}
          onDelete={compose.removeSavedDraft}
          onOpen={compose.openDraft}
          onSettingsOpen={onSettingsOpen}
        />
        {composeMode ? (
          <Compose
            mode={compose.mode}
            mailbox={
              selectedMailbox ? formatMailbox(selectedMailbox) : ""
            }
            attachmentInput={compose.attachmentInput}
            value={compose.value}
            status={compose.status}
            actions={compose.actions}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col bg-bk-100">
      {selectedThread ? (
        <>
      <header className="flex h-12 items-center gap-1.5 px-2 sm:gap-2 sm:px-3">
        <button
          type="button"
          onClick={handleThreadClose}
          className="grid size-7 cursor-pointer place-items-center rounded-md p-1.5 text-fg-60 transition-colors hover:bg-bk-80 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
          aria-label="Back to conversation list"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
        </button>

        <span className="truncate text-[12px] font-medium text-fg-40">
          {folderLabels[currentFolder]}
        </span>
        <HeaderActions
          className="ml-auto hidden md:flex"
          onSettingsOpen={onSettingsOpen}
        />
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 max-w-full px-2 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0 sm:flex sm:items-baseline sm:gap-2">
                <h1 className="text-[18px] font-medium leading-6 text-fg-30 sm:truncate">
                  {selectedThread.subject}
                </h1>
                <p className="mt-1 shrink-0 text-[10px] text-fg-70 sm:mt-0">
                  {selectedThread.messageCount}{" "}
                  {selectedThread.messageCount === 1
                    ? "Message"
                    : "Messages"}
                </p>
              </div>
              <div className="-mx-1 flex shrink-0 items-center gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={threadMutationId === selectedThread.id}
                  onClick={() => void toggleThreadStar(selectedThread)}
                  aria-label={selectedThread.starred ? "Unstar" : "Star"}
                  className="shrink-0 gap-1.5 border-bd-40 px-2 text-fg-50 hover:border-bd-40 hover:bg-bk-80 hover:text-fg-40 sm:px-3"
                >
                  <Star
                    aria-hidden="true"
                    className={cn(
                      "size-3.5",
                      selectedThread.starred && "fill-current",
                    )}
                  />
                  <span className="hidden sm:inline">
                    {selectedThread.starred ? "Unstar" : "Star"}
                  </span>
                </Button>
                {selectedThread.hasInbound ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={threadMutationId === selectedThread.id}
                    onClick={() => {
                      void markThreadUnread(selectedThread);
                      handleThreadClose();
                    }}
                    aria-label="Mark unread"
                    className="shrink-0 gap-1.5 border-bd-40 px-2 text-fg-50 hover:border-bd-40 hover:bg-bk-80 hover:text-fg-40 sm:px-3"
                  >
                    <Mail aria-hidden="true" className="size-3.5" />
                    <span className="hidden sm:inline">Mark unread</span>
                  </Button>
                ) : null}
                {currentFolder !== "trash" &&
                currentFolder !== "spam" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={threadMutationId === selectedThread.id}
                    onClick={() =>
                      void updateThreadArchive(selectedThread)
                    }
                    aria-label={
                      selectedThread.archived
                        ? "Move to inbox"
                        : "Archive"
                    }
                    className="shrink-0 gap-1.5 border-bd-40 px-2 text-fg-50 hover:border-bd-40 hover:bg-bk-80 hover:text-fg-40 sm:px-3"
                  >
                    {selectedThread.archived ? (
                      <Inbox aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Archive aria-hidden="true" className="size-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {selectedThread.archived
                        ? "Move to inbox"
                        : "Archive"}
                    </span>
                  </Button>
                ) : null}
                {currentFolder !== "trash" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={threadMutationId === selectedThread.id}
                    onClick={() => void updateThreadSpam(selectedThread)}
                    aria-label={currentFolder === "spam" ? "Not spam" : "Spam"}
                    className="shrink-0 gap-1.5 border-bd-40 px-2 text-fg-50 hover:border-bd-40 hover:bg-bk-80 hover:text-fg-40 sm:px-3"
                  >
                    <ShieldAlert
                      aria-hidden="true"
                      className="size-3.5"
                    />
                    <span className="hidden sm:inline">
                      {currentFolder === "spam" ? "Not spam" : "Spam"}
                    </span>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={threadMutationId === selectedThread.id}
                  onClick={() => void updateThreadTrash(selectedThread)}
                  aria-label={currentFolder === "trash" ? "Restore" : "Trash"}
                  className="shrink-0 gap-1.5 border-bd-40 px-2 text-fg-50 hover:border-bd-40 hover:bg-bk-80 hover:text-fg-40 sm:px-3"
                >
                  {currentFolder === "trash" ? (
                    <RotateCcw aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {currentFolder === "trash" ? "Restore" : "Trash"}
                  </span>
                </Button>
                {currentFolder === "trash" ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={
                      threadMutationId === selectedThread.id ||
                      deletingPermanently
                    }
                    onClick={() =>
                      requestPermanentDelete([selectedThread])
                    }
                    className="shrink-0"
                  >
                    Delete permanently
                  </Button>
                ) : null}
              </div>
            </div>

            {selectedThreadMessages ? (
              <div className="min-w-0 max-w-full space-y-2">
                {selectedThreadMessages.map((message, index) => (
                  <ThreadMessage
                    key={message.id}
                    email={message}
                    expandedInitially={
                      index === selectedThreadMessages.length - 1
                    }
                    loading={
                      loadingThreadDetailId === selectedThread.id
                    }
                    onForward={compose.startForward}
                    onReply={compose.startReply}
                    showReplyAll={compose.canReplyAll}
                  />
                ))}
              </div>
            ) : (
              <div className="grid min-h-72 place-items-center">
                <LoaderCircle
                  aria-label="Loading conversation"
                  className="size-5 animate-spin text-fg-70"
                />
              </div>
            )}
          </div>
      </div>
        </>
      ) : (
        <MailList
          deletingPermanently={deletingPermanently}
          filters={searchFilters}
          folder={currentFolder}
          hasActiveSearch={hasActiveSearch}
          loadError={loadError}
          loading={loading}
          loadingMore={loadingMore}
          mutationId={threadMutationId}
          nextCursor={nextCursor}
          refreshing={refreshing}
          search={search}
          selectedThreadIds={selectedThreadIds}
          selection={{
            all: allThreadsSelected,
            allArchived: selectionAllArchived,
            allStarred: selectionAllStarred,
            hasInbound: selectionHasInbound,
            hasUnread: selectionHasUnread,
            some: someThreadsSelected,
          }}
          threads={threads}
          updating={bulkUpdating}
          actions={{
            archive: (thread) => void updateThreadArchive(thread),
            bulk: (action) => void runBulkAction(action),
            canReplyAll: compose.canReplyAll,
            clearSelection,
            deletePermanently: (thread) =>
              requestPermanentDelete([thread]),
            deleteSelected: () =>
              requestPermanentDelete(selectedThreads),
            emptyTrash: requestEmptyTrash,
            filtersChange: setSearchFilters,
            forward: compose.startForward,
            loadMore: () => void loadMoreThreads(),
            markRead: (thread) => void markThreadRead(thread),
            markUnread: (thread) => void markThreadUnread(thread),
            open: handleThreadOpen,
            refresh: () =>
              void loadEmails(currentFolder, search, {
                presentation: "refresh",
                syncMode: "force",
              }),
            reply: compose.startReply,
            retry: () =>
              void loadEmails(currentFolder, search, {
                presentation: "initial",
                syncMode: "force",
              }),
            searchChange: setSearch,
            searchSubmit: searchImmediately,
            settingsOpen: onSettingsOpen,
            spam: (thread) => void updateThreadSpam(thread),
            star: (thread) => void toggleThreadStar(thread),
            toggleAll: toggleAllThreadSelection,
            toggleSelection: toggleThreadSelection,
            trash: (thread) => void updateThreadTrash(thread),
          }}
        />
      )}
      {deleteConfirmation ? (
        <DeleteMailModal
          open
          mode={deleteConfirmation.mode}
          conversationCount={deleteConfirmation.conversationCount}
          conversationSubject={deleteConfirmation.conversationSubject}
          deleting={deletingPermanently}
          onCancel={cancelDelete}
          onConfirm={() => void confirmPermanentDelete()}
        />
      ) : null}
      </section>
      {composeMode ? (
        <Compose
          mode={compose.mode}
          mailbox={
            selectedMailbox ? formatMailbox(selectedMailbox) : ""
          }
          attachmentInput={compose.attachmentInput}
          value={compose.value}
          status={compose.status}
          actions={compose.actions}
        />
      ) : null}
    </>
  );
}
