"use client";

import {
  Download,
  LoaderCircle,
  Paperclip,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import type { EmailAttachment } from "@/lib/email/types";

import {
  AttachmentIcon,
  attachmentUrl,
  fileExtension,
  formatFileSize,
  rasterPreviewTypes,
} from "./file";

const AttachmentViewer = dynamic(
  () =>
    import("./viewer").then(
      (module) => module.AttachmentViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[200] grid place-items-center bg-black/90">
        <LoaderCircle
          aria-label="Opening attachment viewer"
          className="size-5 animate-spin text-white/60"
        />
      </div>
    ),
  },
);

interface ComposeAttachmentsProps {
  files: File[];
  forwardedAttachments?: EmailAttachment[];
  onRemove: (index: number) => void;
  onRemoveForwarded?: (index: number) => void;
}

export function ComposeAttachments({
  files,
  forwardedAttachments = [],
  onRemove,
  onRemoveForwarded,
}: ComposeAttachmentsProps) {
  if (files.length === 0 && forwardedAttachments.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label="Selected attachments"
      className="grid gap-2 border-t border-bd-30 px-4 py-3 sm:grid-cols-2"
    >
      {forwardedAttachments.map((attachment, index) => (
        <ComposeAttachmentItem
          key={
            attachment.id ??
            `${attachment.filename}-${attachment.size}-${index}`
          }
          contentType={attachment.contentType}
          filename={attachment.filename}
          size={attachment.size}
          detail="Forwarded"
          onRemove={() => onRemoveForwarded?.(index)}
        />
      ))}
      {files.map((file, index) => (
        <ComposeAttachmentItem
          key={`${file.name}-${file.size}-${file.lastModified}`}
          contentType={file.type}
          filename={file.name}
          size={file.size}
          onRemove={() => onRemove(index)}
        />
      ))}
    </ul>
  );
}

function ComposeAttachmentItem({
  contentType,
  filename,
  size,
  detail,
  onRemove,
}: {
  contentType: string;
  filename: string;
  size: number;
  detail?: string;
  onRemove: () => void;
}) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-md border border-bd-30 bg-bk-80 px-2.5 py-2">
      <AttachmentIcon contentType={contentType} filename={filename} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] text-fg-40">
          {filename}
        </span>
        <span className="block text-[9px] text-fg-70">
          {formatFileSize(size)}
          {detail ? ` · ${detail}` : null}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="grid size-6 shrink-0 cursor-pointer place-items-center rounded text-fg-70 transition-colors hover:bg-bk-70 hover:text-fg-40 focus-visible:ring-1 focus-visible:ring-ac-02"
        aria-label={`Remove ${filename}`}
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </li>
  );
}

interface EmailAttachmentsProps {
  attachments: EmailAttachment[];
  emailId: string;
}

export function EmailAttachments({
  attachments,
  emailId,
}: EmailAttachmentsProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const viewableAttachments = attachments.filter(
    (attachment) => attachment.id,
  );

  if (attachments.length === 0) {
    return null;
  }

  return (
    <>
      <section
        className="border-t border-bd-30 py-5"
        aria-label="Attachments"
      >
        <h2 className="flex items-center gap-1.5 text-[11px] font-medium text-fg-40">
          <Paperclip aria-hidden="true" className="size-3.5" />
          {attachments.length}{" "}
          {attachments.length === 1 ? "attachment" : "attachments"}
        </h2>
        <ul className="mt-3 flex flex-wrap items-start justify-start gap-2">
          {attachments.map((attachment, index) => (
            <li
              key={attachment.id ?? `${attachment.filename}-${index}`}
              className="w-56 max-w-full overflow-hidden rounded-lg border border-bd-30 bg-bk-80"
            >
              <div className="relative">
                <AttachmentPreview
                  attachment={attachment}
                  emailId={emailId}
                />
                {attachment.id ? (
                  <button
                    type="button"
                    onClick={() =>
                      setViewerIndex(
                        viewableAttachments.indexOf(attachment),
                      )
                    }
                    className="absolute inset-0 cursor-pointer focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02"
                    aria-label={`View ${attachment.filename}`}
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 items-center gap-2 border-t border-bd-30 px-2.5 py-2">
                <AttachmentIcon
                  contentType={attachment.contentType}
                  filename={attachment.filename}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] text-fg-40">
                    {attachment.filename}
                  </span>
                  <span className="block text-[9px] text-fg-70">
                    {formatFileSize(attachment.size)}
                  </span>
                </span>
                {attachment.id ? (
                  <a
                    href={attachmentUrl(
                      emailId,
                      attachment.id,
                    )}
                    download
                    className="grid size-7 shrink-0 place-items-center rounded-md text-fg-70 transition-colors hover:bg-bk-70 hover:text-fg-40 focus-visible:ring-1 focus-visible:ring-ac-02"
                    aria-label={`Download ${attachment.filename}`}
                  >
                    <Download
                      aria-hidden="true"
                      className="size-3.5"
                    />
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {viewerIndex !== null ? (
        <AttachmentViewer
          attachments={viewableAttachments}
          emailId={emailId}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </>
  );
}

function AttachmentPreview({
  attachment,
  emailId,
}: {
  attachment: EmailAttachment;
  emailId: string;
}) {
  const previewUrl = attachment.id
    ? attachmentUrl(emailId, attachment.id, true)
    : undefined;
  const contentType = attachment.contentType.toLowerCase();

  if (previewUrl && rasterPreviewTypes.has(contentType)) {
    return (
      <div
        role="img"
        aria-label={`Preview of ${attachment.filename}`}
        className="h-24 bg-bk-70 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${previewUrl}")` }}
      />
    );
  }

  if (previewUrl && contentType === "application/pdf") {
    return (
      <div className="h-24 overflow-hidden bg-white">
        <object
          data={`${previewUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          aria-label={`First page of ${attachment.filename}`}
          tabIndex={-1}
          className="pointer-events-none h-[calc(100%+18px)] w-[calc(100%+18px)]"
        >
          <GenericAttachmentPreview attachment={attachment} />
        </object>
      </div>
    );
  }

  return <GenericAttachmentPreview attachment={attachment} />;
}

function GenericAttachmentPreview({
  attachment,
}: {
  attachment: EmailAttachment;
}) {
  return (
    <div className="flex h-24 flex-col items-center justify-center gap-1.5 bg-bk-70">
      <AttachmentIcon
        contentType={attachment.contentType}
        filename={attachment.filename}
        size="md"
      />
      <span className="rounded border border-bd-30 bg-bk-80 px-1.5 py-0.5 text-[8px] font-medium tracking-wide text-fg-60">
        {fileExtension(attachment.filename)}
      </span>
    </div>
  );
}
