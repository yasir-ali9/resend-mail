import {
  isDownloadableEmailAttachment,
  listResendEmailAttachments,
} from "@/lib/email/attachments";
import {
  getEmailThread,
  updateEmailAttachments,
} from "@/lib/email/repository";
import { getMailbox } from "@/lib/mailbox/repository";
import { isAuthenticated } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const mailboxId = readMailboxId(request);
    const configuredMailbox = mailboxId
      ? await getMailbox(mailboxId)
      : undefined;

    if (!configuredMailbox) {
      return Response.json(
        { error: "Mailbox not found." },
        { status: 404 },
      );
    }

    const messages = await getEmailThread(
      configuredMailbox.connectionId,
      id,
      configuredMailbox.email,
    );

    if (messages.length === 0) {
      return Response.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const refreshedMessages = await Promise.all(
      messages.map(async (message) => {
        try {
          const attachments = await listResendEmailAttachments(
            configuredMailbox.connectionId,
            message.id,
            message.direction,
          );

          if (
            attachments.length > 0 ||
            message.attachments?.length === 0
          ) {
            const downloadableAttachments = attachments.filter(
              isDownloadableEmailAttachment,
            );
            await updateEmailAttachments(message.id, attachments);

            return {
              ...message,
              attachments: downloadableAttachments,
            };
          }
        } catch (attachmentError) {
          console.error(
            `Unable to refresh attachments for ${message.id}.`,
            attachmentError,
          );
        }

        return message;
      }),
    );

    return Response.json(
      { messages: refreshedMessages },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Unable to load the conversation.", error);

    return Response.json(
      { error: "Unable to load this conversation." },
      { status: 500 },
    );
  }
}

function readMailboxId(request: Request) {
  const value = new URL(request.url).searchParams
    .get("mailbox")
    ?.trim();

  return value && /^[a-zA-Z0-9_-]+$/.test(value)
    ? value
    : undefined;
}
