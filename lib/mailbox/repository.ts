import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { mailboxes, type MailboxRow } from "@/lib/db/schema";
import type { Mailbox } from "@/lib/mailbox/types";

type MailboxFields = Pick<
  MailboxRow,
  "id" | "name" | "email" | "signature" | "isDefault"
>;

const mailboxSelection = {
  id: mailboxes.id,
  name: mailboxes.name,
  email: mailboxes.email,
  signature: mailboxes.signature,
  isDefault: mailboxes.isDefault,
};

function toMailbox(row: MailboxFields): Mailbox {
  return {
    ...row,
    signature: row.signature ?? "",
    verificationStatus: "unknown",
  };
}

export async function listMailboxes(): Promise<Mailbox[]> {
  const rows = await db
    .select(mailboxSelection)
    .from(mailboxes)
    .orderBy(desc(mailboxes.isDefault), asc(mailboxes.name), asc(mailboxes.email));

  return rows.map(toMailbox);
}

export async function getMailbox(id: string) {
  const [mailbox] = await db
    .select(mailboxSelection)
    .from(mailboxes)
    .where(eq(mailboxes.id, id))
    .limit(1);

  return mailbox ? toMailbox(mailbox) : undefined;
}

export async function getMailboxByEmail(email: string) {
  const [mailbox] = await db
    .select(mailboxSelection)
    .from(mailboxes)
    .where(sql`lower(${mailboxes.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);

  return mailbox ? toMailbox(mailbox) : undefined;
}

export async function createMailbox(name: string, email: string) {
  return db.transaction(async (transaction) => {
    await transaction
      .update(mailboxes)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(mailboxes.isDefault, true));

    const [mailbox] = await transaction
      .insert(mailboxes)
      .values({
        id: crypto.randomUUID(),
        name,
        email,
        isDefault: true,
      })
      .returning(mailboxSelection);

    return toMailbox(mailbox);
  });
}

export async function updateMailbox(
  id: string,
  name: string,
  email: string,
) {
  const [mailbox] = await db
    .update(mailboxes)
    .set({ name, email, updatedAt: new Date() })
    .where(eq(mailboxes.id, id))
    .returning(mailboxSelection);

  return mailbox ? toMailbox(mailbox) : undefined;
}

export async function updateMailboxSignature(
  id: string,
  signature: string,
) {
  const [mailbox] = await db
    .update(mailboxes)
    .set({
      signature: signature || null,
      updatedAt: new Date(),
    })
    .where(eq(mailboxes.id, id))
    .returning({ id: mailboxes.id });

  return mailbox;
}

export async function deleteMailbox(id: string) {
  return db.transaction(async (transaction) => {
    const mailboxRows = await transaction
      .select()
      .from(mailboxes)
      .orderBy(desc(mailboxes.isDefault), asc(mailboxes.createdAt))
      .for("update");
    const mailbox = mailboxRows.find((candidate) => candidate.id === id);

    if (!mailbox) {
      return { status: "not_found" as const };
    }

    if (mailboxRows.length === 1) {
      return { status: "last_mailbox" as const };
    }

    await transaction.delete(mailboxes).where(eq(mailboxes.id, id));

    let selectedMailbox = mailboxRows.find(
      (candidate) => candidate.id !== id && candidate.isDefault,
    );

    if (!selectedMailbox) {
      selectedMailbox = mailboxRows.find((candidate) => candidate.id !== id);

      if (selectedMailbox) {
        await transaction
          .update(mailboxes)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(mailboxes.id, selectedMailbox.id));
        selectedMailbox = { ...selectedMailbox, isDefault: true };
      }
    }

    return {
      status: "deleted" as const,
      selectedMailbox: selectedMailbox
        ? toMailbox(selectedMailbox)
        : undefined,
    };
  });
}

export async function selectMailbox(id: string) {
  return db.transaction(async (transaction) => {
    const [mailbox] = await transaction
      .select({ id: mailboxes.id })
      .from(mailboxes)
      .where(eq(mailboxes.id, id))
      .for("update")
      .limit(1);

    if (!mailbox) {
      return false;
    }

    await transaction
      .update(mailboxes)
      .set({
        isDefault: false,
        updatedAt: new Date(),
      })
      .where(eq(mailboxes.isDefault, true));

    await transaction
      .update(mailboxes)
      .set({
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(eq(mailboxes.id, id));

    return true;
  });
}
