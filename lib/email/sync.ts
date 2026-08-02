import "server-only";

import { getEmailDeliveryStatus } from "@/lib/email/delivery";
import {
  getExistingEmailDeliveryStatuses,
  getExistingEmailIds,
  reconcileEmailDeliveryStatus,
  saveEmail,
} from "@/lib/email/repository";
import { extractEmailAddress } from "@/lib/email/address";
import { resend } from "@/lib/server/resend";
import type { EmailDirection } from "@/lib/email/types";

export async function syncMailbox(
  direction: EmailDirection,
  mailboxEmail: string,
) {
  if (direction === "inbound") {
    await syncReceivedEmails(mailboxEmail);
    return;
  }

  await syncSentEmails(mailboxEmail);
}

export async function syncReceivedEmail(id: string) {
  const { data, error } = await resend.emails.receiving.get(id);

  if (error || !data) {
    throw new Error(error?.message || "Unable to retrieve received email.");
  }

  await saveEmail({
    id: data.id,
    direction: "inbound",
    from: getDisplayFromAddress(data.from, data.headers),
    to: data.to,
    cc: data.cc,
    bcc: data.bcc,
    replyTo: data.reply_to,
    subject: data.subject,
    html: data.html,
    text: data.text,
    headers: data.headers,
    attachments: data.attachments,
    createdAt: data.created_at,
  });
}

function getDisplayFromAddress(
  from: string,
  headers: Record<string, string> | null,
) {
  const headerFrom = readHeader(headers, "from");

  if (
    headerFrom &&
    headerFrom.includes("<") &&
    extractEmailAddress(headerFrom) === extractEmailAddress(from)
  ) {
    return headerFrom;
  }

  return from;
}

function readHeader(
  headers: Record<string, string> | null | undefined,
  name: string,
) {
  if (!headers) {
    return undefined;
  }

  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === name,
  );

  return key ? headers[key] : undefined;
}

async function syncReceivedEmails(mailboxEmail: string) {
  const { data, error } = await resend.emails.receiving.list({ limit: 100 });

  if (error || !data) {
    throw new Error(error?.message || "Unable to list received emails.");
  }

  const existingIds = await getExistingEmailIds(
    data.data
      .filter((email) => receivedByMailbox(email, mailboxEmail))
      .map((email) => email.id),
  );
  const missingIds = data.data
    .filter((email) => receivedByMailbox(email, mailboxEmail))
    .filter((email) => !existingIds.has(email.id))
    .map((email) => email.id);

  await runInBatches(missingIds, syncReceivedEmail);
}

async function syncSentEmails(mailboxEmail: string) {
  const { data, error } = await resend.emails.list({ limit: 100 });

  if (error || !data) {
    throw new Error(error?.message || "Unable to list sent emails.");
  }

  const existingStatuses = await getExistingEmailDeliveryStatuses(
    data.data
      .filter((email) => addressMatches(email.from, mailboxEmail))
      .map((email) => email.id),
  );
  const missingIds = data.data
    .filter((email) => addressMatches(email.from, mailboxEmail))
    .filter((email) => !existingStatuses.has(email.id))
    .map((email) => email.id);
  const changedStatuses = data.data.flatMap((email) => {
    if (!addressMatches(email.from, mailboxEmail)) {
      return [];
    }

    const currentStatus = existingStatuses.get(email.id);
    const nextStatus = getEmailDeliveryStatus(email.last_event);

    return currentStatus !== undefined &&
      nextStatus &&
      currentStatus !== nextStatus
      ? [{ emailId: email.id, currentStatus, nextStatus }]
      : [];
  });

  await Promise.all(
    changedStatuses.map(({ emailId, currentStatus, nextStatus }) =>
      reconcileEmailDeliveryStatus(
        emailId,
        currentStatus,
        nextStatus,
      ),
    ),
  );

  await runInBatches(missingIds, syncSentEmail);
}

function receivedByMailbox(
  email: {
    bcc: string[] | null;
    cc: string[] | null;
    received_for: string[];
    to: string[];
  },
  mailboxEmail: string,
) {
  return [
    ...email.to,
    ...(email.cc ?? []),
    ...(email.bcc ?? []),
    ...(email.received_for ?? []),
  ].some((address) => addressMatches(address, mailboxEmail));
}

function addressMatches(address: string, mailboxEmail: string) {
  return (
    extractEmailAddress(address) ===
    extractEmailAddress(mailboxEmail)
  );
}

export async function syncSentEmail(id: string) {
  const result = await resend.emails.get(id);

  if (result.error || !result.data) {
    throw new Error(result.error?.message || "Unable to retrieve sent email.");
  }

  const email = result.data;

  await saveEmail({
    id: email.id,
    direction: "outbound",
    from: email.from,
    to: email.to,
    cc: email.cc,
    bcc: email.bcc,
    replyTo: email.reply_to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    deliveryStatus: getEmailDeliveryStatus(email.last_event),
    deliveryUpdatedAt: email.created_at,
    createdAt: email.created_at,
  });
}

async function runInBatches(
  ids: string[],
  operation: (id: string) => Promise<void>,
) {
  const batchSize = 5;

  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize);
    const results = await Promise.allSettled(batch.map(operation));
    const rejected = results.find(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected",
    );

    if (rejected) {
      throw rejected.reason;
    }
  }
}
