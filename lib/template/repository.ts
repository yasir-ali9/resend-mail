import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { templates, type TemplateRow, type TemplateSourceType } from "@/lib/db/schema";
import type { MailTemplate, TemplateSummary } from "@/lib/template/types";

export async function listTemplates(
  connectionId: string,
  domainId: string,
): Promise<TemplateSummary[]> {
  const rows = await db
    .select({
      id: templates.id,
      name: templates.name,
      subject: templates.subject,
      html: templates.html,
      sourceType: templates.sourceType,
      updatedAt: templates.updatedAt,
    })
    .from(templates)
    .where(
      and(
        eq(templates.connectionId, connectionId),
        eq(templates.domainId, domainId),
      ),
    )
    .orderBy(desc(templates.updatedAt));

  return rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getTemplate(
  id: string,
  connectionId: string,
  domainId: string,
): Promise<MailTemplate | undefined> {
  const [row] = await db
    .select()
    .from(templates)
    .where(
      and(
        eq(templates.id, id),
        eq(templates.connectionId, connectionId),
        eq(templates.domainId, domainId),
      ),
    )
    .limit(1);

  return row ? toMailTemplate(row) : undefined;
}

export async function createTemplate(input: {
  id: string;
  connectionId: string;
  domainId: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  sourceType: TemplateSourceType;
  sourceEmailId?: string;
  metadata?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(templates)
    .values({
      ...input,
      sourceEmailId: input.sourceEmailId || null,
      metadata: input.metadata ?? {},
    })
    .returning();

  return toMailTemplate(row);
}

export async function updateTemplate(input: {
  id: string;
  connectionId: string;
  domainId: string;
  name: string;
  subject: string;
  html: string;
  text: string;
}) {
  const [row] = await db
    .update(templates)
    .set({
      name: input.name,
      subject: input.subject,
      html: input.html,
      textBody: input.text,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(templates.id, input.id),
        eq(templates.connectionId, input.connectionId),
        eq(templates.domainId, input.domainId),
      ),
    )
    .returning();

  return row ? toMailTemplate(row) : undefined;
}

export async function deleteTemplate(
  id: string,
  connectionId: string,
  domainId: string,
) {
  const rows = await db
    .delete(templates)
    .where(
      and(
        eq(templates.id, id),
        eq(templates.connectionId, connectionId),
        eq(templates.domainId, domainId),
      ),
    )
    .returning({ id: templates.id });

  return rows.length > 0;
}

function toMailTemplate(row: TemplateRow): MailTemplate {
  return {
    id: row.id,
    connectionId: row.connectionId,
    domainId: row.domainId,
    name: row.name,
    subject: row.subject,
    html: row.html,
    text: row.textBody,
    sourceType: row.sourceType,
    sourceEmailId: row.sourceEmailId ?? undefined,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
