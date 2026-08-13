import type { ContextMenuItem } from "@/components/reusables/context-menu";
import type {
  MailboxEmail,
  MailboxThread,
} from "@/lib/email/types";

import type { ReplyMode } from "../thread";
import type { MailboxView } from "../thread/state";

export interface ThreadMenuActions {
  archive: (thread: MailboxThread) => void;
  canReplyAll: (email: MailboxEmail) => boolean;
  cloneTemplate: (email: MailboxEmail) => void;
  deletePermanently: (thread: MailboxThread) => void;
  forward: (email: MailboxEmail) => void;
  markRead: (thread: MailboxThread) => void;
  markUnread: (thread: MailboxThread) => void;
  open: (thread: MailboxThread) => void;
  reply: (email: MailboxEmail, mode: ReplyMode) => void;
  select: (threadId: string) => void;
  spam: (thread: MailboxThread) => void;
  star: (thread: MailboxThread) => void;
  trash: (thread: MailboxThread) => void;
}

export function getThreadMenuItems({
  actions,
  busy,
  folder,
  selected,
  thread,
}: {
  actions: ThreadMenuActions;
  busy: boolean;
  folder: MailboxView;
  selected: boolean;
  thread: MailboxThread;
}): ContextMenuItem[] {
  const email = thread.latestEmail;
  const items: ContextMenuItem[] = [
    {
      id: "open",
      label: "Open conversation",
      onClick: () => actions.open(thread),
    },
    {
      id: "select",
      label: selected ? "Deselect" : "Select",
      selected,
      onClick: () => actions.select(thread.id),
      separator: true,
    },
  ];

  if (email.direction === "inbound") {
    items.push({
      id: "reply",
      label: "Reply",
      onClick: () => actions.reply(email, "reply"),
    });

    if (actions.canReplyAll(email)) {
      items.push({
        id: "reply-all",
        label: "Reply all",
        onClick: () => actions.reply(email, "reply-all"),
      });
    }
  }

  items.push({
    id: "forward",
    label: "Forward",
    onClick: () => actions.forward(email),
    separator: true,
  });
  items.push({
    id: "clone-template",
    label: "Clone as template",
    onClick: () => actions.cloneTemplate(email),
    separator: true,
  });
  items.push({
    id: "star",
    label: thread.starred ? "Unstar" : "Star",
    disabled: busy,
    onClick: () => actions.star(thread),
  });

  if (thread.unreadCount > 0) {
    items.push({
      id: "mark-read",
      label: "Mark as read",
      disabled: busy,
      onClick: () => actions.markRead(thread),
    });
  } else if (thread.hasInbound) {
    items.push({
      id: "mark-unread",
      label: "Mark as unread",
      disabled: busy,
      onClick: () => actions.markUnread(thread),
    });
  }

  if (folder !== "trash" && folder !== "spam") {
    items.push({
      id: "archive",
      label: thread.archived ? "Move to inbox" : "Archive",
      disabled: busy,
      onClick: () => actions.archive(thread),
      separator: true,
    });
  }

  if (folder !== "trash") {
    items.push({
      id: "spam",
      label: folder === "spam" ? "Not spam" : "Mark as spam",
      disabled: busy,
      onClick: () => actions.spam(thread),
      separator: true,
    });
    items.push({
      id: "trash",
      label: "Move to trash",
      disabled: busy,
      onClick: () => actions.trash(thread),
    });
  } else {
    items.push({
      id: "restore",
      label: "Restore from trash",
      disabled: busy,
      onClick: () => actions.trash(thread),
      separator: true,
    });
    items.push({
      id: "delete-permanently",
      label: "Delete permanently",
      disabled: busy,
      onClick: () => actions.deletePermanently(thread),
    });
  }

  return items;
}
