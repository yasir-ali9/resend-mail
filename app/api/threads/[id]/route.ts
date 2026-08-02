import {
  isDownloadableEmailAttachment,
  listResendEmailAttachments,
} from "@/lib/email/attachments";
import {
  getEmailThread,
  updateEmailAttachments,
} from "@/lib/email/repository";
import { getMailboxByEmail } from "@/lib/mailbox/repository";
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
    const mailboxEmail = readMailboxEmail(request);
    const configuredMailbox = mailboxEmail
      ? await getMailboxByEmail(mailboxEmail)
      : undefined;

    if (!configuredMailbox) {
      return Response.json(
        { error: "Mailbox not found." },
        { status: 404 },
      );
    }

    const messages = await getEmailThread(id, configuredMailbox.email);

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

function readMailboxEmail(request: Request) {
  const value = new URL(request.url).searchParams
    .get("mailbox")
    ?.trim()
    .toLowerCase();

  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? value
    : undefined;
}
