"use server";

import { randomUUID } from "node:crypto";

import { extractEmailAddress, isValidEmailAddress } from "@/lib/email/address";
import { getEmail, saveEmail } from "@/lib/email/repository";
import { MAX_EMAIL_RECIPIENTS, type ActionResult } from "@/lib/email/types";
import { getMailbox } from "@/lib/mailbox/repository";
import { formatMailbox } from "@/lib/mailbox/types";
import { isAuthenticated } from "@/lib/server/auth";
import { getResendClient } from "@/lib/server/resend";
import {
  getActiveWorkspace,
  isMailboxInActiveWorkspace,
} from "@/lib/server/workspace";
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

const templateIdPattern =
  /^(?:template_)?[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_NAME_LENGTH = 120;
const MAX_SUBJECT_LENGTH = 998;
const MAX_TEMPLATE_HTML_LENGTH = 2_000_000;

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

export async function importHtmlTemplateAction(input: {
  fileName: string;
  html: string;
}): Promise<TemplateActionResult> {
  const workspace = await requireWorkspace();
  if (!workspace.ok) return workspace;

  if (!input.html.trim()) {
    return { ok: false, error: "The selected HTML file is empty." };
  }
  if (input.html.length > MAX_TEMPLATE_HTML_LENGTH) {
    return { ok: false, error: "Template HTML is too large." };
  }

  const fileName =
    input.fileName.split(/[\\/]/).at(-1)?.trim().slice(0, 255) ||
    "Imported template.html";
  const name =
    cleanName(fileName.replace(/\.html?$/i, "")) || "Imported template";
  const html = sanitizeTemplateHtml(input.html);
  const template = await createTemplate({
    id: createTemplateId(),
    connectionId: workspace.connectionId,
    domainId: workspace.domainId,
    name,
    subject: "",
    html,
    text: templateHtmlToText(html),
    sourceType: "import",
    metadata: { importedFileName: fileName },
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
    email.html?.trim() ||
      `<p>${escapeHtml(email.text).replaceAll("\n", "<br>")}</p>`,
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
  if (input.html.length > MAX_TEMPLATE_HTML_LENGTH) {
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

export async function sendTemplateEmailAction(input: {
  templateId: string;
  mailboxId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
}): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  if (!templateIdPattern.test(input.templateId)) {
    return { ok: false, error: "Template ID is invalid." };
  }

  const workspace = await getActiveWorkspace();
  if (!workspace) return { ok: false, error: "Choose a workspace first." };

  const [template, mailbox] = await Promise.all([
    getTemplate(input.templateId, workspace.connection.id, workspace.domain.id),
    getMailbox(input.mailboxId),
  ]);
  if (!template) return { ok: false, error: "Template not found." };
  if (!mailbox || !(await isMailboxInActiveWorkspace(mailbox))) {
    return { ok: false, error: "Choose a mailbox first." };
  }

  const recipients = normalizeRecipientGroups(input);
  const allRecipients = [...recipients.to, ...recipients.cc, ...recipients.bcc];
  if (!recipients.to.length) {
    return { ok: false, error: "Add at least one recipient." };
  }
  if (!allRecipients.every(isValidEmailAddress)) {
    return { ok: false, error: "Enter valid recipient addresses." };
  }
  if (allRecipients.length > MAX_EMAIL_RECIPIENTS) {
    return {
      ok: false,
      error: `You can send to up to ${MAX_EMAIL_RECIPIENTS} recipients.`,
    };
  }

  const subject = input.subject.trim().slice(0, MAX_SUBJECT_LENGTH);
  if (!subject) return { ok: false, error: "Subject is required." };

  const resend = await getResendClient(mailbox.connectionId);
  const { data, error } = await resend.emails.send({
    from: formatMailbox(mailbox),
    to: recipients.to,
    cc: recipients.cc.length ? recipients.cc : undefined,
    bcc: recipients.bcc.length ? recipients.bcc : undefined,
    subject,
    text: template.text,
    html: template.html,
  });
  if (error || !data) {
    return { ok: false, error: error?.message || "Unable to send email." };
  }

  try {
    const sentAt = new Date().toISOString();
    await saveEmail({
      id: data.id,
      connectionId: mailbox.connectionId,
      direction: "outbound",
      from: formatMailbox(mailbox),
      to: recipients.to,
      cc: recipients.cc,
      bcc: recipients.bcc,
      subject,
      text: template.text,
      html: template.html,
      attachments: [],
      deliveryStatus: "queued",
      deliveryUpdatedAt: sentAt,
      createdAt: sentAt,
    });
  } catch (databaseError) {
    console.error(
      "Template email sent but could not be saved locally.",
      databaseError,
    );
  }

  return { ok: true };
}

export async function deleteTemplateAction(
  id: string,
): Promise<TemplateActionResult> {
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
  return deleted ? { ok: true } : { ok: false, error: "Template not found." };
}

function createTemplateId() {
  return randomUUID();
}

function cleanName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

function normalizeRecipientGroups(input: {
  to: string[];
  cc: string[];
  bcc: string[];
}) {
  const seen = new Set<string>();
  const normalize = (values: string[]) =>
    values.reduce<string[]>((recipients, value) => {
      const address = extractEmailAddress(value);
      if (!address || seen.has(address)) return recipients;
      seen.add(address);
      recipients.push(address);
      return recipients;
    }, []);

  return {
    to: normalize(input.to),
    cc: normalize(input.cc),
    bcc: normalize(input.bcc),
  };
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
