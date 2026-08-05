"use server";

import {
  extractEmailAddress,
  isValidEmailAddress,
} from "@/lib/email/address";
import {
  getResendEmailAttachment,
  isDownloadableEmailAttachment,
  listResendEmailAttachments,
} from "@/lib/email/attachments";
import {
  getEmailDirection,
  getEmailThreadMetadata,
  saveEmail,
} from "@/lib/email/repository";
import {
  MAX_ATTACHMENT_COUNT,
  MAX_EMAIL_RECIPIENTS,
  MAX_TOTAL_ATTACHMENT_BYTES,
  type ActionResult,
  type EmailAttachment,
  type EmailDirection,
} from "@/lib/email/types";
import {
  plainTextToHtml,
  sanitizeEditorHtml,
} from "@/lib/email/html";
import { deleteDraft } from "@/lib/draft/repository";
import { getMailbox } from "@/lib/mailbox/repository";
import { formatMailbox } from "@/lib/mailbox/types";
import { isAuthenticated } from "@/lib/server/auth";
import { getResendClient } from "@/lib/server/resend";
import { isMailboxInActiveWorkspace } from "@/lib/server/workspace";

const resendIdPattern = /^[a-zA-Z0-9_-]+$/;
const MAX_EMAIL_HTML_LENGTH = 1_000_000;
const draftIdPattern =
  /^draft_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PreparedAttachment {
  content: Buffer;
  filename: string;
  contentType?: string;
}

