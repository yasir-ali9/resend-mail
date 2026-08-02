import type { EmailDeliveryStatus } from "@/lib/email/types";

export function getEmailDeliveryStatus(
  event: string,
): EmailDeliveryStatus | undefined {
  switch (event.replace(/^email\./, "")) {
    case "queued":
    case "scheduled":
      return "queued";
    case "sent":
      return "sent";
    case "delivered":
    case "opened":
    case "clicked":
      return "delivered";
    case "delivery_delayed":
      return "delayed";
    case "bounced":
      return "bounced";
    case "failed":
    case "canceled":
      return "failed";
    case "complained":
      return "complained";
    case "suppressed":
      return "suppressed";
    default:
      return undefined;
  }
}
