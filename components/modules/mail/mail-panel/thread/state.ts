import type {
  EmailFolder,
  EmailThreadBulkAction,
  MailboxFolderCounts,
  MailboxThread,
} from "@/lib/email/types";

export type MailboxView = EmailFolder;

export function isMailboxView(
  view: MailboxView | "compose" | "drafts",
): view is MailboxView {
  return view !== "compose" && view !== "drafts";
}

export const folderLabels: Record<MailboxView, string> = {
  inbox: "Inbox",
  sent: "Sent",
  starred: "Starred",
  everything: "Everything",
  spam: "Spam",
  trash: "Trash",
};

export function getUnreadCountedFolders(thread: MailboxThread) {
  const folders = new Set<keyof MailboxFolderCounts>();

  if (thread.unreadCount === 0 || thread.trashed) {
    return folders;
  }

  if (thread.spam) {
    folders.add("spam");
    return folders;
  }

  if (thread.hasInbound && !thread.archived) {
    folders.add("inbox");
  }
  if (thread.starred) {
    folders.add("starred");
  }

  return folders;
}

export function applyBulkActionToThread(
  thread: MailboxThread,
  action: EmailThreadBulkAction,
) {
  if (action === "mark-read") {
    return {
      ...thread,
      unreadCount: 0,
      latestEmail:
        thread.latestEmail.direction === "inbound"
          ? { ...thread.latestEmail, read: true }
          : thread.latestEmail,
    };
  }

  if (action === "mark-unread" && thread.hasInbound) {
    return {
      ...thread,
      unreadCount: Math.max(1, thread.unreadCount),
      latestEmail:
        thread.latestEmail.direction === "inbound"
          ? { ...thread.latestEmail, read: false }
          : thread.latestEmail,
    };
  }

  return {
    ...thread,
    ...(action === "star" && { starred: true }),
    ...(action === "unstar" && { starred: false }),
    ...(action === "archive" && { archived: true }),
    ...(action === "move-inbox" && { archived: false }),
    ...(action === "spam" && { spam: true }),
    ...(action === "not-spam" && { spam: false }),
    ...(action === "trash" && { trashed: true }),
    ...(action === "restore" && { trashed: false }),
  };
}
