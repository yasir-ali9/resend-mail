import { notFound, redirect } from "next/navigation";

import { MailPage } from "@/components/modules/mail";
import { isHomeThreadView } from "@/components/modules/mail/types";
import { listDrafts } from "@/lib/draft/repository";
import { listMailboxesWithVerification } from "@/lib/mailbox/verification";
import { getActiveWorkspace } from "@/lib/server/workspace";

export default async function MailThreadPage({
  params,
}: {
  params: Promise<{ view: string; threadId: string }>;
}) {
  const { threadId, view } = await params;

  if (!isHomeThreadView(view) || !/^[a-f0-9]{32}$/.test(threadId)) {
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
  const mailboxIds = new Set(mailboxes.map((mailbox) => mailbox.id));
  const drafts = allDrafts.filter((draft) => mailboxIds.has(draft.mailboxId));

  return (
    <MailPage
      initialActiveView={view}
      initialThreadId={`thread_${threadId}`}
      initialDrafts={drafts}
      initialMailboxes={mailboxes}
      activeConnection={workspace.connection}
      activeDomain={workspace.domain}
    />
  );
}
