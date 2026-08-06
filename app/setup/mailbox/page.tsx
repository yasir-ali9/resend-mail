import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MailboxSetup } from "@/components/modules/mail/mailbox-setup";
import { listDomainMailboxes } from "@/lib/mailbox/repository";
import { isAuthenticated } from "@/lib/server/auth";
import { getActiveWorkspace } from "@/lib/server/workspace";

export const metadata: Metadata = { title: "Create mailbox" };
export const dynamic = "force-dynamic";

export default async function MailboxSetupPage() {
  if (!(await isAuthenticated())) redirect("/setup/access");

  const workspace = await getActiveWorkspace();
  if (!workspace) redirect("/setup");

  const mailboxes = await listDomainMailboxes(workspace.domain.id);
  if (mailboxes.length) redirect("/inbox");

  return (
    <MailboxSetup
      connection={workspace.connection}
      domain={workspace.domain}
    />
  );
}
