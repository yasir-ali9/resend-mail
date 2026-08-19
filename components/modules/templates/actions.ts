"use server";

import { randomUUID } from "node:crypto";

import { extractEmailAddress, isValidEmailAddress } from "@/lib/email/address";
import { getEmail, saveEmail } from "@/lib/email/repository";
import {
  MAX_ATTACHMENT_COUNT,
  MAX_EMAIL_RECIPIENTS,
  MAX_TOTAL_ATTACHMENT_BYTES,
  type ActionResult,
  type EmailAttachment,
} from "@/lib/email/types";
import { getMailbox } from "@/lib/mailbox/repository";
import { formatMailbox } from "@/lib/mailbox/types";
import { isAuthenticated } from "@/lib/server/auth";
import { getResendClient } from "@/lib/server/resend";
import {
  getActiveWorkspace,
  isMailboxInActiveWorkspace,
} from "@/lib/server/workspace";
import { builtInTemplates } from "@/lib/template/built-in";
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
  const builtInTemplate = builtInTemplates.find(
    (template) => template.id === builtInId,
  );
  if (!builtInTemplate) {
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

export async function sendTemplateEmailAction(
  formData: FormData,
): Promise<ActionResult> {
  if (!(await isAuthenticated())) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  const templateId = readFormValue(formData, "templateId");
  const mailboxId = readFormValue(formData, "mailboxId");
  if (!templateIdPattern.test(templateId)) {
    return { ok: false, error: "Template ID is invalid." };
  }

  const files = formData
    .getAll("attachments")
    .filter((entry): entry is File => typeof entry !== "string");

  const workspace = await getActiveWorkspace();
  if (!workspace) return { ok: false, error: "Choose a workspace first." };

  const [template, mailbox] = await Promise.all([
    getTemplate(templateId, workspace.connection.id, workspace.domain.id),
    getMailbox(mailboxId),
  ]);
  if (!template) return { ok: false, error: "Template not found." };
  if (!mailbox || !(await isMailboxInActiveWorkspace(mailbox))) {
    return { ok: false, error: "Choose a mailbox first." };
  }

  const recipients = normalizeRecipientGroups({
    to: readFormValues(formData, "to"),
    cc: readFormValues(formData, "cc"),
    bcc: readFormValues(formData, "bcc"),
  });
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

  const subject = readFormValue(formData, "subject")
    .trim()
    .slice(0, MAX_SUBJECT_LENGTH);
  if (!subject) return { ok: false, error: "Subject is required." };

  if (files.length > MAX_ATTACHMENT_COUNT) {
    return {
      ok: false,
      error: `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`,
    };
  }
  const totalAttachmentBytes = files.reduce(
    (total, file) => total + file.size,
    0,
  );
  if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return { ok: false, error: "Attachments can be up to 29 MB total." };
  }

  let resendAttachments;
  try {
    resendAttachments = files.length
      ? await Promise.all(
          files.map(async (file) => ({
            content: Buffer.from(await file.arrayBuffer()),
            filename: safeFilename(file.name),
            contentType: file.type || undefined,
          })),
        )
      : undefined;
  } catch (error) {
    console.error("Unable to prepare template email attachments.", error);
    return {
      ok: false,
      error: "Unable to prepare the selected attachments.",
    };
  }

  const resend = await getResendClient(mailbox.connectionId);
  const { data, error } = await resend.emails.send({
    from: formatMailbox(mailbox),
    to: recipients.to,
    cc: recipients.cc.length ? recipients.cc : undefined,
    bcc: recipients.bcc.length ? recipients.bcc : undefined,
    subject,
    text: template.text,
    html: template.html,
    attachments: resendAttachments,
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
      attachments: files.map(
        (file) =>
          ({
            id: null,
            filename: safeFilename(file.name),
            size: file.size,
            contentType: file.type || "application/octet-stream",
            disposition: "attachment",
            contentId: null,
          }) satisfies EmailAttachment,
      ),
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

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readFormValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

function safeFilename(filename: string) {
  return (
    filename
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/[\r\n]/g, "")
      .trim() || "attachment"
  );
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
