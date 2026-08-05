import "server-only";

import { getMailbox, listMailboxes } from "@/lib/mailbox/repository";
import type { Mailbox } from "@/lib/mailbox/types";

export function listMailboxesWithVerification(): Promise<Mailbox[]> {
  return listMailboxes();
}

export async function verifyMailbox(mailbox: Mailbox): Promise<Mailbox> {
  return (await getMailbox(mailbox.id)) ?? mailbox;
}
