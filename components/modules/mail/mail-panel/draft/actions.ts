"use server";

import {
  isDownloadableEmailAttachment,
  normalizeEmailAttachments,
} from "@/lib/email/attachments";
import {
  MAX_ATTACHMENT_COUNT,
  MAX_EMAIL_RECIPIENTS,
  type ActionResult,
} from "@/lib/email/types";
import { sanitizeEditorHtml } from "@/lib/email/html";
import {
  deleteDraft,
  saveDraft,
} from "@/lib/draft/repository";
import type {
  DraftActionResult,
  SaveDraftInput,
} from "@/lib/draft/types";
import { getMailbox } from "@/lib/mailbox/repository";
import { isAuthenticated } from "@/lib/server/auth";
import { isMailboxInActiveWorkspace } from "@/lib/server/workspace";

const draftIdPattern =
  /^draft_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const resendIdPattern = /^[a-zA-Z0-9_-]*$/;
const MAX_DRAFT_SUBJECT_LENGTH = 998;
const MAX_DRAFT_BODY_LENGTH = 500_000;

export async function saveDraftAction(
  input: SaveDraftInput,
): Promise<DraftActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (
    !input ||
    typeof input !== "object" ||
    !draftIdPattern.test(input.id) ||
    typeof input.mailboxId !== "string" ||
    typeof input.subject !== "string" ||
    typeof input.text !== "string" ||
    typeof input.html !== "string" ||
    typeof input.replyToEmailId !== "string" ||
    typeof input.forwardedEmailId !== "string" ||
    !Array.isArray(input.to) ||
    !Array.isArray(input.cc) ||
    !Array.isArray(input.bcc)
  ) {
    return { ok: false, error: "This draft is invalid." };
  }

  const mailbox = await getMailbox(input.mailboxId);

  if (!mailbox || !(await isMailboxInActiveWorkspace(mailbox))) {
    return { ok: false, error: "Choose a mailbox before saving." };
  }

  const recipients = [
    ...normalizeDraftRecipients(input.to),
    ...normalizeDraftRecipients(input.cc),
    ...normalizeDraftRecipients(input.bcc),
  ];

  if (
    recipients.length > MAX_EMAIL_RECIPIENTS ||
    input.subject.length > MAX_DRAFT_SUBJECT_LENGTH ||
    input.text.length > MAX_DRAFT_BODY_LENGTH ||
    input.html.length > MAX_DRAFT_BODY_LENGTH * 2 ||
    !resendIdPattern.test(input.replyToEmailId) ||
    !resendIdPattern.test(input.forwardedEmailId)
  ) {
    return { ok: false, error: "This draft is too large or invalid." };
  }

  const forwardedAttachments = normalizeEmailAttachments(
    input.forwardedAttachments,
  )
    .filter(isDownloadableEmailAttachment)
    .slice(0, MAX_ATTACHMENT_COUNT);

  try {
    const html = sanitizeEditorHtml(input.html).slice(
      0,
      MAX_DRAFT_BODY_LENGTH * 2,
    );
    const draft = await saveDraft({
      ...input,
      to: normalizeDraftRecipients(input.to),
      cc: normalizeDraftRecipients(input.cc),
      bcc: normalizeDraftRecipients(input.bcc),
      subject: input.subject.slice(0, MAX_DRAFT_SUBJECT_LENGTH),
      text: input.text.slice(0, MAX_DRAFT_BODY_LENGTH),
      html,
      forwardedAttachments,
    });

    return { ok: true, draft };
  } catch (error) {
    console.error("Unable to save draft.", error);
    return { ok: false, error: "Unable to save this draft." };
  }
}

export async function deleteDraftAction(
  draftId: string,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!draftIdPattern.test(draftId)) {
    return { ok: false, error: "Draft ID is invalid." };
  }

  try {
    await deleteDraft(draftId);
    return { ok: true };
  } catch (error) {
    console.error("Unable to delete draft.", error);
    return { ok: false, error: "Unable to delete this draft." };
  }
}

function normalizeDraftRecipients(values: unknown[]) {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 320),
    ),
  ];
}
