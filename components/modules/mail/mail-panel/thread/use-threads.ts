"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type EmailSearchFilters,
  type EmailThreadBulkAction,
  type MailboxEmail,
  type MailboxFolderCounts,
  type MailboxThread,
} from "@/lib/email/types";

import {
  applyEmailThreadBulkAction,
  emptyTrashAction,
  markEmailThreadReadAction,
  markEmailThreadUnreadAction,
  moveEmailThreadToTrashAction,
  permanentlyDeleteEmailThreadsAction,
  restoreEmailThreadAction,
  setEmailThreadArchivedAction,
  setEmailThreadSpamAction,
  setEmailThreadStarredAction,
} from "./actions";
import type { HomeView } from "../../types";
import {
  applyBulkActionToThread,
  getUnreadCountedFolders,
  type MailboxView,
} from "./state";

interface MailboxResponse {
  folderCounts?: MailboxFolderCounts;
  threads?: MailboxThread[];
  nextCursor?: string | null;
  error?: string;
  warning?: string;
  webhookEnabled?: boolean;
}

interface ThreadDetailResponse {
  messages?: MailboxEmail[];
  error?: string;
}

type SyncMode = "auto" | "force" | "none";
type LoadPresentation = "initial" | "refresh" | "silent";
const SEARCH_DEBOUNCE_MS = 200;

interface LoadOptions {
  append?: boolean;
  cursor?: string;
  presentation?: LoadPresentation;
  preserveExisting?: boolean;
  syncMode?: SyncMode;
}

export interface DeleteConfirmation {
  conversationCount: number;
  conversationSubject?: string;
  mode: "empty-trash" | "threads";
  threadIds: string[];
}

interface UseThreadsOptions {
  activeView: HomeView;
  currentFolder: MailboxView;
  filters: EmailSearchFilters;
  mailboxEmail?: string;
  requestedThreadId?: string;
  search: string;
  onFolderCountsChange: (
    updater: (currentCounts: MailboxFolderCounts) => MailboxFolderCounts,
  ) => void;
}

