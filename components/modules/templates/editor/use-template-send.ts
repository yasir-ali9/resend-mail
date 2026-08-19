"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  MAX_ATTACHMENT_COUNT,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from "@/lib/email/types";
import type { Mailbox } from "@/lib/mailbox/types";

import { sendTemplateEmailAction } from "../actions";

export type RecipientKind = "to" | "cc" | "bcc";

export function useTemplateSend({
  mailboxes,
  templateId,
}: {
  mailboxes: Mailbox[];
  templateId: string;
}) {
  const mailboxId =
    mailboxes.find((mailbox) => mailbox.isDefault)?.id ??
    mailboxes[0]?.id ??
    "";
  const [recipients, setRecipients] = useState<Record<RecipientKind, string[]>>(
    {
      to: [],
      cc: [],
      bcc: [],
    },
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const attachmentInput = useRef<HTMLInputElement>(null);

  const changeRecipients = useCallback(
    (kind: RecipientKind, values: string[]) => {
      setRecipients((current) => ({ ...current, [kind]: values }));
      setError("");
    },
    [],
  );

  const selectAttachments = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      event.target.value = "";

      if (selectedFiles.length === 0) return;

      setAttachments((current) => {
        const fileKeys = new Set(
          current.map(
            (file) => `${file.name}:${file.size}:${file.lastModified}`,
          ),
        );
        const nextAttachments = [...current];
        let totalBytes = current.reduce((total, file) => total + file.size, 0);
        let exceededCount = false;
        let exceededSize = false;

        for (const file of selectedFiles) {
          const key = `${file.name}:${file.size}:${file.lastModified}`;
          if (fileKeys.has(key)) continue;

          if (nextAttachments.length >= MAX_ATTACHMENT_COUNT) {
            exceededCount = true;
            break;
          }

          if (totalBytes + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
            exceededSize = true;
            continue;
          }

          fileKeys.add(key);
          totalBytes += file.size;
          nextAttachments.push(file);
        }

        setError(
          exceededCount
            ? `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`
            : exceededSize
              ? "Attachments can be up to 29 MB total."
              : "",
        );
        return nextAttachments;
      });
    },
    [],
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((current) =>
      current.filter((_, attachmentIndex) => attachmentIndex !== index),
    );
    setError("");
  }, []);

  const send = useCallback(
    async (subject: string) => {
      if (sending) return;
      setError("");
      setSending(true);
      try {
        const formData = new FormData();
        formData.set("templateId", templateId);
        formData.set("mailboxId", mailboxId);
        recipients.to.forEach((address) => formData.append("to", address));
        recipients.cc.forEach((address) => formData.append("cc", address));
        recipients.bcc.forEach((address) => formData.append("bcc", address));
        formData.set("subject", subject);
        attachments.forEach((file) => {
          formData.append("attachments", file, file.name);
        });

        const result = await sendTemplateEmailAction(formData);
        if (result.ok) {
          window.location.assign("/sent");
          return;
        }
        setError(result.error || "Unable to send email.");
      } catch {
        setError("Unable to send email. Try again.");
      } finally {
        setSending(false);
      }
    },
    [attachments, mailboxId, recipients, sending, templateId],
  );

  return {
    mailboxId,
    recipients,
    attachments,
    attachmentInput,
    selectAttachments,
    removeAttachment,
    showCc,
    showBcc,
    sending,
    error,
    changeRecipients,
    hideRecipient: (kind: "cc" | "bcc") => {
      if (recipients[kind].length) return;
      if (kind === "cc") setShowCc(false);
      else setShowBcc(false);
    },
    showRecipient: (kind: "cc" | "bcc") => {
      if (kind === "cc") setShowCc(true);
      else setShowBcc(true);
    },
    invalid: setError,
    send,
  };
}

export type TemplateSendController = ReturnType<typeof useTemplateSend>;
