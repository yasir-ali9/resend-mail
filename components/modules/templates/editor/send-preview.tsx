"use client";

import { type FormEvent, type PointerEventHandler } from "react";

import { RecipientField } from "@/components/modules/mail/mail-panel/compose/recipient";
import type { Mailbox } from "@/lib/mailbox/types";
import { formatMailbox } from "@/lib/mailbox/types";

import { PreviewResizeHandle } from "./resize-handle";
import type { TemplateSendController } from "./use-template-send";

export function SendPreview({
  controller,
  html,
  mailboxes,
  name,
  onSubjectChange,
  previewResizing,
  previewWidth,
  resizeHandlers,
  subject,
}: {
  controller: TemplateSendController;
  html: string;
  mailboxes: Mailbox[];
  name: string;
  onSubjectChange: (subject: string) => void;
  previewResizing: boolean;
  previewWidth: number;
  resizeHandlers: {
    onPointerCancel: PointerEventHandler<HTMLButtonElement>;
    onPointerDown: PointerEventHandler<HTMLButtonElement>;
    onPointerMove: PointerEventHandler<HTMLButtonElement>;
    onPointerUp: PointerEventHandler<HTMLButtonElement>;
  };
  subject: string;
}) {
  const mailbox =
    mailboxes.find((candidate) => candidate.id === controller.mailboxId) ??
    mailboxes[0];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void controller.send(subject);
  }

  return (
    <form
      id="template-send-form"
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div
        data-preview-canvas
        className="min-h-0 flex-1 overflow-y-auto bg-bk-80 px-3 sm:px-6"
      >
        <div
          style={{ width: previewWidth }}
          className="mx-auto max-w-full overflow-hidden bg-bk-90 shadow-sm"
        >
          <div className="flex min-h-10 items-center gap-3 border-b border-bd-40 px-4 py-1.5">
            <span className="w-12 shrink-0 text-[11px] text-fg-70">From</span>
            {mailbox ? (
              <span className="min-w-0 flex-1 truncate text-[12px] text-fg-40">
                {formatMailbox(mailbox)}
              </span>
            ) : (
              <span className="text-[12px] text-fg-70">
                Add a mailbox before sending
              </span>
            )}
          </div>

          <RecipientField
            id="template-send-to"
            name="to"
            label="To"
            values={controller.recipients.to}
            onChange={(values) => controller.changeRecipients("to", values)}
            onInvalid={controller.invalid}
            autoFocus
          >
            {!controller.showCc ? (
              <RecipientToggle onClick={() => controller.showRecipient("cc")}>
                Cc
              </RecipientToggle>
            ) : null}
            {!controller.showBcc ? (
              <RecipientToggle onClick={() => controller.showRecipient("bcc")}>
                Bcc
              </RecipientToggle>
            ) : null}
          </RecipientField>

          {controller.showCc ? (
            <RecipientField
              id="template-send-cc"
              name="cc"
              label="Cc"
              values={controller.recipients.cc}
              onChange={(values) => controller.changeRecipients("cc", values)}
              onDismissEmpty={() => controller.hideRecipient("cc")}
              onInvalid={controller.invalid}
            />
          ) : null}
          {controller.showBcc ? (
            <RecipientField
              id="template-send-bcc"
              name="bcc"
              label="Bcc"
              values={controller.recipients.bcc}
              onChange={(values) => controller.changeRecipients("bcc", values)}
              onDismissEmpty={() => controller.hideRecipient("bcc")}
              onInvalid={controller.invalid}
            />
          ) : null}

          <label className="flex min-h-10 items-center gap-3 px-4 py-1.5">
            <span className="w-12 shrink-0 text-[11px] text-fg-70">
              Subject
            </span>
            <input
              type="text"
              required
              maxLength={998}
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              placeholder="Subject"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-fg-40 outline-none placeholder:text-fg-70"
            />
          </label>
          {controller.error ? (
            <p
              role="alert"
              className="border-t border-bd-40 px-4 py-2 text-[11px] text-[#c70036]"
            >
              {controller.error}
            </p>
          ) : null}
        </div>

        <div
          style={{ width: previewWidth }}
          className="relative mx-auto max-w-full overflow-visible bg-white shadow-sm"
        >
          <PreviewResizeHandle
            width={previewWidth}
            resizing={previewResizing}
            {...resizeHandlers}
          />
          <div className="overflow-hidden">
            <iframe
              title={`Preview of ${name}`}
              srcDoc={html}
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              scrolling="no"
              onLoad={(event) => preparePreview(event.currentTarget)}
              className="block min-h-[480px] w-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    </form>
  );
}

function RecipientToggle({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-sm text-[11px] text-fg-70 transition-colors hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
    >
      {children}
    </button>
  );
}

function preparePreview(iframe: HTMLIFrameElement) {
  const document = iframe.contentDocument;
  if (!document?.body) return;

  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  const measure = () => {
    iframe.style.height = "1px";
    iframe.style.height = `${Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      480,
    )}px`;
  };
  measure();
  document.querySelectorAll("img").forEach((image) => {
    if (!image.complete)
      image.addEventListener("load", measure, { once: true });
  });
  const observer = new ResizeObserver(measure);
  observer.observe(document.body);
  void document.fonts?.ready.then(measure);
}
