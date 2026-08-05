import "server-only";

import { createHash } from "node:crypto";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import { emails, type EmailRow } from "@/lib/db/schema";
import { extractEmailAddress } from "@/lib/email/address";
import {
  isDownloadableEmailAttachment,
  normalizeEmailAttachments,
} from "@/lib/email/attachments";
import { getEmailMessageDetails } from "@/lib/email/details";
import type {
  EmailAttachment,
  EmailDeliveryStatus,
  EmailDirection,
  EmailFolder,
  EmailSearchFilters,
  EmailThreadBulkAction,
  MailboxFolderCounts,
  MailboxEmail,
  MailboxThread,
  MailboxThreadPage,
} from "@/lib/email/types";

interface StoredEmail {
  id: string;
  connectionId: string;
  threadId?: string;
  direction: EmailDirection;
  from: string;
  to: string[];
  cc?: string[] | null;
  bcc?: string[] | null;
  replyTo?: string[] | null;
  subject: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string> | null;
  attachments?: unknown[];
  deliveryStatus?: EmailDeliveryStatus | null;
  deliveryUpdatedAt?: string | null;
  deliveryError?: string | null;
  createdAt: string;
}

type EmailRecord = Pick<
  EmailRow,
  | "id"
  | "connectionId"
  | "threadId"
  | "direction"
  | "fromAddress"
  | "toAddresses"
  | "ccAddresses"
  | "bccAddresses"
  | "replyToAddresses"
  | "subject"
  | "htmlBody"
  | "textBody"
  | "attachments"
  | "deliveryStatus"
  | "deliveryUpdatedAt"
  | "deliveryError"
  | "createdAt"
  | "readAt"
  | "archivedAt"
  | "starredAt"
  | "spamAt"
  | "trashedAt"
> &
  Partial<Pick<EmailRow, "headers" | "messageId">>;

const emailSelection = {
  id: emails.id,
  connectionId: emails.connectionId,
  threadId: emails.threadId,
  direction: emails.direction,
  fromAddress: emails.fromAddress,
  toAddresses: emails.toAddresses,
  ccAddresses: emails.ccAddresses,
  bccAddresses: emails.bccAddresses,
  replyToAddresses: emails.replyToAddresses,
  subject: emails.subject,
  htmlBody: emails.htmlBody,
  textBody: emails.textBody,
  attachments: emails.attachments,
  deliveryStatus: emails.deliveryStatus,
  deliveryUpdatedAt: emails.deliveryUpdatedAt,
  deliveryError: emails.deliveryError,
  createdAt: emails.createdAt,
  readAt: emails.readAt,
  archivedAt: emails.archivedAt,
  starredAt: emails.starredAt,
  spamAt: emails.spamAt,
  trashedAt: emails.trashedAt,
};
const detailedEmailSelection = {
  ...emailSelection,
  headers: emails.headers,
  messageId: emails.messageId,
};

const EMAIL_THREAD_PAGE_SIZE = 50;

