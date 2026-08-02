import type {
  EmailBouncedEvent,
  EmailFailedEvent,
  EmailReceivedEvent,
  EmailSuppressedEvent,
  WebhookEventPayload,
} from "resend";

import { getEmailDeliveryStatus } from "@/lib/email/delivery";
import { updateEmailDeliveryStatus } from "@/lib/email/repository";
import {
  syncReceivedEmail,
  syncSentEmail,
} from "@/lib/email/sync";
import { resend } from "@/lib/server/resend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return Response.json(
      { error: "Webhook signing secret is not configured." },
      { status: 503 },
    );
  }

  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return Response.json(
      { error: "Missing webhook signature headers." },
      { status: 400 },
    );
  }

  let event: WebhookEventPayload;

  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch (error) {
    console.error("Invalid Resend webhook signature.", error);

    return Response.json(
      { error: "Invalid webhook request." },
      { status: 400 },
    );
  }

  try {
    if (event.type === "email.received") {
      await syncReceivedEmail((event as EmailReceivedEvent).data.email_id);
    } else {
      const deliveryStatus = getEmailDeliveryStatus(event.type);
      const emailId =
        "email_id" in event.data ? event.data.email_id : undefined;

      if (deliveryStatus && emailId) {
        const deliveryError = getDeliveryError(event);
        const updateResult = await updateEmailDeliveryStatus(
          emailId,
          deliveryStatus,
          event.created_at,
          deliveryError,
        );

        if (updateResult === "missing") {
          await syncSentEmail(emailId);
          await updateEmailDeliveryStatus(
            emailId,
            deliveryStatus,
            event.created_at,
            deliveryError,
          );
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to process verified Resend webhook.", error);

    return Response.json(
      { error: "Unable to process webhook." },
      { status: 500 },
    );
  }
}

function getDeliveryError(event: WebhookEventPayload) {
  switch (event.type) {
    case "email.bounced":
      return (event as EmailBouncedEvent).data.bounce.message;
    case "email.failed":
      return (event as EmailFailedEvent).data.failed.reason;
    case "email.suppressed":
      return (event as EmailSuppressedEvent).data.suppressed.message;
    case "email.complained":
      return "The recipient reported this email as spam.";
    default:
      return null;
  }
}
