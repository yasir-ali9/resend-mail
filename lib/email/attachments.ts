import "server-only";

import type {
  EmailAttachment,
  EmailDirection,
} from "@/lib/email/types";
import { resend } from "@/lib/server/resend";
import type { AttachmentData } from "resend";

interface CachedAttachment {
  data: AttachmentData;
  expiresAt: number;
}

type GlobalWithAttachmentCache = typeof globalThis & {
  mailAttachmentCache?: Map<string, CachedAttachment>;
  mailAttachmentRequests?: Map<string, Promise<AttachmentData>>;
};

const globalWithAttachmentCache =
  globalThis as GlobalWithAttachmentCache;
const attachmentCache =
  globalWithAttachmentCache.mailAttachmentCache ?? new Map();
const attachmentRequests =
  globalWithAttachmentCache.mailAttachmentRequests ?? new Map();

globalWithAttachmentCache.mailAttachmentCache = attachmentCache;
globalWithAttachmentCache.mailAttachmentRequests = attachmentRequests;

interface RawAttachment {
  id?: unknown;
  filename?: unknown;
  size?: unknown;
  content_type?: unknown;
  contentType?: unknown;
  content_disposition?: unknown;
  disposition?: unknown;
  content_id?: unknown;
  contentId?: unknown;
}

export function normalizeEmailAttachments(value: unknown): EmailAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((attachment) => {
    if (!attachment || typeof attachment !== "object") {
      return [];
    }

    const raw = attachment as RawAttachment;
    const disposition =
      raw.content_disposition === "inline" ||
      raw.disposition === "inline"
        ? "inline"
        : "attachment";
    const filename =
      typeof raw.filename === "string" && raw.filename.trim()
        ? raw.filename.trim()
        : "Attachment";
    const size =
      typeof raw.size === "number" && Number.isFinite(raw.size)
        ? Math.max(0, raw.size)
        : 0;

    return [
      {
        id: typeof raw.id === "string" && raw.id ? raw.id : null,
        filename,
        size,
        contentType:
          (typeof raw.content_type === "string" && raw.content_type) ||
          (typeof raw.contentType === "string" && raw.contentType) ||
          "application/octet-stream",
        disposition,
        contentId:
          (typeof raw.content_id === "string" && raw.content_id) ||
          (typeof raw.contentId === "string" && raw.contentId) ||
          null,
      } satisfies EmailAttachment,
    ];
  });
}

export function isDownloadableEmailAttachment(
  attachment: EmailAttachment,
) {
  return (
    attachment.disposition === "attachment" ||
    !attachment.contentType.startsWith("image/")
  );
}

export async function listResendEmailAttachments(
  emailId: string,
  direction: EmailDirection,
) {
  const result =
    direction === "inbound"
      ? await resend.emails.receiving.attachments.list({
          emailId,
          limit: 100,
        })
      : await resend.emails.attachments.list({
          emailId,
          limit: 100,
        });

  if (result.error || !result.data) {
    throw new Error(
      result.error?.message || "Unable to retrieve email attachments.",
    );
  }

  return normalizeEmailAttachments(result.data.data);
}

export async function getResendEmailAttachment(
  emailId: string,
  attachmentId: string,
  direction: EmailDirection,
) {
  const cacheKey = `${direction}:${emailId}:${attachmentId}`;
  const cached = attachmentCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.data;
  }

  const pending = attachmentRequests.get(cacheKey);

  if (pending) {
    return pending;
  }

  const request = retrieveResendEmailAttachment(
    emailId,
    attachmentId,
    direction,
  );
  attachmentRequests.set(cacheKey, request);

  try {
    const attachment = await request;
    const expiresAt = Date.parse(attachment.expires_at);

    attachmentCache.set(cacheKey, {
      data: attachment,
      expiresAt: Number.isFinite(expiresAt)
        ? expiresAt
        : Date.now() + 5 * 60_000,
    });

    return attachment;
  } finally {
    attachmentRequests.delete(cacheKey);
  }
}

async function retrieveResendEmailAttachment(
  emailId: string,
  attachmentId: string,
  direction: EmailDirection,
) {
  const result =
    direction === "inbound"
      ? await resend.emails.receiving.attachments.get({
          emailId,
          id: attachmentId,
        })
      : await resend.emails.attachments.get({
          emailId,
          id: attachmentId,
        });

  if (result.error || !result.data) {
    throw new Error(
      result.error?.message || "Unable to retrieve this attachment.",
    );
  }

  return result.data;
}
