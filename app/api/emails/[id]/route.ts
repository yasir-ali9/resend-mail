import {
  isDownloadableEmailAttachment,
  listResendEmailAttachments,
} from "@/lib/email/attachments";
import {
  getEmail,
  updateEmailAttachments,
} from "@/lib/email/repository";
import { isAuthenticated } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const email = await getEmail(id);

    if (!email) {
      return Response.json({ error: "Email not found." }, { status: 404 });
    }

    try {
      const attachments = await listResendEmailAttachments(
        email.id,
        email.direction,
      );

      if (attachments.length > 0 || email.attachments?.length === 0) {
        email.attachments = attachments.filter(
          isDownloadableEmailAttachment,
        );
        await updateEmailAttachments(email.id, attachments);
      }
    } catch (attachmentError) {
      console.error(
        "Unable to refresh email attachment metadata.",
        attachmentError,
      );
    }

    return Response.json(
      { email },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Unable to load the email.", error);

    return Response.json(
      { error: "Unable to load this email." },
      { status: 500 },
    );
  }
}