export async function saveEmail(email: StoredEmail) {
  const [existingEmail] = await db
    .select({ deletedAt: emails.deletedAt })
    .from(emails)
    .where(
      and(
        eq(emails.id, email.id),
        eq(emails.connectionId, email.connectionId),
      ),
    )
    .limit(1);

  if (existingEmail?.deletedAt) {
    return;
  }

  const headers = email.headers ?? null;
  const messageId = normalizeMessageId(readHeader(headers, "message-id"));
  const inReplyTo = normalizeMessageId(readHeader(headers, "in-reply-to"));
  const referenceIds = parseReferenceIds(readHeader(headers, "references"));
  const threadId =
    email.threadId ??
    (await findReferencedThreadId(
      [inReplyTo, ...referenceIds.toReversed()],
      email.connectionId,
    )) ??
    createFallbackThreadId(email);
  const inheritedSpamAt = await findThreadSpamAt(threadId, email.connectionId);
  const values = {
    id: email.id,
    connectionId: email.connectionId,
    threadId,
    messageId,
    inReplyTo,
    referenceIds,
    spamAt: inheritedSpamAt,
    direction: email.direction,
    fromAddress: email.from,
    toAddresses: email.to,
    ccAddresses: email.cc ?? [],
    bccAddresses: email.bcc ?? [],
    replyToAddresses: email.replyTo ?? [],
    subject: email.subject,
    htmlBody: email.html ?? null,
    textBody: email.text ?? null,
    headers,
    attachments: toSerializableJson(email.attachments ?? []),
    deliveryStatus: email.deliveryStatus ?? null,
    deliveryUpdatedAt: email.deliveryUpdatedAt
      ? new Date(email.deliveryUpdatedAt)
      : null,
    deliveryError: email.deliveryError ?? null,
    createdAt: new Date(email.createdAt),
    updatedAt: new Date(),
  };

  await db
    .insert(emails)
    .values(values)
    .onConflictDoUpdate({
      target: emails.id,
      set: {
        threadId: values.threadId,
        messageId: values.messageId,
        inReplyTo: values.inReplyTo,
        referenceIds: values.referenceIds,
        fromAddress: values.fromAddress,
        toAddresses: values.toAddresses,
        ccAddresses: values.ccAddresses,
        bccAddresses: values.bccAddresses,
        replyToAddresses: values.replyToAddresses,
        subject: values.subject,
        htmlBody: values.htmlBody,
        textBody: values.textBody,
        headers: values.headers,
        attachments: values.attachments,
        ...(email.deliveryStatus
          ? {
              deliveryStatus: values.deliveryStatus,
              deliveryUpdatedAt: values.deliveryUpdatedAt,
              deliveryError: values.deliveryError,
            }
          : {}),
        updatedAt: values.updatedAt,
      },
    });
}

export async function updateEmailDeliveryStatus(
  emailId: string,
  status: EmailDeliveryStatus,
  occurredAt: string,
  error?: string | null,
) {
  const deliveryUpdatedAt = new Date(occurredAt);

  if (Number.isNaN(deliveryUpdatedAt.getTime())) {
    return "ignored" as const;
  }

  const [updated] = await db
    .update(emails)
    .set({
      deliveryStatus: status,
      deliveryUpdatedAt,
      deliveryError: error?.trim().slice(0, 2_000) || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emails.id, emailId),
        eq(emails.direction, "outbound"),
        or(
          isNull(emails.deliveryUpdatedAt),
          lte(emails.deliveryUpdatedAt, deliveryUpdatedAt),
        ),
      ),
    )
    .returning({ id: emails.id });

  if (updated) {
    return "updated" as const;
  }

  const [existing] = await db
    .select({ id: emails.id })
    .from(emails)
    .where(eq(emails.id, emailId))
    .limit(1);

  return existing ? ("ignored" as const) : ("missing" as const);
}

function toSerializableJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as unknown[];
}

export async function getExistingEmailIds(ids: string[]) {
  if (ids.length === 0) {
    return new Set<string>();
  }

  const rows = await db
    .select({ id: emails.id })
    .from(emails)
    .where(inArray(emails.id, ids));

  return new Set(rows.map((row) => row.id));
}

export async function getExistingEmailDeliveryStatuses(ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, EmailDeliveryStatus | null>();
  }

  const rows = await db
    .select({
      id: emails.id,
      deliveryStatus: emails.deliveryStatus,
    })
    .from(emails)
    .where(
      and(
        inArray(emails.id, ids),
        eq(emails.direction, "outbound"),
      ),
    );

  return new Map(
    rows.map((row) => [row.id, row.deliveryStatus] as const),
  );
}

export async function reconcileEmailDeliveryStatus(
  emailId: string,
  expectedStatus: EmailDeliveryStatus | null,
  nextStatus: EmailDeliveryStatus,
) {
  if (expectedStatus === nextStatus) {
    return false;
  }

  const [updated] = await db
    .update(emails)
    .set({
      deliveryStatus: nextStatus,
      deliveryUpdatedAt: null,
      deliveryError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emails.id, emailId),
        eq(emails.direction, "outbound"),
        expectedStatus
          ? eq(emails.deliveryStatus, expectedStatus)
          : isNull(emails.deliveryStatus),
      ),
    )
    .returning({ id: emails.id });

  return Boolean(updated);
}

