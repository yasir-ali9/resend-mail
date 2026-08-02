import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { drafts, type DraftRow } from "@/lib/db/schema";
import type {
  MailDraft,
  SaveDraftInput,
} from "@/lib/draft/types";

export async function listDrafts(): Promise<MailDraft[]> {
  const rows = await db
    .select()
    .from(drafts)
    .orderBy(desc(drafts.updatedAt));

  return rows.map(toMailDraft);
}

export async function saveDraft(input: SaveDraftInput) {
  const now = new Date();
  const [row] = await db
    .insert(drafts)
    .values({
      id: input.id,
      mailboxId: input.mailboxId,
      toAddresses: input.to,
      ccAddresses: input.cc,
      bccAddresses: input.bcc,
      subject: input.subject,
      textBody: input.text,
      htmlBody: input.html || null,
      replyToEmailId: input.replyToEmailId || null,
      forwardedEmailId: input.forwardedEmailId || null,
      forwardedAttachments: input.forwardedAttachments,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: drafts.id,
      set: {
        mailboxId: input.mailboxId,
        toAddresses: input.to,
        ccAddresses: input.cc,
        bccAddresses: input.bcc,
        subject: input.subject,
        textBody: input.text,
        htmlBody: input.html || null,
        replyToEmailId: input.replyToEmailId || null,
        forwardedEmailId: input.forwardedEmailId || null,
        forwardedAttachments: input.forwardedAttachments,
        updatedAt: now,
      },
    })
    .returning();

  return toMailDraft(row);
}

export async function deleteDraft(id: string) {
  const rows = await db
    .delete(drafts)
    .where(eq(drafts.id, id))
    .returning({ id: drafts.id });

  return rows.length > 0;
}

function toMailDraft(row: DraftRow): MailDraft {
  return {
    id: row.id,
    mailboxId: row.mailboxId,
    to: row.toAddresses,
    cc: row.ccAddresses,
    bcc: row.bccAddresses,
    subject: row.subject,
    text: row.textBody,
    html: row.htmlBody ?? "",
    replyToEmailId: row.replyToEmailId ?? "",
    forwardedEmailId: row.forwardedEmailId ?? "",
    forwardedAttachments: row.forwardedAttachments,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
