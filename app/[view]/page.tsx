import { notFound } from "next/navigation";

import { MailPage } from "@/components/modules/mail";
import { isHomeView } from "@/components/modules/mail/types";
import { listDrafts } from "@/lib/draft/repository";
import { listMailboxesWithVerification } from "@/lib/mailbox/verification";

export default async function MailViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;

  if (!isHomeView(view)) {
    notFound();
  }

  const [mailboxes, drafts] = await Promise.all([
    listMailboxesWithVerification(),
    listDrafts(),
  ]);

  return (
    <MailPage
      initialActiveView={view}
      initialDrafts={drafts}
      initialMailboxes={mailboxes}
    />
  );
}
