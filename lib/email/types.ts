export type EmailDirection = "inbound" | "outbound";
export type EmailDeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "delayed"
  | "bounced"
  | "failed"
  | "complained"
  | "suppressed";
export type EmailFolder =
  | "inbox"
  | "sent"
  | "starred"
  | "everything"
  | "spam"
  | "trash";
export type EmailThreadBulkAction =
  | "mark-read"
  | "mark-unread"
  | "star"
  | "unstar"
  | "archive"
  | "move-inbox"
  | "spam"
  | "not-spam"
  | "trash"
  | "restore";
export type EmailReadFilter = "all" | "read" | "unread";
export type EmailSearchScope = "current" | "everything";

export interface EmailSearchFilters {
  from: string;
  recipient: string;
  subject: string;
  hasAttachments: boolean;
  read: EmailReadFilter;
  after: string;
  before: string;
  scope: EmailSearchScope;
  timezoneOffset: number;
}

export const DEFAULT_EMAIL_SEARCH_FILTERS: EmailSearchFilters = {
  from: "",
  recipient: "",
  subject: "",
  hasAttachments: false,
  read: "all",
  after: "",
  before: "",
  scope: "current",
  timezoneOffset: 0,
};

export function getEmailSearchFilterCount(filters: EmailSearchFilters) {
  return [
    filters.from,
    filters.recipient,
    filters.subject,
    filters.hasAttachments,
    filters.read !== "all",
    filters.after,
    filters.before,
    filters.scope !== "current",
  ].filter(Boolean).length;
}

export const MAX_ATTACHMENT_COUNT = 20;
export const MAX_TOTAL_ATTACHMENT_BYTES = 29 * 1024 * 1024;
export const MAX_EMAIL_RECIPIENTS = 50;

export interface EmailAttachment {
  id: string | null;
  filename: string;
  size: number;
  contentType: string;
  disposition: "attachment" | "inline";
  contentId: string | null;
}

export interface EmailMessageDetails {
  messageId?: string;
  mailedBy?: string;
  signedBy?: string;
  security?: string;
  authentication?: string[];
}

export interface MailboxEmail {
  id: string;
  connectionId: string;
  threadId: string;
  direction: EmailDirection;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo: string[];
  subject: string;
  text: string;
  html?: string | null;
  attachments?: EmailAttachment[];
  details?: EmailMessageDetails;
  deliveryStatus?: EmailDeliveryStatus | null;
  deliveryUpdatedAt?: string | null;
  deliveryError?: string | null;
  createdAt: string;
  read: boolean;
}

export interface MailboxThread {
  id: string;
  subject: string;
  latestEmail: MailboxEmail;
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
  hasInbound: boolean;
  archived: boolean;
  starred: boolean;
  spam: boolean;
  trashed: boolean;
}

export interface MailboxThreadPage {
  threads: MailboxThread[];
  nextCursor: string | null;
}

export interface MailboxFolderCounts {
  inbox: number;
  spam: number;
  starred: number;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}
