import { notFound, redirect } from "next/navigation";

import { TemplateEditor } from "@/components/modules/templates/editor";
import { listMailboxesWithVerification } from "@/lib/mailbox/verification";
import { getActiveWorkspace } from "@/lib/server/workspace";
import { getTemplate } from "@/lib/template/repository";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const [{ templateId }, workspace] = await Promise.all([
    params,
    getActiveWorkspace(),
  ]);
  if (!workspace) redirect("/setup");

  const [template, allMailboxes] = await Promise.all([
    getTemplate(templateId, workspace.connection.id, workspace.domain.id),
    listMailboxesWithVerification(),
  ]);
  if (!template) notFound();

  const mailboxes = allMailboxes.filter(
    (mailbox) =>
      mailbox.connectionId === workspace.connection.id &&
      mailbox.domainId === workspace.domain.id,
  );

  return <TemplateEditor initialTemplate={template} mailboxes={mailboxes} />;
}