export async function backfillInboundSenderNames() {
  const rows = await db
    .select({
      id: emails.id,
      fromAddress: emails.fromAddress,
      headers: emails.headers,
    })
    .from(emails)
    .where(
      and(
        eq(emails.direction, "inbound"),
        isNull(emails.deletedAt),
      ),
    );
  const updates = rows.flatMap((row) => {
    const headerFrom = readHeader(row.headers, "from");

    if (
      !headerFrom ||
      !headerFrom.includes("<") ||
      extractEmailAddress(headerFrom) !==
        extractEmailAddress(row.fromAddress) ||
      headerFrom === row.fromAddress
    ) {
      return [];
    }

    return [{ id: row.id, fromAddress: headerFrom }];
  });

  await Promise.all(
    updates.map((update) =>
      db
        .update(emails)
        .set({
          fromAddress: update.fromAddress,
          updatedAt: new Date(),
        })
        .where(eq(emails.id, update.id)),
    ),
  );

  return updates.length;
}

export async function getMailboxFolderCounts(
  connectionId: string,
  mailboxEmail?: string,
): Promise<MailboxFolderCounts> {
  await backfillThreadMetadata();

  const mailboxFilter = getMailboxFilter(mailboxEmail);
  const threadStates = db
    .select({
      threadId: emails.threadId,
      hasUnread: sql<boolean>`
        bool_or(
          ${emails.direction} = 'inbound'
          and ${emails.readAt} is null
        )
      `.as("has_unread"),
      hasUnreadInbox: sql<boolean>`
        bool_or(
          ${emails.direction} = 'inbound'
          and ${emails.readAt} is null
          and ${emails.archivedAt} is null
        )
      `.as("has_unread_inbox"),
      spam: sql<boolean>`
        bool_or(${emails.spamAt} is not null)
      `.as("is_spam"),
      starred: sql<boolean>`
        bool_or(${emails.starredAt} is not null)
      `.as("is_starred"),
      trashed: sql<boolean>`
        bool_or(${emails.trashedAt} is not null)
      `.as("is_trashed"),
    })
    .from(emails)
    .where(
      and(
        eq(emails.connectionId, connectionId),
        mailboxFilter,
        isNotNull(emails.threadId),
        isNull(emails.deletedAt),
      ),
    )
    .groupBy(emails.threadId)
    .as("thread_states");
  const [counts] = await db
    .select({
      inbox: sql<number>`
        count(*) filter (
          where ${threadStates.hasUnreadInbox}
            and not ${threadStates.spam}
            and not ${threadStates.trashed}
        )::int
      `.mapWith(Number),
      spam: sql<number>`
        count(*) filter (
          where ${threadStates.hasUnread}
            and ${threadStates.spam}
            and not ${threadStates.trashed}
        )::int
      `.mapWith(Number),
      starred: sql<number>`
        count(*) filter (
          where ${threadStates.hasUnread}
            and ${threadStates.starred}
            and not ${threadStates.spam}
            and not ${threadStates.trashed}
        )::int
      `.mapWith(Number),
    })
    .from(threadStates);

  return {
    inbox: counts?.inbox ?? 0,
    spam: counts?.spam ?? 0,
    starred: counts?.starred ?? 0,
  };
}

