import "server-only";

import { listConnections } from "@/lib/connection/repository";
import { getSession } from "@/lib/server/auth";
import type { Mailbox } from "@/lib/mailbox/types";

export async function getActiveWorkspace() {
  const session = await getSession();
  if (!session?.connectionId || !session.domainId) return undefined;

  const connection = (await listConnections()).find(
    (candidate) => candidate.id === session.connectionId,
  );
  const domain = connection?.domains.find(
    (candidate) =>
      candidate.id === session.domainId && candidate.status === "verified",
  );

  return connection && domain ? { connection, domain } : undefined;
}

export async function isMailboxInActiveWorkspace(
  mailbox: Pick<Mailbox, "connectionId" | "domainId">,
) {
  const session = await getSession();
  return (
    mailbox.connectionId === session?.connectionId &&
    mailbox.domainId === session.domainId
  );
}
