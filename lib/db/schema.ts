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

export type ConnectionAuthType = "api_key" | "oauth";
export type ConnectionStatus = "active" | "error" | "revoked";

const timestampOptions = {
  mode: "date",
  withTimezone: true,
} as const;

export const connections = pgTable(
  "connections",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    authType: text("auth_type").$type<ConnectionAuthType>().notNull(),
    encryptedApiKey: text("encrypted_api_key"),
    encryptedAccessToken: text("encrypted_access_token"),
    encryptedRefreshToken: text("encrypted_refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", timestampOptions),
    credentialFingerprint: text("credential_fingerprint").notNull(),
    accountMarkers: jsonb("account_markers")
      .$type<string[]>()
      .notNull()
      .default([]),
    status: text("status").$type<ConnectionStatus>().notNull().default("active"),
    webhookEndpointToken: text("webhook_endpoint_token").notNull(),
    encryptedWebhookSecret: text("encrypted_webhook_secret"),
    lastVerifiedAt: timestamp("last_verified_at", timestampOptions),
    createdAt: timestamp("created_at", timestampOptions).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampOptions).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("connections_credential_fingerprint_idx").on(
      table.credentialFingerprint,
    ),
    uniqueIndex("connections_webhook_endpoint_token_idx").on(
      table.webhookEndpointToken,
    ),
  ],
);

export const domains = pgTable(
  "domains",
  {
    id: text("id").primaryKey(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status").notNull(),
    sendingEnabled: boolean("sending_enabled").notNull().default(false),
    receivingEnabled: boolean("receiving_enabled").notNull().default(false),
    createdAt: timestamp("created_at", timestampOptions).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampOptions).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("domains_connection_name_idx").on(
      table.connectionId,
      sql`lower(${table.name})`,
    ),
    index("domains_connection_idx").on(table.connectionId),
  ],
);

export const emails = pgTable(
  "emails",
  {
    id: text("id").primaryKey(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
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
      table.connectionId,
      table.direction,
      table.createdAt.desc(),
    ),
    index("emails_connection_thread_created_at_idx").on(
      table.connectionId,
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
    connectionId: text("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    signature: text("signature"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", timestampOptions).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampOptions).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("mailboxes_connection_email_idx").on(
      table.connectionId,
      sql`lower(${table.email})`,
    ),
    uniqueIndex("mailboxes_one_default_per_domain_idx")
      .on(table.domainId, table.isDefault)
      .where(sql`${table.isDefault} = true`),
    index("mailboxes_domain_idx").on(table.domainId),
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

export type TemplateSourceType =
  | "blank"
  | "built_in"
  | "email"
  | "duplicate"
  | "import";

export const templates = pgTable(
  "templates",
  {
    id: text("id").primaryKey(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => connections.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject").notNull().default(""),
    html: text("html").notNull(),
    textBody: text("text_body").notNull().default(""),
    sourceType: text("source_type")
      .$type<TemplateSourceType>()
      .notNull()
      .default("blank"),
    sourceEmailId: text("source_email_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", timestampOptions).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", timestampOptions).notNull().defaultNow(),
  },
  (table) => [
    index("templates_domain_updated_at_idx").on(
      table.domainId,
      table.updatedAt.desc(),
    ),
    index("templates_connection_idx").on(table.connectionId),
  ],
);

export type EmailRow = typeof emails.$inferSelect;
export type NewEmailRow = typeof emails.$inferInsert;
export type MailboxRow = typeof mailboxes.$inferSelect;
export type NewMailboxRow = typeof mailboxes.$inferInsert;
export type ConnectionRow = typeof connections.$inferSelect;
export type NewConnectionRow = typeof connections.$inferInsert;
export type DomainRow = typeof domains.$inferSelect;
export type NewDomainRow = typeof domains.$inferInsert;
export type DraftRow = typeof drafts.$inferSelect;
export type NewDraftRow = typeof drafts.$inferInsert;
export type TemplateRow = typeof templates.$inferSelect;
export type NewTemplateRow = typeof templates.$inferInsert;