export async function listEmailThreads(
  connectionId: string,
  folder: EmailFolder,
  search: string,
  cursor?: string,
  filters?: EmailSearchFilters,
  mailboxEmail?: string,
): Promise<MailboxThreadPage> {
  await backfillThreadMetadata();

  const decodedCursor = cursor ? decodeThreadCursor(cursor) : undefined;
  const query = search.trim();
  const pattern = `%${query}%`;
  const recipientSearchFilter = query
    ? getRecipientSearchFilter(pattern)
    : undefined;
  const searchFilter = query
    ? or(
        ilike(emails.subject, pattern),
        ilike(emails.fromAddress, pattern),
        ilike(emails.textBody, pattern),
        recipientSearchFilter,
      )
    : undefined;
  const folderFilter = getEmailFolderFilter(
    filters?.scope === "everything" ? "everything" : folder,
  );
  const mailboxFilter = getMailboxFilter(mailboxEmail);
  const advancedSearchFilter = getAdvancedSearchFilter(filters);
  const latestCreatedAt =
    sql<Date>`max(${emails.createdAt})`.mapWith(emails.createdAt);
  const cursorFilter = decodedCursor
    ? sql`(
        max(${emails.createdAt}) < ${decodedCursor.createdAt}
        or (
          max(${emails.createdAt}) = ${decodedCursor.createdAt}
          and ${emails.threadId} < ${decodedCursor.threadId}
        )
      )`
    : undefined;
  const candidateRows = await db
    .select({
      threadId: emails.threadId,
      latestCreatedAt,
    })
    .from(emails)
    .where(
      and(
        eq(emails.connectionId, connectionId),
        folderFilter,
        mailboxFilter,
        searchFilter,
        advancedSearchFilter,
        isNotNull(emails.threadId),
      ),
    )
    .groupBy(emails.threadId)
    .having(cursorFilter)
    .orderBy(desc(latestCreatedAt), desc(emails.threadId))
    .limit(EMAIL_THREAD_PAGE_SIZE + 1);
  const hasMore = candidateRows.length > EMAIL_THREAD_PAGE_SIZE;
  const pageRows = candidateRows
    .slice(0, EMAIL_THREAD_PAGE_SIZE)
    .filter(
      (
        row,
      ): row is typeof row & {
        threadId: string;
      } => Boolean(row.threadId),
    );
  const threadIds = pageRows.map((row) => row.threadId);

  if (threadIds.length === 0) {
    return { threads: [], nextCursor: null };
  }

  const rows = await db
    .select(emailSelection)
    .from(emails)
    .where(
      and(
        eq(emails.connectionId, connectionId),
        inArray(emails.threadId, threadIds),
        mailboxFilter,
        isNull(emails.deletedAt),
      ),
    )
    .orderBy(desc(emails.createdAt));
  const threads = new Map<string, MailboxThread>();
  const archiveStates = new Map<
    string,
    {
      hasArchivedMessage: boolean;
      hasInboundMessage: boolean;
      hasUnarchivedInboundMessage: boolean;
    }
  >();

  for (const row of rows) {
    if (!row.threadId) continue;

    const email = toMailboxEmail(row);
    const existing = threads.get(row.threadId);
    const attachmentCount = email.attachments?.length ?? 0;
    const archiveState = archiveStates.get(row.threadId) ?? {
      hasArchivedMessage: false,
      hasInboundMessage: false,
      hasUnarchivedInboundMessage: false,
    };

    archiveState.hasArchivedMessage ||= Boolean(row.archivedAt);
    if (email.direction === "inbound") {
      archiveState.hasInboundMessage = true;
      archiveState.hasUnarchivedInboundMessage ||=
        !row.archivedAt;
    }
    archiveStates.set(row.threadId, archiveState);

    if (!existing) {
      threads.set(row.threadId, {
        id: row.threadId,
        subject: getThreadSubject(email.subject),
        latestEmail: email,
        messageCount: 1,
        unreadCount: email.direction === "inbound" && !email.read ? 1 : 0,
        hasAttachments: attachmentCount > 0,
        hasInbound: email.direction === "inbound",
        archived: false,
        starred: Boolean(row.starredAt),
        spam: Boolean(row.spamAt),
        trashed: Boolean(row.trashedAt),
      });
      continue;
    }

    existing.messageCount += 1;
    existing.unreadCount +=
      email.direction === "inbound" && !email.read ? 1 : 0;
    existing.hasAttachments ||= attachmentCount > 0;
    existing.hasInbound ||= email.direction === "inbound";
    existing.starred ||= Boolean(row.starredAt);
    existing.spam ||= Boolean(row.spamAt);
    existing.trashed ||= Boolean(row.trashedAt);
  }

  for (const [threadId, thread] of threads) {
    const archiveState = archiveStates.get(threadId);

    thread.archived = Boolean(
      archiveState &&
        (archiveState.hasInboundMessage
          ? !archiveState.hasUnarchivedInboundMessage
          : archiveState.hasArchivedMessage),
    );
  }

  const orderedThreads = threadIds
    .map((threadId) => threads.get(threadId))
    .filter((thread): thread is MailboxThread => Boolean(thread));
  const lastPageRow = pageRows.at(-1);

  return {
    threads: orderedThreads,
    nextCursor:
      hasMore && lastPageRow
        ? encodeThreadCursor({
            createdAt: lastPageRow.latestCreatedAt,
            threadId: lastPageRow.threadId,
          })
        : null,
  };
}

