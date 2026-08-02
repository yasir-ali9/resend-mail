"use client";

import {
  LoaderCircle,
  Maximize2,
  PanelRight,
  Paperclip,
  PictureInPicture2,
  Send,
  X,
} from "lucide-react";
import type {
  ChangeEventHandler,
  FormEventHandler,
  RefObject,
} from "react";

import { Button } from "@/components/reusables/button";
import { ResizablePanel } from "@/components/reusables/resizable";
import { Tooltip } from "@/components/reusables/tooltip";
import type { EmailAttachment } from "@/lib/email/types";
import { cn } from "@/lib/utils";

import { ComposeAttachments } from "../attachment";
import { Editor } from "./editor";
import type { EditorValue } from "./format";
import { RecipientField } from "./recipient";

export type ComposeMode = "floating" | "full" | "drawer";
export type DraftSaveStatus = "idle" | "saving" | "saved" | "error";
export type RecipientGroup = "to" | "cc" | "bcc";

export interface ComposeValue {
  attachments: File[];
  bcc: string[];
  body: string;
  bodyHtml: string;
  cc: string[];
  forwardedAttachments: EmailAttachment[];
  isForwarding: boolean;
  showBcc: boolean;
  showCc: boolean;
  subject: string;
  to: string[];
}

export interface ComposeStatus {
  canSend: boolean;
  draft: DraftSaveStatus;
  message: string;
  sending: boolean;
}

export interface ComposeActions {
  changeBody: (value: EditorValue) => void;
  changeMode: (mode: ComposeMode) => void;
  changeRecipients: (group: RecipientGroup, values: string[]) => void;
  changeSubject: (value: string) => void;
  discard: () => void;
  dismiss: () => void | Promise<void>;
  invalid: (message: string) => void;
  removeAttachment: (index: number) => void;
  removeForwardedAttachment: (index: number) => void;
  selectAttachments: ChangeEventHandler<HTMLInputElement>;
  showRecipient: (group: "cc" | "bcc") => void;
  submit: FormEventHandler<HTMLFormElement>;
}

interface ComposeProps {
  actions: ComposeActions;
  attachmentInput: RefObject<HTMLInputElement | null>;
  mailbox: string;
  mode: ComposeMode;
  status: ComposeStatus;
  value: ComposeValue;
}

interface ModeButtonProps {
  active: boolean;
  icon: typeof PictureInPicture2;
  label: string;
  onClick: () => void;
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: ModeButtonProps) {
  return (
    <Tooltip content={label} position="bottom">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "grid size-7 cursor-pointer place-items-center rounded-md text-fg-70 transition-colors hover:bg-bk-70 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02",
          active && "bg-bk-70 text-fg-30",
        )}
      >
        <Icon aria-hidden="true" className="size-3.5" />
      </button>
    </Tooltip>
  );
}

