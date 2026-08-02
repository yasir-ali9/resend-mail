import type { EmailAttachment } from "@/lib/email/types";

export interface MailDraft {
  id: string;
  mailboxId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html: string;
  replyToEmailId: string;
  forwardedEmailId: string;
  forwardedAttachments: EmailAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveDraftInput {
  id: string;
  mailboxId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html: string;
  replyToEmailId: string;
  forwardedEmailId: string;
  forwardedAttachments: EmailAttachment[];
}

export interface DraftActionResult {
  ok: boolean;
  draft?: MailDraft;
  error?: string;
}
