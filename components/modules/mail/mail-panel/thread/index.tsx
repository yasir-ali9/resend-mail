"use client";

import {
  ChevronDown,
  Forward as ForwardIcon,
  LayoutTemplate,
  Paperclip,
  Reply as ReplyIcon,
  ReplyAll as ReplyAllIcon,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/reusables/button";
import type { MailboxEmail } from "@/lib/email/types";
import { cn } from "@/lib/utils";

import { EmailAttachments } from "../attachment";
import { formatAddress, senderName } from "../format";
import { EmailContent } from "./content";
import { Delivery } from "./delivery";

export type ReplyMode = "reply" | "reply-all";

function formatRelativeTime(value: string) {
  const delta = new Date(value).getTime() - Date.now();
  const absoluteDelta = Math.abs(delta);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  let divisor = minute;
  let unit: Intl.RelativeTimeFormatUnit = "minute";

  if (absoluteDelta >= year) {
    divisor = year;
    unit = "year";
  } else if (absoluteDelta >= month) {
    divisor = month;
    unit = "month";
  } else if (absoluteDelta >= day) {
    divisor = day;
    unit = "day";
  } else if (absoluteDelta >= hour) {
    divisor = hour;
    unit = "hour";
  }

  const magnitude = Math.floor(absoluteDelta / divisor);
  const amount = delta <= 0 ? -magnitude : magnitude;

  return new Intl.RelativeTimeFormat(undefined, {
    numeric: "always",
  }).format(amount, unit);
}

function RecipientDetails({
  className,
  email,
}: {
  className?: string;
  email: MailboxEmail;
}) {
  const [open, setOpen] = useState(false);
  const [mobilePopoverTop, setMobilePopoverTop] = useState(0);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const details = email.details;
  const rows = [
    { label: "From", value: formatAddress(email.from) },
    { label: "Reply-to", value: email.replyTo.join(", ") },
    { label: "To", value: email.to.join(", ") },
    { label: "Cc", value: email.cc.join(", ") },
    { label: "Bcc", value: email.bcc.join(", ") },
    {
      label: "Date",
      value: new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(email.createdAt)),
    },
    { label: "Subject", value: email.subject },
    { label: "Message ID", value: details?.messageId },
    { label: "Mailed-by", value: details?.mailedBy },
    { label: "Signed-by", value: details?.signedBy },
    { label: "Security", value: details?.security },
    {
      label: "Authentication",
      value: details?.authentication?.join(" · "),
    },
  ].filter(
    (row): row is { label: string; value: string } =>
      Boolean(row.value),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        detailsRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updateMobilePosition() {
      const summary = detailsRef.current?.querySelector("summary");
      if (summary) {
        setMobilePopoverTop(summary.getBoundingClientRect().bottom);
      }
    }

    updateMobilePosition();
    window.addEventListener("resize", updateMobilePosition);
    window.addEventListener("scroll", updateMobilePosition, true);

    return () => {
      window.removeEventListener("resize", updateMobilePosition);
      window.removeEventListener("scroll", updateMobilePosition, true);
    };
  }, [open]);

  return (
    <details
      ref={detailsRef}
      open={open}
      className={cn(
        "group relative block w-fit max-w-full text-[11px] text-fg-70",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <summary
        className="flex w-fit max-w-full cursor-pointer list-none items-center gap-1 rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ac-02"
        onClick={(event) => {
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        <span className="truncate">to {email.to.join(", ")}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-3 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <dl
        style={
          {
            "--recipient-details-top": `${mobilePopoverTop}px`,
          } as CSSProperties
        }
        className="fixed top-[var(--recipient-details-top)] right-2 left-2 z-20 mt-2 grid max-h-[min(70dvh,24rem)] w-auto max-w-none grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1 overflow-y-auto rounded-lg border border-bd-30 bg-bk-90 p-3 shadow-sm sm:absolute sm:top-full sm:right-auto sm:left-0 sm:w-max sm:max-w-[min(42rem,calc(100vw-2rem))] sm:grid-cols-[76px_minmax(0,1fr)] sm:overflow-visible"
      >
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-right text-fg-70">{row.label}</dt>
            <dd className="break-words text-fg-50">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

interface ThreadMessageProps {
  email: MailboxEmail;
  expandedInitially: boolean;
  loading: boolean;
  onForward: (email: MailboxEmail) => void;
  onCloneTemplate: (email: MailboxEmail) => void;
  onReply: (email: MailboxEmail, mode: ReplyMode) => void;
  showReplyAll: (email: MailboxEmail) => boolean;
}

export function ThreadMessage({
  email,
  expandedInitially,
  loading,
  onForward,
  onCloneTemplate,
  onReply,
  showReplyAll,
}: ThreadMessageProps) {
  const [expanded, setExpanded] = useState(expandedInitially);
  const toggleExpanded = () => setExpanded((current) => !current);
  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleExpanded();
    }
  };

  return (
    <article className="min-w-0 max-w-full overflow-visible rounded-lg">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggleExpanded}
        onKeyDown={handleHeaderKeyDown}
        className="group relative isolate grid min-w-0 w-full max-w-full cursor-default grid-cols-[1.75rem_minmax(0,1fr)_auto] items-start gap-x-1.5 gap-y-1 rounded-xl py-3 text-left before:pointer-events-none before:absolute before:inset-y-0 before:-right-1.5 before:-left-1.5 before:-z-10 before:rounded-xl before:bg-bk-80 before:opacity-0 before:transition-opacity hover:before:opacity-100 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ac-02 focus-visible:before:opacity-100 sm:flex sm:items-center sm:gap-3 sm:before:-right-3 sm:before:-left-3"
      >
        <span className="col-start-1 row-start-1 grid size-7 shrink-0 place-items-center rounded-full bg-bk-80 text-[10px] font-medium text-fg-50 sm:col-auto sm:row-auto sm:mt-0 sm:size-8 sm:text-[11px]">
          {senderName(email.from).charAt(0).toUpperCase() || "?"}
        </span>
        <div className="col-span-2 col-start-2 row-start-1 min-w-0 sm:col-auto sm:row-auto sm:flex-1">
          <div
            className={cn(
              "grid min-w-0 max-w-full grid-rows-2 gap-x-2 gap-y-0.5",
              expanded
                ? "grid-cols-1"
                : "grid-cols-1 sm:grid-cols-[minmax(140px,220px)_minmax(0,1fr)]",
            )}
          >
            <span
              className={cn(
                "col-start-1 row-start-1 block min-w-0 truncate text-[12px] font-medium leading-4 text-fg-40",
                expanded
                  ? "max-w-full"
                  : "max-w-[min(220px,40vw)]",
              )}
            >
              {formatAddress(email.from)}
            </span>
            <RecipientDetails
              email={email}
              className={cn(
                "col-start-1 row-start-2 min-w-0",
                expanded
                  ? "max-w-full"
                  : "max-w-[min(220px,40vw)]",
              )}
            />
            {!expanded && email.text ? (
              <span className="hidden min-w-0 whitespace-normal px-1 text-[11px] leading-4 text-fg-70 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:line-clamp-2 sm:px-3">
                {email.text}
              </span>
            ) : null}
          </div>
        </div>
        <span className="contents sm:flex sm:shrink-0 sm:flex-row sm:items-center sm:gap-1.5">
          <span className="col-start-2 row-start-2 flex w-full min-w-0 flex-row items-center gap-1.5 overflow-hidden justify-self-start text-[9px] leading-4 text-fg-70 sm:col-auto sm:row-auto sm:w-auto sm:shrink-0 sm:flex-col sm:items-end sm:gap-0.5 sm:overflow-visible sm:justify-self-auto">
            <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {(email.attachments?.length ?? 0) > 0 ? (
                <Paperclip
                  aria-label={`${email.attachments?.length} attachments`}
                  className="size-3 shrink-0 text-fg-70"
                />
              ) : null}
              <Delivery email={email} className="text-[9px]" />
              <time dateTime={email.createdAt} className="shrink-0">
                <span className="sm:hidden">
                  {new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(email.createdAt))}
                </span>
                <span className="hidden sm:inline">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                  }).format(new Date(email.createdAt))}
                </span>
              </time>
            </span>
            <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              <time dateTime={email.createdAt} className="shrink-0">
                {new Intl.DateTimeFormat(undefined, {
                  timeStyle: "short",
                }).format(new Date(email.createdAt))}
              </time>
              <span className="min-w-0 truncate" suppressHydrationWarning>
                ({formatRelativeTime(email.createdAt)})
              </span>
            </span>
          </span>
          <span
          className="hidden shrink-0 items-center gap-1.5 sm:flex"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {email.direction === "inbound" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onReply(email, "reply")}
                className="gap-1.5 border-bd-40 text-fg-50 group-hover:border-bd-50/80 hover:bg-bk-70 hover:text-fg-40"
              >
                <ReplyIcon aria-hidden="true" className="size-3.5" />
                Reply
              </Button>
              {showReplyAll(email) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReply(email, "reply-all")}
                  className="gap-1.5 border-bd-40 text-fg-50 group-hover:border-bd-50/80 hover:bg-bk-70 hover:text-fg-40"
                >
                  <ReplyAllIcon aria-hidden="true" className="size-3.5" />
                  Reply all
                </Button>
              ) : null}
            </>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onForward(email)}
            className="gap-1.5 border-bd-40 text-fg-50 group-hover:border-bd-50/80 hover:bg-bk-70 hover:text-fg-40"
          >
            <ForwardIcon aria-hidden="true" className="size-3.5" />
            {loading ? "Loading..." : "Forward"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCloneTemplate(email)}
            className="gap-1.5 border-bd-40 text-fg-50 group-hover:border-bd-50/80 hover:bg-bk-70 hover:text-fg-40"
          >
            <LayoutTemplate aria-hidden="true" className="size-3.5" />
            Clone as template
          </Button>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "col-start-3 row-span-2 row-start-1 size-3.5 shrink-0 self-center justify-self-end text-fg-70 transition-transform sm:col-auto sm:row-span-1 sm:row-auto sm:self-auto sm:justify-self-auto",
              expanded && "rotate-180",
            )}
          />
        </span>
      </div>

      {expanded ? (
        <div
          className="min-w-0 max-w-full overflow-hidden pb-5"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <EmailContent
            html={email.html}
            text={email.text}
            subject={email.subject}
          />
          <EmailAttachments
            attachments={email.attachments ?? []}
            emailId={email.id}
          />
          <div
            className="mt-3 flex flex-wrap items-center gap-1.5 sm:hidden"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {email.direction === "inbound" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReply(email, "reply")}
                  className="gap-1.5 border-bd-40 text-fg-50 group-hover:border-bd-50/80 hover:bg-bk-70 hover:text-fg-40"
                >
                  <ReplyIcon aria-hidden="true" className="size-3.5" />
                  Reply
                </Button>
                {showReplyAll(email) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onReply(email, "reply-all")}
                    className="gap-1.5 border-bd-40 text-fg-50 group-hover:border-bd-50/80 hover:bg-bk-70 hover:text-fg-40"
                  >
                    <ReplyAllIcon aria-hidden="true" className="size-3.5" />
                    Reply all
                  </Button>
                ) : null}
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onForward(email)}
              className="gap-1.5 border-bd-40 text-fg-50 group-hover:border-bd-50/80 hover:bg-bk-70 hover:text-fg-40"
            >
              <ForwardIcon aria-hidden="true" className="size-3.5" />
              {loading ? "Loading..." : "Forward"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onCloneTemplate(email)}
              className="gap-1.5 border-bd-40 text-fg-50 group-hover:border-bd-50/80 hover:bg-bk-70 hover:text-fg-40"
            >
              <LayoutTemplate aria-hidden="true" className="size-3.5" />
              Clone as template
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
