import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  connections,
  domains,
  mailboxes,
  type MailboxRow,
} from "@/lib/db/schema";
import type { Mailbox } from "@/lib/mailbox/types";

type MailboxFields = Pick<
  MailboxRow,
  | "id"
  | "connectionId"
  | "domainId"
  | "name"
  | "email"
  | "signature"
  | "isDefault"
> & { connectionLabel: string; domain: string; domainStatus: string };

const mailboxSelection = {
  id: mailboxes.id,
  connectionId: mailboxes.connectionId,
  connectionLabel: connections.label,
  domainId: mailboxes.domainId,
  domain: domains.name,
  domainStatus: domains.status,
  name: mailboxes.name,
  email: mailboxes.email,
  signature: mailboxes.signature,
  isDefault: mailboxes.isDefault,
};

function baseQuery() {
  return db
    .select(mailboxSelection)
    .from(mailboxes)
    .innerJoin(connections, eq(mailboxes.connectionId, connections.id))
    .innerJoin(domains, eq(mailboxes.domainId, domains.id));
}

function toMailbox(row: MailboxFields): Mailbox {
  return {
    ...row,
    signature: row.signature ?? "",
    verificationStatus:
      row.domainStatus === "verified" ? "verified" : "unverified",
  };
}

export async function listMailboxes(): Promise<Mailbox[]> {
  const rows = await baseQuery().orderBy(
    asc(connections.label),
    desc(mailboxes.isDefault),
    asc(domains.name),
    asc(mailboxes.name),
  );
  return rows.map(toMailbox);
}

export async function listConnectionMailboxes(connectionId: string) {
  const rows = await baseQuery()
    .where(eq(mailboxes.connectionId, connectionId))
    .orderBy(desc(mailboxes.isDefault), asc(mailboxes.name));
  return rows.map(toMailbox);
}

export async function listDomainMailboxes(domainId: string) {
  const rows = await baseQuery()
    .where(eq(mailboxes.domainId, domainId))
    .orderBy(desc(mailboxes.isDefault), asc(mailboxes.name));
  return rows.map(toMailbox);
}

export async function getMailbox(id: string) {
  const [mailbox] = await baseQuery().where(eq(mailboxes.id, id)).limit(1);
  return mailbox ? toMailbox(mailbox) : undefined;
}

export async function getMailboxByEmail(email: string, connectionId: string) {
  const [mailbox] = await baseQuery()
    .where(
      and(
        eq(mailboxes.connectionId, connectionId),
        sql`lower(${mailboxes.email}) = ${email.trim().toLowerCase()}`,
      ),
    )
    .limit(1);
  return mailbox ? toMailbox(mailbox) : undefined;
}

export async function createMailbox(
  name: string,
  email: string,
  domainId: string,
) {
  return db.transaction(async (transaction) => {
    const [domain] = await transaction
      .select({
        id: domains.id,
        name: domains.name,
        status: domains.status,
        connectionId: domains.connectionId,
        connectionLabel: connections.label,
      })
      .from(domains)
      .innerJoin(connections, eq(domains.connectionId, connections.id))
      .where(eq(domains.id, domainId))
      .limit(1);

    if (
      !domain ||
      domain.status !== "verified" ||
      email.split("@").at(-1)?.toLowerCase() !== domain.name
    ) {
      throw new Error("INVALID_DOMAIN");
    }

    await transaction
      .update(mailboxes)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(mailboxes.domainId, domain.id),
          eq(mailboxes.isDefault, true),
        ),
      );
    const [mailbox] = await transaction
      .insert(mailboxes)
      .values({
        id: crypto.randomUUID(),
        connectionId: domain.connectionId,
        domainId: domain.id,
        name,
        email,
        isDefault: true,
      })
      .returning();

    return toMailbox({
      ...mailbox,
      connectionLabel: domain.connectionLabel,
      domain: domain.name,
      domainStatus: domain.status,
    });
  });
}

export async function updateMailbox(id: string, name: string, email: string) {
  const current = await getMailbox(id);
  if (!current || email.split("@").at(-1)?.toLowerCase() !== current.domain) {
    return undefined;
  }
  const [mailbox] = await db
    .update(mailboxes)
    .set({ name, email, updatedAt: new Date() })
    .where(eq(mailboxes.id, id))
    .returning({ id: mailboxes.id });
  return mailbox ? getMailbox(mailbox.id) : undefined;
}

export async function updateMailboxSignature(id: string, signature: string) {
  const [mailbox] = await db
    .update(mailboxes)
    .set({ signature: signature || null, updatedAt: new Date() })
    .where(eq(mailboxes.id, id))
    .returning({ id: mailboxes.id });
  return mailbox;
}

export async function deleteMailbox(id: string) {
  return db.transaction(async (transaction) => {
    const [mailbox] = await transaction
      .select()
      .from(mailboxes)
      .where(eq(mailboxes.id, id))
      .for("update")
      .limit(1);
    if (!mailbox) return { status: "not_found" as const };

    await transaction.delete(mailboxes).where(eq(mailboxes.id, id));
    const [next] = await transaction
      .select({ id: mailboxes.id })
      .from(mailboxes)
      .where(eq(mailboxes.domainId, mailbox.domainId))
      .orderBy(desc(mailboxes.isDefault), asc(mailboxes.createdAt))
      .limit(1);

    if (next && mailbox.isDefault) {
      await transaction
        .update(mailboxes)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(mailboxes.id, next.id));
    }

    return { status: "deleted" as const, selectedMailboxId: next?.id };
  });
}

export async function selectMailbox(id: string) {
  return db.transaction(async (transaction) => {
    const [mailbox] = await transaction
      .select({
        id: mailboxes.id,
        connectionId: mailboxes.connectionId,
        domainId: mailboxes.domainId,
      })
      .from(mailboxes)
      .where(eq(mailboxes.id, id))
      .for("update")
      .limit(1);
    if (!mailbox) return false;

    await transaction
      .update(mailboxes)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(mailboxes.domainId, mailbox.domainId),
          eq(mailboxes.isDefault, true),
        ),
      );
    await transaction
      .update(mailboxes)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(mailboxes.id, id));
    return true;
  });
}
