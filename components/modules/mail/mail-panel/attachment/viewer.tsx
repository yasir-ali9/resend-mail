"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Download,
  LoaderCircle,
  Minus,
  RotateCcw,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Tooltip } from "@/components/reusables/tooltip";
import type { EmailAttachment } from "@/lib/email/types";

import {
  AttachmentIcon,
  attachmentUrl,
  fileExtension,
  formatFileSize,
  rasterPreviewTypes,
  textPreviewTypes,
} from "./file";

interface AttachmentViewerProps {
  attachments: EmailAttachment[];
  emailId: string;
  initialIndex: number;
  onClose: () => void;
}

const viewerControlClass =
  "grid size-8 shrink-0 cursor-pointer place-items-center rounded-md border border-white/10 bg-black/30 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-1 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-30";

export function AttachmentViewer({
  attachments,
  emailId,
  initialIndex,
  onClose,
}: AttachmentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), attachments.length - 1),
  );
  const [scale, setScale] = useState(1);
  const closeButton = useRef<HTMLButtonElement>(null);
  const attachment = attachments[currentIndex];

  const move = useCallback(
    (offset: number) => {
      setCurrentIndex((index) =>
        Math.min(
          Math.max(index + offset, 0),
          attachments.length - 1,
        ),
      );
      setScale(1);
    },
    [attachments.length],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        move(-1);
      } else if (event.key === "ArrowRight") {
        move(1);
      } else if (event.key === "+" || event.key === "=") {
        setScale((value) => Math.min(value + 0.25, 3));
      } else if (event.key === "-") {
        setScale((value) => Math.max(value - 0.25, 0.5));
      } else if (event.key === "0") {
        setScale(1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [move, onClose]);

  if (!attachment?.id) {
    return null;
  }

  const downloadUrl = attachmentUrl(
    emailId,
    attachment.id,
  );
  const previewUrl = attachmentUrl(
    emailId,
    attachment.id,
    true,
  );
  const image = rasterPreviewTypes.has(
    attachment.contentType.toLowerCase(),
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="attachment-viewer-title"
      className="fixed inset-0 z-[200] flex flex-col bg-black/90"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <header className="relative z-10 flex h-12 shrink-0 items-center gap-3 bg-black/40 px-3 text-white">
        <div className="min-w-0 flex-1">
          <h2
            id="attachment-viewer-title"
            className="truncate text-[12px] font-medium"
          >
            {attachment.filename}
          </h2>
          <p className="text-[9px] text-white/50">
            {formatFileSize(attachment.size)}
            {attachments.length > 1
              ? ` · ${currentIndex + 1} of ${attachments.length}`
              : null}
          </p>
        </div>

        {image ? (
          <div className="hidden items-center gap-1 sm:flex">
            <Tooltip content="Zoom out (-)" position="bottom">
              <button
                type="button"
                onClick={() =>
                  setScale((value) => Math.max(value - 0.25, 0.5))
                }
                disabled={scale <= 0.5}
                className={viewerControlClass}
                aria-label="Zoom out"
              >
                <Minus aria-hidden="true" className="size-3.5" />
              </button>
            </Tooltip>
            <span className="w-11 text-center text-[10px] text-white/60">
              {Math.round(scale * 100)}%
            </span>
            <Tooltip content="Zoom in (+)" position="bottom">
              <button
                type="button"
                onClick={() =>
                  setScale((value) => Math.min(value + 0.25, 3))
                }
                disabled={scale >= 3}
                className={viewerControlClass}
                aria-label="Zoom in"
              >
                <CirclePlus aria-hidden="true" className="size-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Reset zoom (0)" position="bottom">
              <button
                type="button"
                onClick={() => setScale(1)}
                disabled={scale === 1}
                className={viewerControlClass}
                aria-label="Reset zoom"
              >
                <RotateCcw
                  aria-hidden="true"
                  className="size-3.5"
                />
              </button>
            </Tooltip>
          </div>
        ) : null}

        <Tooltip content="Download" position="bottom">
          <a
            href={downloadUrl}
            download
            className={viewerControlClass}
            aria-label={`Download ${attachment.filename}`}
          >
            <Download aria-hidden="true" className="size-3.5" />
          </a>
        </Tooltip>
        <Tooltip content="Close (Esc)" position="bottom">
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            className={viewerControlClass}
            aria-label="Close attachment viewer"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </Tooltip>
      </header>

      <main className="relative min-h-0 flex-1">
        <AttachmentViewerContent
          key={attachment.id}
          attachment={attachment}
          downloadUrl={downloadUrl}
          previewUrl={previewUrl}
          scale={scale}
        />

        {attachments.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={currentIndex === 0}
              className="absolute top-1/2 left-3 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/40 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-1 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-20"
              aria-label="Previous attachment"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={currentIndex === attachments.length - 1}
              className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/10 bg-black/40 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-1 focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-20"
              aria-label="Next attachment"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </>
        ) : null}
      </main>
    </div>,
    document.body,
  );
}

