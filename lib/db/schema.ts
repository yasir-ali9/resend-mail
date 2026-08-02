import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type {
  EmailAttachment,
  EmailDeliveryStatus,
  EmailDirection,
} from "@/lib/email/types";

const timestampOptions = {
  mode: "date",
  withTimezone: true,
} as const;

export const emails = pgTable(
  "emails",
  {
    id: text("id").primaryKey(),
    direction: text("direction").$type<EmailDirection>().notNull(),
    fromAddress: text("from_address").notNull(),
    toAddresses: jsonb("to_addresses").$type<string[]>().notNull().default([]),
    ccAddresses: jsonb("cc_addresses").$type<string[]>().notNull().default([]),
    bccAddresses: jsonb("bcc_addresses")
      .$type<string[]>()
      .notNull()
      .default([]),
    replyToAddresses: jsonb("reply_to_addresses")
      .$type<string[]>()
      .notNull()
      .default([]),
    subject: text("subject").notNull().default(""),
    htmlBody: text("html_body"),
    textBody: text("text_body"),
    headers: jsonb("headers").$type<Record<string, string>>(),
    threadId: text("thread_id"),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    referenceIds: jsonb("reference_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    attachments: jsonb("attachments").$type<unknown[]>().notNull().default([]),
    deliveryStatus: text("delivery_status").$type<EmailDeliveryStatus>(),
    deliveryUpdatedAt: timestamp("delivery_updated_at", timestampOptions),
    deliveryError: text("delivery_error"),
    createdAt: timestamp("created_at", timestampOptions).notNull(),
    readAt: timestamp("read_at", timestampOptions),
    archivedAt: timestamp("archived_at", timestampOptions),
    starredAt: timestamp("starred_at", timestampOptions),
    spamAt: timestamp("spam_at", timestampOptions),
    trashedAt: timestamp("trashed_at", timestampOptions),
    deletedAt: timestamp("deleted_at", timestampOptions),
    updatedAt: timestamp("updated_at", timestampOptions).notNull().defaultNow(),
  },
  (table) => [
    check(
      "emails_direction_check",
      sql`${table.direction} in ('inbound', 'outbound')`,
    ),
    check(
      "emails_delivery_status_check",
      sql`${table.deliveryStatus} is null or ${table.deliveryStatus} in ('queued', 'sent', 'delivered', 'delayed', 'bounced', 'failed', 'complained', 'suppressed')`,
    ),
    index("emails_direction_created_at_idx").on(
      table.direction,
      table.createdAt.desc(),
    ),
    index("emails_thread_created_at_idx").on(
      table.threadId,
      table.createdAt,
    ),
    index("emails_message_id_idx").on(table.messageId),
    index("emails_archived_at_idx").on(table.archivedAt),
    index("emails_starred_at_idx").on(table.starredAt),
    index("emails_spam_at_idx").on(table.spamAt),
    index("emails_trashed_at_idx").on(table.trashedAt),
    index("emails_deleted_at_idx").on(table.deletedAt),
  ],
);

export const mailboxes = pgTable(
  "mailboxes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    signature: text("signature"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", timestampOptions).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampOptions).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("mailboxes_email_idx").on(sql`lower(${table.email})`),
    uniqueIndex("mailboxes_one_default_idx")
      .on(table.isDefault)
      .where(sql`${table.isDefault} = true`),
  ],
);

export const drafts = pgTable(
  "drafts",
  {
    id: text("id").primaryKey(),
    mailboxId: text("mailbox_id")
      .notNull()
      .references(() => mailboxes.id, { onDelete: "cascade" }),
    toAddresses: jsonb("to_addresses").$type<string[]>().notNull().default([]),
    ccAddresses: jsonb("cc_addresses").$type<string[]>().notNull().default([]),
    bccAddresses: jsonb("bcc_addresses")
      .$type<string[]>()
      .notNull()
      .default([]),
    subject: text("subject").notNull().default(""),
    textBody: text("text_body").notNull().default(""),
    htmlBody: text("html_body"),
    replyToEmailId: text("reply_to_email_id"),
    forwardedEmailId: text("forwarded_email_id"),
    forwardedAttachments: jsonb("forwarded_attachments")
      .$type<EmailAttachment[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", timestampOptions).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampOptions).notNull().defaultNow(),
  },
  (table) => [
    index("drafts_mailbox_updated_at_idx").on(
      table.mailboxId,
      table.updatedAt.desc(),
    ),
  ],
);

export type EmailRow = typeof emails.$inferSelect;
export type NewEmailRow = typeof emails.$inferInsert;
export type MailboxRow = typeof mailboxes.$inferSelect;
export type NewMailboxRow = typeof mailboxes.$inferInsert;
export type DraftRow = typeof drafts.$inferSelect;
export type NewDraftRow = typeof drafts.$inferInsert;
