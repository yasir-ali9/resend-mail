import {
  Ban,
  Check,
  CheckCheck,
  CircleAlert,
  Clock3,
  ClockAlert,
  ShieldAlert,
} from "lucide-react";

import { Tooltip } from "@/components/reusables/tooltip";
import type {
  EmailDeliveryStatus,
  MailboxEmail,
} from "@/lib/email/types";
import { cn } from "@/lib/utils";

const statusDetails: Record<
  EmailDeliveryStatus,
  {
    icon: typeof Check;
    label: string;
    tone?: string;
  }
> = {
  queued: { icon: Clock3, label: "Queued" },
  sent: { icon: Check, label: "Sent" },
  delivered: { icon: CheckCheck, label: "Delivered" },
  delayed: {
    icon: ClockAlert,
    label: "Delivery delayed",
    tone: "text-[#a15c00]",
  },
  bounced: {
    icon: CircleAlert,
    label: "Bounced",
    tone: "text-[#c70036]",
  },
  failed: {
    icon: CircleAlert,
    label: "Failed",
    tone: "text-[#c70036]",
  },
  complained: {
    icon: ShieldAlert,
    label: "Reported as spam",
    tone: "text-[#c70036]",
  },
  suppressed: {
    icon: Ban,
    label: "Suppressed",
    tone: "text-[#c70036]",
  },
};

interface DeliveryProps {
  className?: string;
  email: MailboxEmail;
  mode?: "icon" | "label";
}

export function Delivery({
  className,
  email,
  mode = "label",
}: DeliveryProps) {
  if (email.direction !== "outbound" || !email.deliveryStatus) {
    return null;
  }

  const details = statusDetails[email.deliveryStatus];
  const Icon = details.icon;
  const updatedAt = email.deliveryUpdatedAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(email.deliveryUpdatedAt))
    : "";
  const tooltip = [
    details.label,
    updatedAt ? `Updated ${updatedAt}` : "",
    email.deliveryError || "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Tooltip content={tooltip} position="top">
      <span
        aria-label={details.label}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 text-[10px] text-fg-70",
          details.tone,
          className,
        )}
      >
        <Icon aria-hidden="true" className="size-3" />
        {mode === "label" ? <span>{details.label}</span> : null}
      </span>
    </Tooltip>
  );
}
