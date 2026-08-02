export type MailboxVerificationStatus =
  | "verified"
  | "unverified"
  | "unknown";

export interface Mailbox {
  id: string;
  name: string;
  email: string;
  signature: string;
  isDefault: boolean;
  verificationStatus: MailboxVerificationStatus;
}

export interface MailboxActionResult {
  ok: boolean;
  mailbox?: Mailbox;
  error?: string;
}

export interface MailboxSuggestion {
  email: string;
  name: string;
  source: "received" | "sent" | "sent-and-received";
}

export interface SuggestedMailboxDomain {
  name: string;
  receiving: boolean;
  sending: boolean;
}

export interface MailboxSuggestionsResult {
  domains: SuggestedMailboxDomain[];
  suggestions: MailboxSuggestion[];
  warning?: string;
}

export interface DeleteMailboxActionResult {
  ok: boolean;
  deletedMailboxId?: string;
  selectedMailbox?: Mailbox;
  error?: string;
}

export interface SignatureActionResult {
  ok: boolean;
  mailboxId?: string;
  signature?: string;
  error?: string;
}

export function formatMailbox(mailbox: Mailbox) {
  return `${mailbox.name} <${mailbox.email}>`;
}
