import { notFound, redirect } from "next/navigation";

import { TemplateEditor } from "@/components/modules/templates/editor";
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

  const template = await getTemplate(
    templateId,
    workspace.connection.id,
    workspace.domain.id,
  );
  if (!template) notFound();

  return <TemplateEditor initialTemplate={template} />;
}