function Surface({
  actions,
  attachmentInput,
  mailbox,
  mode,
  status,
  value,
}: ComposeProps) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-bk-90">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-bd-30 bg-bk-80 px-3">
        <h1 className="truncate text-[12px] font-medium text-fg-30">
          {value.isForwarding ? "Forward message" : "New message"}
        </h1>
        {status.draft !== "idle" ? (
          <span
            role="status"
            className={cn(
              "truncate text-[10px] text-fg-70",
              status.draft === "error" && "text-[#c70036]",
            )}
          >
            {status.draft === "saving"
              ? "Saving…"
              : status.draft === "saved"
                ? value.attachments.length
                  ? "Draft saved · attachments stay in this tab"
                  : "Saved"
                : "Draft not saved"}
          </span>
        ) : null}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <div className="hidden items-center gap-0.5 md:flex">
          <ModeButton
            active={mode === "floating"}
            icon={PictureInPicture2}
            label="Floating compose"
            onClick={() => actions.changeMode("floating")}
          />
          <ModeButton
            active={mode === "full"}
            icon={Maximize2}
            label="Full-screen compose"
            onClick={() => actions.changeMode("full")}
          />
          <ModeButton
            active={mode === "drawer"}
            icon={PanelRight}
            label="Right drawer"
            onClick={() => actions.changeMode("drawer")}
          />
          </div>
          <Tooltip content="Close compose" position="bottom">
            <button
              type="button"
              aria-label="Close compose"
              onClick={() => void actions.dismiss()}
              className="grid size-7 cursor-pointer place-items-center rounded-md text-fg-70 transition-colors hover:bg-bk-70 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </Tooltip>
        </div>
      </header>

      <form
        onSubmit={actions.submit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-bd-40 px-4 py-2 text-[11px] text-fg-70">
            <span className="w-12 shrink-0">From</span>
            <span className="min-w-0 truncate text-fg-50">
              {mailbox || "Add a mailbox in the sidebar"}
            </span>
          </div>

          <RecipientField
            id="compose-to"
            name="to"
            label="To"
            values={value.to}
            onChange={(values) => actions.changeRecipients("to", values)}
            onInvalid={actions.invalid}
            autoFocus
          >
            {!value.showCc ? (
              <button
                type="button"
                onClick={() => actions.showRecipient("cc")}
                className="cursor-pointer rounded-sm text-[11px] text-fg-70 transition-colors hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                Cc
              </button>
            ) : null}
            {!value.showBcc ? (
              <button
                type="button"
                onClick={() => actions.showRecipient("bcc")}
                className="cursor-pointer rounded-sm text-[11px] text-fg-70 transition-colors hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02"
              >
                Bcc
              </button>
            ) : null}
          </RecipientField>

          {value.showCc ? (
            <RecipientField
              id="compose-cc"
              name="cc"
              label="Cc"
              values={value.cc}
              onChange={(values) => actions.changeRecipients("cc", values)}
              onInvalid={actions.invalid}
            />
          ) : null}

          {value.showBcc ? (
            <RecipientField
              id="compose-bcc"
              name="bcc"
              label="Bcc"
              values={value.bcc}
              onChange={(values) => actions.changeRecipients("bcc", values)}
              onInvalid={actions.invalid}
            />
          ) : null}

          <label className="flex items-center gap-3 border-b border-bd-40 px-4 py-2">
            <span className="w-12 shrink-0 text-[11px] text-fg-70">
              Subject
            </span>
            <input
              type="text"
              required
              value={value.subject}
              onChange={(event) =>
                actions.changeSubject(event.target.value)
              }
              placeholder="Subject"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-fg-40 outline-none placeholder:text-fg-70"
            />
          </label>

          <Editor
            value={{ html: value.bodyHtml, text: value.body }}
            onChange={actions.changeBody}
          />

          <ComposeAttachments
            files={value.attachments}
            forwardedAttachments={value.forwardedAttachments}
            onRemove={actions.removeAttachment}
            onRemoveForwarded={actions.removeForwardedAttachment}
          />
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-bd-30 bg-bk-80 px-4 py-2.5">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={status.sending || !status.canSend}
            className="gap-2"
          >
            {status.sending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 animate-spin"
              />
            ) : (
              <Send aria-hidden="true" className="size-3.5" />
            )}
            {status.sending ? "Sending..." : "Send"}
          </Button>
          <input
            ref={attachmentInput}
            type="file"
            multiple
            className="sr-only"
            onChange={actions.selectAttachments}
            disabled={status.sending}
          />
          <Tooltip
            content="Attach files"
            position="top"
            disabled={status.sending}
          >
            <button
              type="button"
              disabled={status.sending}
              onClick={() => attachmentInput.current?.click()}
              className="grid size-7 cursor-pointer place-items-center rounded-md text-fg-60 transition-colors hover:bg-bk-70 hover:text-fg-30 focus-visible:ring-1 focus-visible:ring-ac-02 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Attach files"
            >
              <Paperclip aria-hidden="true" className="size-3.5" />
            </button>
          </Tooltip>
          {status.message ? (
            <span
              role="status"
              className="ml-auto text-[10px] text-fg-70"
            >
              {status.message}
            </span>
          ) : null}
        </footer>
      </form>
    </section>
  );
}

export function Compose(props: ComposeProps) {
  if (props.mode === "drawer") {
    return (
      <ResizablePanel
        defaultWidth={520}
        minWidth={280}
        maxWidth={720}
        position="right"
        className="h-full border-l border-bd-30 bg-bk-90"
      >
        <Surface {...props} />
      </ResizablePanel>
    );
  }

  if (props.mode === "full") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compose email"
        className="fixed inset-0 z-50 bg-bk-90"
      >
        <Surface {...props} />
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Compose email"
      className="fixed right-3 bottom-0 z-40 h-[min(560px,calc(100dvh-16px))] w-[min(560px,calc(100vw-24px))] overflow-hidden rounded-t-lg border border-bd-30 bg-bk-90 shadow-xl"
    >
      <Surface {...props} />
    </div>
  );
}
