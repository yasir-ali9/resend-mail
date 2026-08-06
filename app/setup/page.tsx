import { redirect } from "next/navigation";

import { getConnection, getDomain } from "@/lib/connection/repository";
import { listDomainMailboxes } from "@/lib/mailbox/repository";
import { getSession, isAuthenticated } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await isAuthenticated())) redirect("/setup/access");

  const session = await getSession();
  if (!session?.connectionId) redirect("/setup/account");

  const connection = await getConnection(session.connectionId);
  if (!connection) redirect("/setup/account");
  if (!session.domainId) redirect("/setup/domain");

  const domain = await getDomain(session.domainId, connection.id);
  if (domain?.status !== "verified") redirect("/setup/domain");

  const mailboxes = await listDomainMailboxes(domain.id);
  redirect(mailboxes.length ? "/inbox" : "/setup/mailbox");
}
