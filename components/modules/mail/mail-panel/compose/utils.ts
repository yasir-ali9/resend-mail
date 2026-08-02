import {
  MAX_ATTACHMENT_COUNT,
  MAX_TOTAL_ATTACHMENT_BYTES,
  type MailboxEmail,
} from "@/lib/email/types";
import { plainTextToHtml } from "@/lib/email/html";

export function createSignatureBlock(signature: string | undefined) {
  const normalizedSignature = signature?.trim();

  return normalizedSignature ? `\n\n-- \n${normalizedSignature}` : "";
}

export function replaceSignatureBlock(
  body: string,
  previousBlock: string,
  nextBlock: string,
) {
  if (previousBlock && body.includes(previousBlock)) {
    return body.replace(previousBlock, nextBlock);
  }

  if (previousBlock || !nextBlock) {
    return body;
  }

  const forwardedMessageIndex = body.indexOf(
    "\n\n---------- Forwarded message ---------",
  );

  return forwardedMessageIndex >= 0
    ? `${body.slice(0, forwardedMessageIndex)}${nextBlock}${body.slice(
        forwardedMessageIndex,
      )}`
    : `${body}${nextBlock}`;
}

export function replaceSignatureHtml(
  html: string,
  previousBlock: string,
  nextBlock: string,
) {
  const previousHtml = plainTextToHtml(previousBlock);
  const nextHtml = plainTextToHtml(nextBlock);

  if (previousHtml && html.includes(previousHtml)) {
    return html.replace(previousHtml, nextHtml);
  }

  if (previousBlock || !nextBlock) {
    return html;
  }

  return `${html}${nextHtml}`;
}

export function createForwardedMessage(email: MailboxEmail) {
  const metadata = [
    `From: ${email.from}`,
    `Date: ${new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(email.createdAt))}`,
    `Subject: ${email.subject || "(No subject)"}`,
    `To: ${email.to.join(", ")}`,
    email.cc.length ? `Cc: ${email.cc.join(", ")}` : "",
  ].filter(Boolean);

  return [
    "",
    "",
    "---------- Forwarded message ---------",
    ...metadata,
    "",
    email.text,
  ].join("\n");
}

export function getAttachmentLimitMessage(
  attachments: { size: number }[],
) {
  if (attachments.length > MAX_ATTACHMENT_COUNT) {
    return `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`;
  }

  const totalBytes = attachments.reduce(
    (total, attachment) => total + attachment.size,
    0,
  );

  return totalBytes > MAX_TOTAL_ATTACHMENT_BYTES
    ? "Attachments can be up to 29 MB total."
    : "";
}
