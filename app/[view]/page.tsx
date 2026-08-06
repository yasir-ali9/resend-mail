import { notFound, redirect } from "next/navigation";

import { MailPage } from "@/components/modules/mail";
import { isHomeView } from "@/components/modules/mail/types";
import { listDrafts } from "@/lib/draft/repository";
import { listMailboxesWithVerification } from "@/lib/mailbox/verification";
import { getActiveWorkspace } from "@/lib/server/workspace";

export default async function MailViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;

  if (!isHomeView(view)) {
    notFound();
  }

  const [workspace, allMailboxes, allDrafts] = await Promise.all([
    getActiveWorkspace(),
    listMailboxesWithVerification(),
    listDrafts(),
  ]);

  if (!workspace) redirect("/setup");
  const mailboxes = allMailboxes.filter(
    (mailbox) =>
      mailbox.connectionId === workspace.connection.id &&
      mailbox.domainId === workspace.domain.id,
  );
  if (!mailboxes.length) redirect("/setup/mailbox");
  const mailboxIds = new Set(mailboxes.map((mailbox) => mailbox.id));
  const drafts = allDrafts.filter((draft) => mailboxIds.has(draft.mailboxId));

  return (
    <MailPage
      initialActiveView={view}
      initialDrafts={drafts}
      initialMailboxes={mailboxes}
      activeConnection={workspace.connection}
      activeDomain={workspace.domain}
    />
  );
}