export async function sendEmailAction(
  formData: FormData,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const mailboxId = readFormValue(formData, "mailboxId");
  const recipients = normalizeRecipientGroups(
    readFormValues(formData, "to"),
    readFormValues(formData, "cc"),
    readFormValues(formData, "bcc"),
  );
  const subject = readFormValue(formData, "subject").trim();
  const text = readFormValue(formData, "text").trim();
  const rawHtml = readFormValue(formData, "html");
  const html = (
    sanitizeEditorHtml(rawHtml) || plainTextToHtml(text)
  ).slice(0, MAX_EMAIL_HTML_LENGTH);
  const files = formData
    .getAll("attachments")
    .filter((entry): entry is File => typeof entry !== "string");
  const forwardedEmailId = readFormValue(
    formData,
    "forwardedEmailId",
  ).trim();
  const replyToEmailId = readFormValue(formData, "replyToEmailId").trim();
  const draftId = readFormValue(formData, "draftId").trim();
  const forwardedAttachmentIds = [
    ...new Set(
      readFormValues(formData, "forwardedAttachmentId")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  const mailbox = await getMailbox(mailboxId);

  if (!mailbox || !(await isMailboxInActiveWorkspace(mailbox))) {
    return { ok: false, error: "Choose a mailbox first." };
  }
  const resend = await getResendClient(mailbox.connectionId);

  if (recipients.to.length === 0) {
    return { ok: false, error: "Add at least one recipient." };
  }

  const allRecipients = [
    ...recipients.to,
    ...recipients.cc,
    ...recipients.bcc,
  ];

  if (!allRecipients.every(isValidEmailAddress)) {
    return { ok: false, error: "Enter valid recipient addresses." };
  }

  if (allRecipients.length > MAX_EMAIL_RECIPIENTS) {
    return {
      ok: false,
      error: `You can send to up to ${MAX_EMAIL_RECIPIENTS} recipients.`,
    };
  }

  if (!subject || !text || rawHtml.length > MAX_EMAIL_HTML_LENGTH) {
    return { ok: false, error: "Subject and message are required." };
  }

  if (replyToEmailId && !resendIdPattern.test(replyToEmailId)) {
    return { ok: false, error: "The reply target is invalid." };
  }

  if (draftId && !draftIdPattern.test(draftId)) {
    return { ok: false, error: "The draft reference is invalid." };
  }

  const replyMetadata = replyToEmailId
    ? await getEmailThreadMetadata(replyToEmailId)
    : undefined;

  if (replyToEmailId && !replyMetadata) {
    return {
      ok: false,
      error: "The original conversation is no longer available.",
    };
  }

  const replyReferenceIds = replyMetadata
    ? [
        ...new Set(
          [
            ...replyMetadata.referenceIds,
            replyMetadata.messageId,
          ].filter((value): value is string => Boolean(value)),
        ),
      ]
    : [];
  const replyHeaders =
    replyMetadata?.messageId
      ? {
          "In-Reply-To": replyMetadata.messageId,
          References: replyReferenceIds.join(" "),
        }
      : undefined;

  if (
    files.length > MAX_ATTACHMENT_COUNT ||
    forwardedAttachmentIds.length > MAX_ATTACHMENT_COUNT
  ) {
    return {
      ok: false,
      error: `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`,
    };
  }

  if (
    forwardedAttachmentIds.length > 0 &&
    (!resendIdPattern.test(forwardedEmailId) ||
      !forwardedAttachmentIds.every((id) => resendIdPattern.test(id)))
  ) {
    return { ok: false, error: "The forwarded attachments are invalid." };
  }

  let forwardedAttachments: EmailAttachment[] = [];
  let forwardedEmailDirection: EmailDirection | undefined;

  if (forwardedAttachmentIds.length > 0) {
    forwardedEmailDirection = await getEmailDirection(forwardedEmailId);

    if (!forwardedEmailDirection) {
      return {
        ok: false,
        error: "The original email is no longer available.",
      };
    }

    try {
      const requestedIds = new Set(forwardedAttachmentIds);
      forwardedAttachments = (
        await listResendEmailAttachments(
          mailbox.connectionId,
          forwardedEmailId,
          forwardedEmailDirection,
        )
      ).filter(
        (attachment) =>
          attachment.id &&
          requestedIds.has(attachment.id) &&
          isDownloadableEmailAttachment(attachment),
      );

      if (forwardedAttachments.length !== requestedIds.size) {
        return {
          ok: false,
          error: "One or more forwarded attachments are unavailable.",
        };
      }
    } catch (error) {
      console.error("Unable to resolve forwarded attachments.", error);
      return {
        ok: false,
        error: "Unable to retrieve the original attachments.",
      };
    }
  }

  if (
    files.length + forwardedAttachments.length >
    MAX_ATTACHMENT_COUNT
  ) {
    return {
      ok: false,
      error: `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`,
    };
  }

  const totalAttachmentBytes =
    files.reduce((total, file) => total + file.size, 0) +
    forwardedAttachments.reduce(
      (total, attachment) => total + attachment.size,
      0,
    );

  if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: "Attachments can be up to 29 MB total.",
    };
  }

  let resendAttachments: PreparedAttachment[] | undefined;

  try {
    const direction = forwardedEmailDirection;
    const [uploadedAttachments, originalAttachments] = await Promise.all([
      Promise.all(
        files.map(
          async (file): Promise<PreparedAttachment> => ({
            content: Buffer.from(await file.arrayBuffer()),
            filename: safeFilename(file.name),
            contentType: file.type || undefined,
          }),
        ),
      ),
      direction
        ? Promise.all(
            forwardedAttachments.map(async (attachment) => {
              if (!attachment.id) {
                throw new Error("A forwarded attachment has no ID.");
              }

              const source = await getResendEmailAttachment(
                mailbox.connectionId,
                forwardedEmailId,
                attachment.id,
                direction,
              );
              const download = await fetch(source.download_url, {
                cache: "no-store",
              });

              if (!download.ok) {
                throw new Error(
                  `Unable to download ${attachment.filename}.`,
                );
              }

              return {
                content: Buffer.from(await download.arrayBuffer()),
                filename: safeFilename(attachment.filename),
                contentType:
                  attachment.contentType ||
                  source.content_type ||
                  undefined,
              } satisfies PreparedAttachment;
            }),
          )
        : Promise.resolve([]),
    ]);
    const preparedAttachments = [
      ...originalAttachments,
      ...uploadedAttachments,
    ];

    resendAttachments = preparedAttachments.length
      ? preparedAttachments
      : undefined;
  } catch (error) {
    console.error("Unable to prepare email attachments.", error);
    return {
      ok: false,
      error: "Unable to prepare the selected attachments.",
    };
  }

  const { data, error } = await resend.emails.send({
    from: formatMailbox(mailbox),
    to: recipients.to,
    cc: recipients.cc.length ? recipients.cc : undefined,
    bcc: recipients.bcc.length ? recipients.bcc : undefined,
    subject,
    text,
    html,
    headers: replyHeaders,
    attachments: resendAttachments,
  });

  if (error || !data) {
    return { ok: false, error: error?.message || "Unable to send email." };
  }

  try {
    await saveEmail({
      id: data.id,
      connectionId: mailbox.connectionId,
      threadId: replyMetadata?.threadId,
      direction: "outbound",
      from: formatMailbox(mailbox),
      to: recipients.to,
      cc: recipients.cc,
      bcc: recipients.bcc,
      subject,
      text,
      html,
      headers: replyHeaders,
      attachments: [
        ...forwardedAttachments.map(
          (attachment) =>
            ({
              ...attachment,
              id: null,
              disposition: "attachment",
              contentId: null,
            }) satisfies EmailAttachment,
        ),
        ...files.map(
          (file) =>
            ({
              id: null,
              filename: safeFilename(file.name),
              size: file.size,
              contentType: file.type || "application/octet-stream",
              disposition: "attachment",
              contentId: null,
            }) satisfies EmailAttachment,
        ),
      ],
      deliveryStatus: "queued",
      deliveryUpdatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  } catch (databaseError) {
    console.error("Email sent but could not be saved locally.", databaseError);
  }

  if (draftId) {
    try {
      await deleteDraft(draftId);
    } catch (draftError) {
      console.error("Email sent but its draft could not be removed.", draftError);
    }
  }

  return { ok: true };
}

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readFormValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

function normalizeRecipientGroups(
  toValues: string[],
  ccValues: string[],
  bccValues: string[],
) {
  const seen = new Set<string>();
  const normalize = (values: string[]) =>
    values.reduce<string[]>((addresses, value) => {
      const address = extractEmailAddress(value);

      if (!address || seen.has(address)) {
        return addresses;
      }

      seen.add(address);
      addresses.push(address);
      return addresses;
    }, []);

  return {
    to: normalize(toValues),
    cc: normalize(ccValues),
    bcc: normalize(bccValues),
  };
}

function safeFilename(filename: string) {
  return (
    filename
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/[\r\n]/g, "")
      .trim() || "attachment"
  );
}