function AttachmentViewerContent({
  attachment,
  downloadUrl,
  previewUrl,
  scale,
}: {
  attachment: EmailAttachment;
  downloadUrl: string;
  previewUrl: string;
  scale: number;
}) {
  const contentType = attachment.contentType.toLowerCase();

  if (rasterPreviewTypes.has(contentType)) {
    return (
      <div className="flex h-full w-full overflow-auto p-12">
        <img
          src={previewUrl}
          alt={attachment.filename}
          draggable={false}
          className="m-auto max-h-full max-w-full rounded-md object-contain shadow-2xl transition-transform duration-150"
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    );
  }

  if (contentType === "application/pdf") {
    return (
      <iframe
        src={`${previewUrl}#toolbar=1&navpanes=0&view=FitH`}
        title={attachment.filename}
        className="h-full w-full border-0 bg-white"
      />
    );
  }

  if (contentType.startsWith("video/")) {
    return (
      <div className="grid h-full place-items-center p-12">
        <video
          src={previewUrl}
          controls
          className="max-h-full max-w-full rounded-lg"
        >
          Your browser cannot preview this video.
        </video>
      </div>
    );
  }

  if (contentType.startsWith("audio/")) {
    return (
      <div className="grid h-full place-items-center p-8">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/30 p-6">
          <AttachmentIdentity attachment={attachment} />
          <audio
            src={previewUrl}
            controls
            className="mt-5 w-full"
          >
            Your browser cannot preview this audio file.
          </audio>
        </div>
      </div>
    );
  }

  if (
    textPreviewTypes.has(contentType) &&
    attachment.size <= 2 * 1024 * 1024
  ) {
    return (
      <TextAttachmentViewer
        attachment={attachment}
        previewUrl={previewUrl}
      />
    );
  }

  return (
    <UnsupportedAttachmentViewer
      attachment={attachment}
      downloadUrl={downloadUrl}
    />
  );
}

function TextAttachmentViewer({
  attachment,
  previewUrl,
}: {
  attachment: EmailAttachment;
  previewUrl: string;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetch(previewUrl, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load this file.");
        }

        const nextContent = await response.text();
        if (!cancelled) setContent(nextContent);
      })
      .catch((fetchError: unknown) => {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load this file.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <LoaderCircle
          aria-label="Loading attachment"
          className="size-5 animate-spin text-white/60"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid h-full place-items-center text-[12px] text-white/60">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-8">
      <pre className="mx-auto min-h-full max-w-5xl overflow-x-auto rounded-lg bg-white p-6 text-[12px] leading-5 whitespace-pre-wrap text-black">
        {content || `${attachment.filename} is empty.`}
      </pre>
    </div>
  );
}

function UnsupportedAttachmentViewer({
  attachment,
  downloadUrl,
}: {
  attachment: EmailAttachment;
  downloadUrl: string;
}) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="w-full max-w-sm rounded-xl border border-white/5 bg-white/10 p-7 text-center">
        <div className="flex justify-center">
          <AttachmentIcon
            contentType={attachment.contentType}
            filename={attachment.filename}
            size="lg"
            tone="inverse"
          />
        </div>
        <p className="mt-4 truncate text-[13px] font-medium text-white">
          {attachment.filename}
        </p>
        <p className="mt-1 text-[10px] text-white/50">
          {fileExtension(attachment.filename)} ·{" "}
          {formatFileSize(attachment.size)}
        </p>
        <p className="mt-5 text-[11px] leading-5 text-white/60">
          This format cannot be rendered safely by the browser. Download
          it to open it in its native application.
        </p>
        <a
          href={downloadUrl}
          download
          className="mt-5 inline-flex h-8 items-center gap-2 rounded-md border border-white/5 bg-white/15 px-3 text-[11px] text-white transition-colors hover:bg-white/20 focus-visible:ring-1 focus-visible:ring-white/60"
        >
          <Download aria-hidden="true" className="size-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}

function AttachmentIdentity({
  attachment,
}: {
  attachment: EmailAttachment;
}) {
  return (
    <div className="flex items-center gap-3">
      <AttachmentIcon
        contentType={attachment.contentType}
        filename={attachment.filename}
        size="lg"
        tone="inverse"
      />
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-white">
          {attachment.filename}
        </span>
        <span className="block text-[10px] text-white/50">
          {formatFileSize(attachment.size)}
        </span>
      </span>
    </div>
  );
}
