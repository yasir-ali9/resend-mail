"use client";

import { useCallback, useState } from "react";

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
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const changeRecipients = useCallback(
    (kind: RecipientKind, values: string[]) => {
      setRecipients((current) => ({ ...current, [kind]: values }));
      setError("");
    },
    [],
  );

  const send = useCallback(
    async (subject: string) => {
      if (sending) return;
      setError("");
      setSending(true);
      try {
        const result = await sendTemplateEmailAction({
          templateId,
          mailboxId,
          to: recipients.to,
          cc: recipients.cc,
          bcc: recipients.bcc,
          subject,
        });
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
    [mailboxId, recipients, sending, templateId],
  );

  return {
    mailboxId,
    recipients,
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
