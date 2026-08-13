"use server";

import { randomUUID } from "node:crypto";

import { getEmail } from "@/lib/email/repository";
import { isAuthenticated } from "@/lib/server/auth";
import { getActiveWorkspace } from "@/lib/server/workspace";
import { builtInTemplate, BUILT_IN_TEMPLATE_ID } from "@/lib/template/built-in";
import {
  createBlankTemplateHtml,
  sanitizeTemplateHtml,
  templateHtmlToText,
} from "@/lib/template/html";
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from "@/lib/template/repository";
import type { TemplateActionResult } from "@/lib/template/types";

const templateIdPattern = /^(?:template_)?[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_NAME_LENGTH = 120;
const MAX_SUBJECT_LENGTH = 998;

export async function createBlankTemplateAction(): Promise<TemplateActionResult> {
  const workspace = await requireWorkspace();
  if (!workspace.ok) return workspace;

  const html = createBlankTemplateHtml();
  const template = await createTemplate({
    id: createTemplateId(),
    connectionId: workspace.connectionId,
    domainId: workspace.domainId,
    name: "Untitled template",
    subject: "",
    html,
    text: templateHtmlToText(html),
    sourceType: "blank",
  });

  return { ok: true, template };
}

export async function cloneBuiltInTemplateAction(
  builtInId: string,
): Promise<TemplateActionResult> {
  const workspace = await requireWorkspace();
  if (!workspace.ok) return workspace;
  if (builtInId !== BUILT_IN_TEMPLATE_ID) {
    return { ok: false, error: "That built-in template is unavailable." };
  }

  const html = sanitizeTemplateHtml(builtInTemplate.html);
  const template = await createTemplate({
    id: createTemplateId(),
    connectionId: workspace.connectionId,
    domainId: workspace.domainId,
    name: `${builtInTemplate.name} copy`,
    subject: builtInTemplate.subject,
    html,
    text: templateHtmlToText(html),
    sourceType: "built_in",
    metadata: { builtInId },
  });

  return { ok: true, template };
}

export async function cloneTemplateAction(
  sourceTemplateId: string,
): Promise<TemplateActionResult> {
  const workspace = await requireWorkspace();
  if (!workspace.ok) return workspace;
  if (!templateIdPattern.test(sourceTemplateId)) {
    return { ok: false, error: "Template ID is invalid." };
  }

  const source = await getTemplate(
    sourceTemplateId,
    workspace.connectionId,
    workspace.domainId,
  );
  if (!source) return { ok: false, error: "Template not found." };

  const template = await createTemplate({
    id: createTemplateId(),
    connectionId: workspace.connectionId,
    domainId: workspace.domainId,
    name: `${source.name} copy`.slice(0, MAX_NAME_LENGTH),
    subject: source.subject,
    html: source.html,
    text: source.text,
    sourceType: "duplicate",
    metadata: { sourceTemplateId },
  });

  return { ok: true, template };
}

export async function cloneEmailAsTemplateAction(
  emailId: string,
): Promise<TemplateActionResult> {
  const workspace = await requireWorkspace();
  if (!workspace.ok) return workspace;
  if (!emailId || emailId.length > 200) {
    return { ok: false, error: "Email ID is invalid." };
  }

  const email = await getEmail(emailId);
  if (!email || email.connectionId !== workspace.connectionId) {
    return { ok: false, error: "Email not found in this workspace." };
  }

  const html = sanitizeTemplateHtml(
    email.html?.trim() || `<p>${escapeHtml(email.text).replaceAll("\n", "<br>")}</p>`,
  );
  const template = await createTemplate({
    id: createTemplateId(),
    connectionId: workspace.connectionId,
    domainId: workspace.domainId,
    name: cleanName(email.subject || "Cloned email"),
    subject: email.subject,
    html,
    text: templateHtmlToText(html),
    sourceType: "email",
    sourceEmailId: email.id,
  });

  return { ok: true, template };
}

export async function saveTemplateAction(input: {
  id: string;
  name: string;
  subject: string;
  html: string;
}): Promise<TemplateActionResult> {
  const workspace = await requireWorkspace();
  if (!workspace.ok) return workspace;
  if (!templateIdPattern.test(input.id)) {
    return { ok: false, error: "Template ID is invalid." };
  }

  const name = cleanName(input.name);
  const subject = input.subject.trim().slice(0, MAX_SUBJECT_LENGTH);
  if (!name) return { ok: false, error: "Template name is required." };
  if (input.html.length > 2_000_000) {
    return { ok: false, error: "Template HTML is too large." };
  }

  const html = sanitizeTemplateHtml(input.html);
  const template = await updateTemplate({
    id: input.id,
    connectionId: workspace.connectionId,
    domainId: workspace.domainId,
    name,
    subject,
    html,
    text: templateHtmlToText(html),
  });

  return template
    ? { ok: true, template }
    : { ok: false, error: "Template not found." };
}

export async function deleteTemplateAction(id: string): Promise<TemplateActionResult> {
  const workspace = await requireWorkspace();
  if (!workspace.ok) return workspace;
  if (!templateIdPattern.test(id)) {
    return { ok: false, error: "Template ID is invalid." };
  }

  const deleted = await deleteTemplate(
    id,
    workspace.connectionId,
    workspace.domainId,
  );
  return deleted
    ? { ok: true }
    : { ok: false, error: "Template not found." };
}

function createTemplateId() {
  return randomUUID();
}

function cleanName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

async function requireWorkspace(): Promise<
  | { ok: true; connectionId: string; domainId: string }
  | { ok: false; error: string }
> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  const workspace = await getActiveWorkspace();
  if (!workspace) return { ok: false, error: "Choose a workspace first." };
  return {
    ok: true,
    connectionId: workspace.connection.id,
    domainId: workspace.domain.id,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