export function useThreads({
  activeView,
  currentFolder,
  filters: searchFilters,
  mailboxEmail,
  requestedThreadId,
  search,
  onFolderCountsChange,
}: UseThreadsOptions) {
  const [threads, setThreads] = useState<MailboxThread[]>([]);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmation>();
  const [deletingPermanently, setDeletingPermanently] = useState(false);
  const [threadDetails, setThreadDetails] = useState<
    Record<string, MailboxEmail[]>
  >({});
  const [selectedThreadId, setSelectedThreadId] = useState<string>();
  const [loadingThreadDetailId, setLoadingThreadDetailId] =
    useState<string>();
  const [threadMutationId, setThreadMutationId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [, setWarning] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>();
  const latestRequest = useRef(0);
  const scheduledSearchTimer = useRef<number | undefined>(undefined);
  const lastLoadedMailboxView = useRef<MailboxView | undefined>(
    undefined,
  );
  const lastLoadedMailboxEmail = useRef<string | undefined>(undefined);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId),
    [selectedThreadId, threads],
  );
  const selectedThreadMessages = selectedThreadId
    ? threadDetails[selectedThreadId]
    : undefined;
  const selectedThreads = useMemo(
    () => threads.filter((thread) => selectedThreadIds.has(thread.id)),
    [selectedThreadIds, threads],
  );
  const allThreadsSelected =
    threads.length > 0 && selectedThreadIds.size === threads.length;
  const someThreadsSelected =
    selectedThreadIds.size > 0 && !allThreadsSelected;
  const selectionHasUnread = selectedThreads.some(
    (thread) => thread.unreadCount > 0,
  );
  const selectionHasInbound = selectedThreads.some(
    (thread) => thread.hasInbound,
  );
  const selectionAllStarred =
    selectedThreads.length > 0 &&
    selectedThreads.every((thread) => thread.starred);
  const selectionAllArchived =
    selectedThreads.length > 0 &&
    selectedThreads.every((thread) => thread.archived);

  useEffect(() => {
    // Route-driven selection is intentionally synchronized after navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedThreadId(requestedThreadId);
  }, [requestedThreadId]);

  const updateFolderCountsForThreads = useCallback((
    changes: Array<{
      before?: MailboxThread;
      after?: MailboxThread;
    }>,
  ) => {
    const deltas: MailboxFolderCounts = {
      inbox: 0,
      spam: 0,
      starred: 0,
    };

    for (const change of changes) {
      if (change.before) {
        for (const folder of getUnreadCountedFolders(change.before)) {
          deltas[folder] -= 1;
        }
      }
      if (change.after) {
        for (const folder of getUnreadCountedFolders(change.after)) {
          deltas[folder] += 1;
        }
      }
    }

    if (!deltas.inbox && !deltas.spam && !deltas.starred) {
      return;
    }

    onFolderCountsChange((currentCounts) => ({
      inbox: Math.max(0, currentCounts.inbox + deltas.inbox),
      spam: Math.max(0, currentCounts.spam + deltas.spam),
      starred: Math.max(0, currentCounts.starred + deltas.starred),
    }));
  }, [onFolderCountsChange]);

  const loadEmails = useCallback(
    async (
      view: MailboxView,
      searchQuery: string,
      {
        append = false,
        cursor,
        presentation = "silent",
        preserveExisting = false,
        syncMode = "none",
      }: LoadOptions = {},
    ) => {
      const requestId = ++latestRequest.current;

      if (presentation === "refresh") {
        setRefreshing(true);
      } else if (presentation === "initial") {
        setLoading(true);
      }
      if (append) {
        setLoadingMore(true);
      }

      if (presentation !== "silent") {
        setLoadError("");
      }

      try {
        const query = new URLSearchParams({
          folder: view,
          q: searchQuery,
          sync: syncMode,
          timezoneOffset: String(new Date().getTimezoneOffset()),
        });
        if (searchFilters.from) {
          query.set("from", searchFilters.from);
        }
        if (searchFilters.recipient) {
          query.set("recipient", searchFilters.recipient);
        }
        if (searchFilters.subject) {
          query.set("subject", searchFilters.subject);
        }
        if (searchFilters.hasAttachments) {
          query.set("hasAttachments", "true");
        }
        if (searchFilters.read !== "all") {
          query.set("read", searchFilters.read);
        }
        if (searchFilters.after) {
          query.set("after", searchFilters.after);
        }
        if (searchFilters.before) {
          query.set("before", searchFilters.before);
        }
        if (searchFilters.scope !== "current") {
          query.set("scope", searchFilters.scope);
        }
        if (mailboxEmail) {
          query.set("mailbox", mailboxEmail);
        }
        if (cursor) {
          query.set("cursor", cursor);
        }
        const response = await fetch(`/api/emails?${query}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as MailboxResponse;

        if (!response.ok) {
          throw new Error(result.error || "Unable to load this mailbox.");
        }

        if (requestId !== latestRequest.current) {
          return;
        }

        const nextThreads = result.threads ?? [];
        if (append) {
          setThreads((currentThreads) => {
            const existingIds = new Set(
              currentThreads.map((thread) => thread.id),
            );

            return [
              ...currentThreads,
              ...nextThreads.filter(
                (thread) => !existingIds.has(thread.id),
              ),
            ];
          });
          setNextCursor(result.nextCursor ?? null);
        } else if (preserveExisting) {
          setThreads((currentThreads) => {
            const incomingIds = new Set(
              nextThreads.map((thread) => thread.id),
            );

            return [
              ...nextThreads,
              ...currentThreads.filter(
                (thread) => !incomingIds.has(thread.id),
              ),
            ];
          });
          setNextCursor(
            (currentCursor) =>
              currentCursor ?? result.nextCursor ?? null,
          );
        } else {
          const availableThreadIds = new Set(
            nextThreads.map((thread) => thread.id),
          );
          setThreads(nextThreads);
          setNextCursor(result.nextCursor ?? null);
          setSelectedThreadIds((currentIds) => {
            const nextIds = new Set(
              [...currentIds].filter((threadId) =>
                availableThreadIds.has(threadId),
              ),
            );

            return nextIds.size === currentIds.size
              ? currentIds
              : nextIds;
          });
        }
        setWarning(result.warning ?? "");
        const folderCounts = result.folderCounts;
        if (folderCounts) {
          onFolderCountsChange(() => folderCounts);
        }
        setWebhookEnabled(result.webhookEnabled ?? false);
        setLoadError("");
      } catch (error) {
        if (requestId === latestRequest.current) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load this mailbox.";

          if (presentation === "initial") {
            setLoadError(message);
          } else {
            setWarning(`Automatic update failed: ${message}`);
          }
        }
      } finally {
        if (append) {
          setLoadingMore(false);
        }
        if (requestId === latestRequest.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [mailboxEmail, onFolderCountsChange, searchFilters],
  );

  useEffect(() => {
    if (activeView === "drafts") {
      return;
    }

    const folderChanged = lastLoadedMailboxView.current !== currentFolder;
    const mailboxChanged = lastLoadedMailboxEmail.current !== mailboxEmail;
    lastLoadedMailboxView.current = currentFolder;
    lastLoadedMailboxEmail.current = mailboxEmail;
    if (folderChanged || mailboxChanged) {
      setSelectedThreadId(requestedThreadId);
      setSelectedThreadIds(new Set());
    }
    const timeout = window.setTimeout(() => {
      if (scheduledSearchTimer.current === timeout) {
        scheduledSearchTimer.current = undefined;
      }
      void loadEmails(currentFolder, search, {
        presentation: folderChanged || mailboxChanged ? "initial" : "silent",
        syncMode: folderChanged || mailboxChanged ? "auto" : "none",
      });
    }, folderChanged || mailboxChanged ? 0 : SEARCH_DEBOUNCE_MS);
    scheduledSearchTimer.current = timeout;

    return () => {
      window.clearTimeout(timeout);
      latestRequest.current += 1;
      if (scheduledSearchTimer.current === timeout) {
        scheduledSearchTimer.current = undefined;
      }
    };
  }, [activeView, currentFolder, loadEmails, mailboxEmail, requestedThreadId, search]);

  function searchImmediately() {
    if (activeView === "drafts") {
      return;
    }

    if (scheduledSearchTimer.current !== undefined) {
      window.clearTimeout(scheduledSearchTimer.current);
      scheduledSearchTimer.current = undefined;
    }
    latestRequest.current += 1;

    void loadEmails(currentFolder, search, {
      presentation: "silent",
      syncMode: "none",
    });
  }

  useEffect(() => {
    if (
      activeView === "drafts" ||
      webhookEnabled === undefined
    ) {
      return;
    }

    const poll = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadEmails(currentFolder, search, {
        preserveExisting: true,
        syncMode: webhookEnabled ? "none" : "auto",
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };

    const pollingInterval = window.setInterval(
      poll,
      10_000,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(pollingInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeView, currentFolder, loadEmails, search, webhookEnabled]);

  const openThread = useCallback(async (thread: MailboxThread) => {
    setSelectedThreadId(thread.id);

    if (thread.unreadCount > 0) {
      updateFolderCountsForThreads([
        {
          before: thread,
          after: { ...thread, unreadCount: 0 },
        },
      ]);
      setThreads((currentThreads) =>
        currentThreads.map((item) =>
          item.id === thread.id
            ? {
                ...item,
                unreadCount: 0,
                latestEmail: { ...item.latestEmail, read: true },
              }
            : item,
        ),
      );
      void markEmailThreadReadAction(thread.id);
    }

    if (threadDetails[thread.id]) {
      return;
    }

    setLoadingThreadDetailId(thread.id);

    try {
      const threadQuery = new URLSearchParams();

      if (mailboxEmail) {
        threadQuery.set("mailbox", mailboxEmail);
      }

      const response = await fetch(
        `/api/threads/${encodeURIComponent(thread.id)}?${threadQuery.toString()}`,
        { cache: "no-store" },
      );
      const result = (await response.json()) as ThreadDetailResponse;

      if (!response.ok || !result.messages) {
        throw new Error(
          result.error || "Unable to load this conversation.",
        );
      }

      setThreadDetails((currentDetails) => ({
        ...currentDetails,
        [thread.id]: result.messages as MailboxEmail[],
      }));
    } catch (error) {
      console.error("Unable to load the conversation.", error);
      setWarning(
        error instanceof Error
          ? error.message
          : "Unable to load this conversation.",
      );
    } finally {
      setLoadingThreadDetailId((currentId) =>
        currentId === thread.id ? undefined : currentId,
      );
    }
  }, [mailboxEmail, threadDetails, updateFolderCountsForThreads]);

  useEffect(() => {
    if (!requestedThreadId || threadDetails[requestedThreadId]) {
      return;
    }

    const thread = threads.find((item) => item.id === requestedThreadId);
    if (!thread || loadingThreadDetailId === requestedThreadId) {
      return;
    }

    // Opening the route-selected thread hydrates its detail state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void openThread(thread);
  }, [
    loadingThreadDetailId,
    openThread,
    requestedThreadId,
    threadDetails,
    threads,
  ]);

  function toggleThreadSelection(threadId: string) {
    setSelectedThreadIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(threadId)) {
        nextIds.delete(threadId);
      } else {
        nextIds.add(threadId);
      }

      return nextIds;
    });
  }

  function toggleAllThreadSelection() {
    setSelectedThreadIds(
      allThreadsSelected
        ? new Set()
        : new Set(threads.map((thread) => thread.id)),
    );
  }

  async function loadMoreThreads() {
    if (!nextCursor || loadingMore) {
      return;
    }

    await loadEmails(currentFolder, search, {
      append: true,
      cursor: nextCursor,
      syncMode: "none",
    });
  }

  function requestPermanentDelete(targetThreads: MailboxThread[]) {
    if (targetThreads.length === 0) {
      return;
    }

    setDeleteConfirmation({
      conversationCount: targetThreads.length,
      conversationSubject:
        targetThreads.length === 1
          ? targetThreads[0]?.subject
          : undefined,
      mode: "threads",
      threadIds: targetThreads.map((thread) => thread.id),
    });
  }

  function requestEmptyTrash() {
    setDeleteConfirmation({
      conversationCount: threads.length,
      mode: "empty-trash",
      threadIds: [],
    });
  }

  async function confirmPermanentDelete() {
    if (!deleteConfirmation || deletingPermanently) {
      return;
    }

    setDeletingPermanently(true);

    try {
      const result =
        deleteConfirmation.mode === "empty-trash"
          ? await emptyTrashAction()
          : await permanentlyDeleteEmailThreadsAction(
              deleteConfirmation.threadIds,
            );

      if (!result.ok) {
        setWarning(
          result.error || "Unable to permanently delete conversations.",
        );
        return;
      }

      const deletedThreadIds = new Set(deleteConfirmation.threadIds);

      if (deleteConfirmation.mode === "empty-trash") {
        setThreads([]);
        setThreadDetails({});
        setSelectedThreadIds(new Set());
        setSelectedThreadId(undefined);
        setNextCursor(null);
      } else {
        setThreads((currentThreads) =>
          currentThreads.filter(
            (thread) => !deletedThreadIds.has(thread.id),
          ),
        );
        setThreadDetails((currentDetails) =>
          Object.fromEntries(
            Object.entries(currentDetails).filter(
              ([threadId]) => !deletedThreadIds.has(threadId),
            ),
          ),
        );
        setSelectedThreadIds((currentIds) => {
          const nextIds = new Set(currentIds);
          for (const threadId of deletedThreadIds) {
            nextIds.delete(threadId);
          }
          return nextIds;
        });
        if (
          selectedThreadId &&
          deletedThreadIds.has(selectedThreadId)
        ) {
          setSelectedThreadId(undefined);
        }
      }

      setDeleteConfirmation(undefined);
    } catch {
      setWarning("Unable to permanently delete conversations.");
    } finally {
      setDeletingPermanently(false);
    }
  }

  async function toggleThreadStar(thread: MailboxThread) {
    if (threadMutationId === thread.id) {
      return;
    }

    const nextStarred = !thread.starred;
    updateFolderCountsForThreads([
      {
        before: thread,
        after: { ...thread, starred: nextStarred },
      },
    ]);
    setThreadMutationId(thread.id);
    setThreads((currentThreads) =>
      currentFolder === "starred" && !nextStarred
        ? currentThreads.filter((item) => item.id !== thread.id)
        : currentThreads.map((item) =>
            item.id === thread.id
              ? { ...item, starred: nextStarred }
              : item,
          ),
    );

    if (
      currentFolder === "starred" &&
      !nextStarred &&
      selectedThreadId === thread.id
    ) {
      setSelectedThreadId(undefined);
    }
    if (currentFolder === "starred" && !nextStarred) {
      setSelectedThreadIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(thread.id);
        return nextIds;
      });
    }

    try {
      const result = await setEmailThreadStarredAction(
        thread.id,
        nextStarred,
      );

      if (!result.ok) {
        await loadEmails(currentFolder, search);
        setWarning(result.error || "Unable to update the conversation.");
      }
    } catch {
      await loadEmails(currentFolder, search);
      setWarning("Unable to update the conversation.");
    } finally {
      setThreadMutationId((currentId) =>
        currentId === thread.id ? undefined : currentId,
      );
    }
  }

  async function updateThreadArchive(thread: MailboxThread) {
    if (threadMutationId === thread.id) {
      return;
    }

    const nextArchived = !thread.archived;
    const leavesCurrentFolder =
      currentFolder === "inbox" && nextArchived;
    updateFolderCountsForThreads([
      {
        before: thread,
        after: { ...thread, archived: nextArchived },
      },
    ]);
    setThreadMutationId(thread.id);
    setThreads((currentThreads) =>
      leavesCurrentFolder
        ? currentThreads.filter((item) => item.id !== thread.id)
        : currentThreads.map((item) =>
            item.id === thread.id
              ? { ...item, archived: nextArchived }
              : item,
          ),
    );
    if (leavesCurrentFolder && selectedThreadId === thread.id) {
      setSelectedThreadId(undefined);
    }
    if (leavesCurrentFolder) {
      setSelectedThreadIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(thread.id);
        return nextIds;
      });
    }

    try {
      const result = await setEmailThreadArchivedAction(
        thread.id,
        nextArchived,
      );

      if (!result.ok) {
        await loadEmails(currentFolder, search);
        setWarning(result.error || "Unable to update the conversation.");
      }
    } catch {
      await loadEmails(currentFolder, search);
      setWarning("Unable to update the conversation.");
    } finally {
      setThreadMutationId((currentId) =>
        currentId === thread.id ? undefined : currentId,
      );
    }
  }

  async function updateThreadSpam(thread: MailboxThread) {
    if (threadMutationId === thread.id) {
      return;
    }

    const nextSpam = !thread.spam;
    updateFolderCountsForThreads([
      {
        before: thread,
        after: { ...thread, spam: nextSpam },
      },
    ]);
    setThreadMutationId(thread.id);
    setThreads((currentThreads) =>
      currentThreads.filter((item) => item.id !== thread.id),
    );
    if (selectedThreadId === thread.id) {
      setSelectedThreadId(undefined);
    }
    setSelectedThreadIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(thread.id);
      return nextIds;
    });

    try {
      const result = await setEmailThreadSpamAction(thread.id, nextSpam);

      if (!result.ok) {
        await loadEmails(currentFolder, search);
        setWarning(result.error || "Unable to update the conversation.");
      }
    } catch {
      await loadEmails(currentFolder, search);
      setWarning("Unable to update the conversation.");
    } finally {
      setThreadMutationId((currentId) =>
        currentId === thread.id ? undefined : currentId,
      );
    }
  }

  async function markThreadRead(thread: MailboxThread) {
    if (thread.unreadCount === 0) {
      return;
    }

    updateFolderCountsForThreads([
      {
        before: thread,
        after: { ...thread, unreadCount: 0 },
      },
    ]);
    setThreads((currentThreads) =>
      currentThreads.map((item) =>
        item.id === thread.id
          ? {
              ...item,
              unreadCount: 0,
              latestEmail: { ...item.latestEmail, read: true },
            }
          : item,
      ),
    );

    try {
      const result = await markEmailThreadReadAction(thread.id);

      if (result.ok) {
        return;
      }

      await loadEmails(currentFolder, search);
      setWarning(result.error || "Unable to mark the conversation as read.");
    } catch {
      await loadEmails(currentFolder, search);
      setWarning("Unable to mark the conversation as read.");
    }
  }

  async function markThreadUnread(thread: MailboxThread) {
    if (
      !thread.hasInbound ||
      thread.unreadCount > 0 ||
      threadMutationId === thread.id
    ) {
      return;
    }

    updateFolderCountsForThreads([
      {
        before: thread,
        after: { ...thread, unreadCount: 1 },
      },
    ]);
    setThreadMutationId(thread.id);
    setThreads((currentThreads) =>
      currentThreads.map((item) =>
        item.id === thread.id
          ? {
              ...item,
              unreadCount: 1,
              latestEmail:
                item.latestEmail.direction === "inbound"
                  ? { ...item.latestEmail, read: false }
                  : item.latestEmail,
            }
          : item,
      ),
    );

    try {
      const result = await markEmailThreadUnreadAction(thread.id);

      if (!result.ok) {
        await loadEmails(currentFolder, search);
        setWarning(
          result.error || "Unable to mark the conversation as unread.",
        );
      }
    } catch {
      await loadEmails(currentFolder, search);
      setWarning("Unable to mark the conversation as unread.");
    } finally {
      setThreadMutationId((currentId) =>
        currentId === thread.id ? undefined : currentId,
      );
    }
  }

  async function runBulkAction(action: EmailThreadBulkAction) {
    const threadIds = [...selectedThreadIds];

    if (bulkUpdating || threadIds.length === 0) {
      return;
    }

    setBulkUpdating(true);

    try {
      const result = await applyEmailThreadBulkAction(threadIds, action);

      if (!result.ok) {
        await loadEmails(currentFolder, search);
        setWarning(result.error || "Unable to update the conversations.");
        return;
      }

      const selectedIdSet = new Set(threadIds);
      const removesFromCurrentFolder = () =>
        (action === "unstar" && currentFolder === "starred") ||
        (action === "archive" && currentFolder === "inbox") ||
        (action === "spam" &&
          currentFolder !== "spam" &&
          currentFolder !== "trash") ||
        (action === "not-spam" && currentFolder === "spam") ||
        (action === "trash" && currentFolder !== "trash") ||
        (action === "restore" && currentFolder === "trash");

      updateFolderCountsForThreads(
        selectedThreads.map((thread) => ({
          before: thread,
          after: applyBulkActionToThread(thread, action),
        })),
      );
      setThreads((currentThreads) =>
        currentThreads
          .map((thread) =>
            selectedIdSet.has(thread.id)
              ? applyBulkActionToThread(thread, action)
              : thread,
          )
          .filter(
            (thread) =>
              !selectedIdSet.has(thread.id) ||
              !removesFromCurrentFolder(),
          ),
      );

      if (
        selectedThreadId &&
        selectedIdSet.has(selectedThreadId) &&
        selectedThreads.some(
          (thread) =>
            thread.id === selectedThreadId &&
            removesFromCurrentFolder(),
        )
      ) {
        setSelectedThreadId(undefined);
      }
      setSelectedThreadIds(new Set());
    } catch {
      await loadEmails(currentFolder, search);
      setWarning("Unable to update the conversations.");
    } finally {
      setBulkUpdating(false);
    }
  }

  async function updateThreadTrash(thread: MailboxThread) {
    if (threadMutationId === thread.id) {
      return;
    }

    const restoring = currentFolder === "trash";
    updateFolderCountsForThreads([
      {
        before: thread,
        after: { ...thread, trashed: !restoring },
      },
    ]);
    setThreadMutationId(thread.id);
    setThreads((currentThreads) =>
      currentThreads.filter((item) => item.id !== thread.id),
    );
    if (selectedThreadId === thread.id) {
      setSelectedThreadId(undefined);
    }
    setSelectedThreadIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(thread.id);
      return nextIds;
    });

    try {
      const result = restoring
        ? await restoreEmailThreadAction(thread.id)
        : await moveEmailThreadToTrashAction(thread.id);

      if (!result.ok) {
        await loadEmails(currentFolder, search);
        setWarning(
          result.error ||
            `Unable to ${restoring ? "restore" : "trash"} the conversation.`,
        );
      }
    } catch {
      await loadEmails(currentFolder, search);
      setWarning(
        `Unable to ${restoring ? "restore" : "trash"} the conversation.`,
      );
    } finally {
      setThreadMutationId((currentId) =>
        currentId === thread.id ? undefined : currentId,
      );
    }
  }


  return {
    state: {
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
    },
    selection: {
      allThreadsSelected,
      selectedThreads,
      selectionAllArchived,
      selectionAllStarred,
      selectionHasInbound,
      selectionHasUnread,
      someThreadsSelected,
    },
    actions: {
      cancelDelete: () => setDeleteConfirmation(undefined),
      clearSelection: () => setSelectedThreadIds(new Set()),
      closeThread: () => setSelectedThreadId(undefined),
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
      warn: setWarning,
    },
  };
}
