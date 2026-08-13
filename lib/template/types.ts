import type { TemplateSourceType } from "@/lib/db/schema";

export interface MailTemplate {
  id: string;
  connectionId: string;
  domainId: string;
  name: string;
  subject: string;
  html: string;
  text: string;
  sourceType: TemplateSourceType;
  sourceEmailId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSummary {
  id: string;
  name: string;
  subject: string;
  html: string;
  sourceType: TemplateSourceType;
  updatedAt: string;
}

export interface TemplateActionResult {
  ok: boolean;
  error?: string;
  template?: MailTemplate;
}
