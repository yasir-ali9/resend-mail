import { notFound } from "next/navigation";

import { MailPage } from "@/components/modules/mail";
import { isHomeThreadView } from "@/components/modules/mail/types";
import { listDrafts } from "@/lib/draft/repository";
import { listMailboxesWithVerification } from "@/lib/mailbox/verification";

export default async function MailThreadPage({
  params,
}: {
  params: Promise<{ view: string; threadId: string }>;
}) {
  const { threadId, view } = await params;

  if (!isHomeThreadView(view) || !/^[a-f0-9]{32}$/.test(threadId)) {
    notFound();
  }

  const [mailboxes, drafts] = await Promise.all([
    listMailboxesWithVerification(),
    listDrafts(),
  ]);

  return (
    <MailPage
      initialActiveView={view}
      initialThreadId={`thread_${threadId}`}
      initialDrafts={drafts}
      initialMailboxes={mailboxes}
    />
  );
}