export async function getEmailThread(
  connectionId: string,
  threadId: string,
  mailboxEmail?: string,
): Promise<MailboxEmail[]> {
  await backfillThreadMetadata();

  const rows = await db
    .select(detailedEmailSelection)
    .from(emails)
    .where(
      and(
        eq(emails.connectionId, connectionId),
        eq(emails.threadId, threadId),
        getMailboxFilter(mailboxEmail),
        isNull(emails.deletedAt),
      ),
    )
    .orderBy(asc(emails.createdAt));

  return rows.map(toMailboxEmail);
}

export async function getEmail(id: string): Promise<MailboxEmail | undefined> {
  const [row] = await db
    .select(detailedEmailSelection)
    .from(emails)
    .where(and(eq(emails.id, id), isNull(emails.deletedAt)))
    .limit(1);

  if (!row) {
    return undefined;
  }

  if (!row.threadId) {
    await backfillThreadMetadata();
    return getEmail(id);
  }

  return toMailboxEmail(row);
}

export async function getEmailThreadMetadata(id: string) {
  let [row] = await db
    .select({
      id: emails.id,
      threadId: emails.threadId,
      messageId: emails.messageId,
      referenceIds: emails.referenceIds,
    })
    .from(emails)
    .where(and(eq(emails.id, id), isNull(emails.deletedAt)))
    .limit(1);

  if (row && !row.threadId) {
    await backfillThreadMetadata();
    [row] = await db
      .select({
        id: emails.id,
        connectionId: emails.connectionId,
        threadId: emails.threadId,
        messageId: emails.messageId,
        referenceIds: emails.referenceIds,
      })
      .from(emails)
      .where(and(eq(emails.id, id), isNull(emails.deletedAt)))
      .limit(1);
  }

  return row?.threadId
    ? {
        threadId: row.threadId,
        messageId: row.messageId,
        referenceIds: Array.isArray(row.referenceIds)
          ? row.referenceIds
          : [],
      }
    : undefined;
}

export async function getEmailDirection(id: string) {
  const [row] = await db
    .select({ direction: emails.direction })
    .from(emails)
    .where(and(eq(emails.id, id), isNull(emails.deletedAt)))
    .limit(1);

  return row?.direction;
}

export async function updateEmailAttachments(
  id: string,
  attachments: EmailAttachment[],
) {
  await db
    .update(emails)
    .set({
      attachments,
      updatedAt: new Date(),
    })
    .where(and(eq(emails.id, id), isNull(emails.deletedAt)));
}

export async function markEmailRead(id: string) {
  await db
    .update(emails)
    .set({
      readAt: sql`coalesce(${emails.readAt}, now())`,
      updatedAt: new Date(),
    })
    .where(eq(emails.id, id));
}

export async function markEmailThreadRead(threadId: string) {
  await db
    .update(emails)
    .set({
      readAt: sql`coalesce(${emails.readAt}, now())`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emails.threadId, threadId),
        eq(emails.direction, "inbound"),
      ),
  );
}

export async function applyEmailThreadBulkAction(
  threadIds: string[],
  action: EmailThreadBulkAction,
) {
  if (threadIds.length === 0) {
    return false;
  }

  const now = new Date();
  const threadFilter = inArray(emails.threadId, threadIds);

  if (action === "mark-read" || action === "mark-unread") {
    const rows = await db
      .update(emails)
      .set({
        readAt:
          action === "mark-read"
            ? sql`coalesce(${emails.readAt}, now())`
            : null,
        updatedAt: now,
      })
      .where(and(threadFilter, eq(emails.direction, "inbound")))
      .returning({ id: emails.id });

    return rows.length > 0;
  }

  const values = {
    ...(action === "star" && { starredAt: now }),
    ...(action === "unstar" && { starredAt: null }),
    ...(action === "archive" && { archivedAt: now }),
    ...(action === "move-inbox" && { archivedAt: null }),
    ...(action === "spam" && { spamAt: now }),
    ...(action === "not-spam" && { spamAt: null }),
    ...(action === "trash" && { trashedAt: now }),
    ...(action === "restore" && { trashedAt: null }),
    updatedAt: now,
  };
  const rows = await db
    .update(emails)
    .set(values)
    .where(threadFilter)
    .returning({ id: emails.id });

  return rows.length > 0;
}

export async function setEmailThreadStarred(
  threadId: string,
  starred: boolean,
) {
  const rows = await db
    .update(emails)
    .set({
      starredAt: starred ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(emails.threadId, threadId))
    .returning({ id: emails.id });

  return rows.length > 0;
}

export async function setEmailThreadArchived(
  threadId: string,
  archived: boolean,
) {
  const rows = await db
    .update(emails)
    .set({
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(emails.threadId, threadId))
    .returning({ id: emails.id });

  return rows.length > 0;
}

export async function setEmailThreadSpam(
  threadId: string,
  spam: boolean,
) {
  const rows = await db
    .update(emails)
    .set({
      spamAt: spam ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(emails.threadId, threadId))
    .returning({ id: emails.id });

  return rows.length > 0;
}

export async function moveEmailThreadToTrash(threadId: string) {
  const rows = await db
    .update(emails)
    .set({
      trashedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(emails.threadId, threadId))
    .returning({ id: emails.id });

  return rows.length > 0;
}

export async function restoreEmailThread(threadId: string) {
  const rows = await db
    .update(emails)
    .set({
      trashedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(emails.threadId, threadId))
    .returning({ id: emails.id });

  return rows.length > 0;
}

export async function permanentlyDeleteEmailThreads(threadIds: string[]) {
  if (threadIds.length === 0) {
    return false;
  }

  const rows = await redactDeletedEmails(
    and(
      inArray(emails.threadId, threadIds),
      isNotNull(emails.trashedAt),
      isNull(emails.deletedAt),
    )!,
  );

  return rows.length > 0;
}

export async function emptyTrash() {
  const rows = await redactDeletedEmails(
    and(
      isNotNull(emails.trashedAt),
      isNull(emails.deletedAt),
    )!,
  );

  return rows.length;
}

async function redactDeletedEmails(filter: SQL) {
  const now = new Date();

  return db
    .update(emails)
    .set({
      fromAddress: "",
      toAddresses: [],
      ccAddresses: [],
      bccAddresses: [],
      replyToAddresses: [],
      subject: "",
      htmlBody: null,
      textBody: null,
      headers: null,
      messageId: null,
      inReplyTo: null,
      referenceIds: [],
      attachments: [],
      readAt: null,
      archivedAt: null,
      starredAt: null,
      spamAt: null,
      deletedAt: now,
      updatedAt: now,
    })
    .where(filter)
    .returning({ id: emails.id });
}

async function backfillThreadMetadata() {
  while (true) {
    const rows = await db
      .select({
        id: emails.id,
        connectionId: emails.connectionId,
        from: emails.fromAddress,
        to: emails.toAddresses,
        cc: emails.ccAddresses,
        subject: emails.subject,
        headers: emails.headers,
      })
      .from(emails)
      .where(
        and(
          isNull(emails.threadId),
          isNull(emails.deletedAt),
        ),
      )
      .limit(500);

    if (rows.length === 0) {
      return;
    }

    await Promise.all(
      rows.map((row) => {
        const messageId = normalizeMessageId(
          readHeader(row.headers, "message-id"),
        );
        const inReplyTo = normalizeMessageId(
          readHeader(row.headers, "in-reply-to"),
        );
        const referenceIds = parseReferenceIds(
          readHeader(row.headers, "references"),
        );
        const threadId = createFallbackThreadId({
          id: row.id,
          connectionId: row.connectionId,
          from: row.from,
          to: arrayOfStrings(row.to),
          cc: arrayOfStrings(row.cc),
          subject: row.subject,
        });

        return db
          .update(emails)
          .set({
            threadId,
            messageId,
            inReplyTo,
            referenceIds,
            updatedAt: new Date(),
          })
          .where(eq(emails.id, row.id));
      }),
    );
  }
}

async function findReferencedThreadId(
  values: Array<string | null | undefined>,
  connectionId: string,
) {
  const messageIds = [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];

  if (messageIds.length === 0) {
    return undefined;
  }

  const [row] = await db
    .select({ threadId: emails.threadId })
    .from(emails)
    .where(
      and(
        eq(emails.connectionId, connectionId),
        inArray(emails.messageId, messageIds),
      ),
    )
    .orderBy(desc(emails.createdAt))
    .limit(1);

  return row?.threadId ?? undefined;
}

async function findThreadSpamAt(threadId: string, connectionId: string) {
  const [row] = await db
    .select({ spamAt: emails.spamAt })
    .from(emails)
    .where(
      and(
        eq(emails.connectionId, connectionId),
        eq(emails.threadId, threadId),
        isNotNull(emails.spamAt),
      ),
    )
    .orderBy(desc(emails.spamAt))
    .limit(1);

  return row?.spamAt ?? null;
}

function toMailboxEmail(row: EmailRecord): MailboxEmail {
  return {
    id: row.id,
    connectionId: row.connectionId,
    threadId: row.threadId ?? createFallbackThreadId({
      id: row.id,
      connectionId: row.connectionId,
      from: row.fromAddress,
      to: arrayOfStrings(row.toAddresses),
      cc: arrayOfStrings(row.ccAddresses),
      subject: row.subject,
    }),
    direction: row.direction,
    from: row.fromAddress,
    to: arrayOfStrings(row.toAddresses),
    cc: arrayOfStrings(row.ccAddresses),
    bcc: arrayOfStrings(row.bccAddresses),
    replyTo: arrayOfStrings(row.replyToAddresses),
    subject: row.subject || "(no subject)",
    text: row.textBody || htmlToText(row.htmlBody || ""),
    html: row.htmlBody,
    attachments: normalizeEmailAttachments(row.attachments).filter(
      isDownloadableEmailAttachment,
    ),
    details: getEmailMessageDetails(row.headers, row.messageId),
    deliveryStatus: row.deliveryStatus,
    deliveryUpdatedAt: row.deliveryUpdatedAt
      ? new Date(row.deliveryUpdatedAt).toISOString()
      : null,
    deliveryError: row.deliveryError,
    createdAt: new Date(row.createdAt).toISOString(),
    read: Boolean(row.readAt),
  };
}

function getAdvancedSearchFilter(filters?: EmailSearchFilters) {
  if (!filters) {
    return undefined;
  }

  const from = filters.from.trim();
  const recipient = filters.recipient.trim();
  const subject = filters.subject.trim();
  const after = parseDateFilter(
    filters.after,
    filters.timezoneOffset,
  );
  const before = parseDateFilter(
    filters.before,
    filters.timezoneOffset,
    true,
  );

  return and(
    from
      ? ilike(emails.fromAddress, `%${from}%`)
      : undefined,
    recipient
      ? getRecipientSearchFilter(`%${recipient}%`)
      : undefined,
    subject
      ? ilike(emails.subject, `%${subject}%`)
      : undefined,
    filters.hasAttachments
      ? sql`jsonb_array_length(
          coalesce(${emails.attachments}, '[]'::jsonb)
        ) > 0`
      : undefined,
    filters.read === "read"
      ? and(
          eq(emails.direction, "inbound"),
          isNotNull(emails.readAt),
        )
      : undefined,
    filters.read === "unread"
      ? and(
          eq(emails.direction, "inbound"),
          isNull(emails.readAt),
        )
      : undefined,
    after ? gte(emails.createdAt, after) : undefined,
    before ? lt(emails.createdAt, before) : undefined,
  );
}

function getRecipientSearchFilter(pattern: string) {
  return sql<boolean>`(
    exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(${emails.toAddresses}, '[]'::jsonb)
      ) as recipient(value)
      where recipient.value ilike ${pattern}
    )
    or exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(${emails.ccAddresses}, '[]'::jsonb)
      ) as recipient(value)
      where recipient.value ilike ${pattern}
    )
    or exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(${emails.bccAddresses}, '[]'::jsonb)
      ) as recipient(value)
      where recipient.value ilike ${pattern}
    )
  )`;
}

function getMailboxFilter(mailboxEmail?: string) {
  const email = mailboxEmail?.trim();

  if (!email) {
    return undefined;
  }

  const pattern = `%${email}%`;

  return or(
    and(
      eq(emails.direction, "outbound"),
      ilike(emails.fromAddress, pattern),
    ),
    and(
      eq(emails.direction, "inbound"),
      getRecipientSearchFilter(pattern),
    ),
  );
}

function parseDateFilter(
  value: string,
  timezoneOffset: number,
  addDay = false,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (addDay) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  date.setUTCMinutes(date.getUTCMinutes() + timezoneOffset);

  return date;
}

function getEmailFolderFilter(folder: EmailFolder) {
  if (folder === "inbox") {
    return and(
      eq(emails.direction, "inbound"),
      isNull(emails.archivedAt),
      isNull(emails.spamAt),
      isNull(emails.trashedAt),
      isNull(emails.deletedAt),
    )!;
  }

  if (folder === "sent") {
    return and(
      eq(emails.direction, "outbound"),
      isNull(emails.spamAt),
      isNull(emails.trashedAt),
      isNull(emails.deletedAt),
    )!;
  }

  if (folder === "starred") {
    return and(
      isNotNull(emails.starredAt),
      isNull(emails.spamAt),
      isNull(emails.trashedAt),
      isNull(emails.deletedAt),
    )!;
  }

  if (folder === "everything") {
    return and(
      isNull(emails.spamAt),
      isNull(emails.trashedAt),
      isNull(emails.deletedAt),
    )!;
  }

  if (folder === "spam") {
    return and(
      isNotNull(emails.spamAt),
      isNull(emails.trashedAt),
      isNull(emails.deletedAt),
    )!;
  }

  return and(
    isNotNull(emails.trashedAt),
    isNull(emails.deletedAt),
  )!;
}

function encodeThreadCursor({
  createdAt,
  threadId,
}: {
  createdAt: Date;
  threadId: string;
}) {
  return Buffer.from(
    JSON.stringify({
      createdAt: createdAt.toISOString(),
      threadId,
    }),
  ).toString("base64url");
}

function decodeThreadCursor(value: string) {
  try {
    if (value.length > 512) {
      throw new Error("Cursor is too long.");
    }

    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as {
      createdAt?: unknown;
      threadId?: unknown;
    };
    const createdAt = new Date(
      typeof parsed.createdAt === "string" ? parsed.createdAt : "",
    );

    if (
      Number.isNaN(createdAt.getTime()) ||
      typeof parsed.threadId !== "string" ||
      !/^thread_[a-f0-9]{32}$/.test(parsed.threadId)
    ) {
      throw new Error("Cursor payload is invalid.");
    }

    return { createdAt, threadId: parsed.threadId };
  } catch {
    throw new Error("Email thread cursor is invalid.");
  }
}

function createFallbackThreadId(email: {
  id: string;
  connectionId: string;
  from: string;
  to: string[];
  cc?: string[] | null;
  subject: string;
}) {
  const participants = [
    email.from,
    ...email.to,
    ...(email.cc ?? []),
  ]
    .map(extractEmailAddress)
    .filter(Boolean)
    .sort();
  const identity = JSON.stringify({
    connectionId: email.connectionId,
    subject: normalizeThreadSubject(email.subject),
    participants: [...new Set(participants)],
  });
  const hash = createHash("sha256").update(identity).digest("hex");

  return `thread_${hash.slice(0, 32)}`;
}

function normalizeThreadSubject(subject: string) {
  return subject
    .replace(/^\s*(?:(?:re|fw|fwd)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
}

function getThreadSubject(subject: string) {
  return (
    subject.replace(/^\s*(?:(?:re|fw|fwd)\s*:\s*)+/i, "").trim() ||
    "(No subject)"
  );
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

function normalizeMessageId(value: string | undefined) {
  if (!value) {
    return null;
  }

  return (value.match(/<[^<>]+>/)?.[0] ?? value).trim().toLowerCase();
}

function parseReferenceIds(value: string | undefined) {
  if (!value) {
    return [];
  }

  const bracketed = value.match(/<[^<>]+>/g);
  const values = bracketed ?? value.split(/\s+/);

  return [
    ...new Set(
      values
        .map((reference) => normalizeMessageId(reference))
        .filter((reference): reference is string => Boolean(reference)),
    ),
  ];
}

function arrayOfStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
