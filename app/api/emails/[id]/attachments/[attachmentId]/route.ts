import { getResendEmailAttachment } from "@/lib/email/attachments";
import { getEmailDirection } from "@/lib/email/repository";
import { isAuthenticated } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resendIdPattern = /^[a-zA-Z0-9_-]+$/;
const previewContentTypes = new Set([
  "application/pdf",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/ogg",
  "video/webm",
]);

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; attachmentId: string }>;
  },
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id, attachmentId } = await params;

  if (!resendIdPattern.test(id) || !resendIdPattern.test(attachmentId)) {
    return Response.json({ error: "Invalid attachment." }, { status: 400 });
  }

  const direction = await getEmailDirection(id);

  if (!direction) {
    return Response.json({ error: "Email not found." }, { status: 404 });
  }

  try {
    const attachment = await getResendEmailAttachment(
      id,
      attachmentId,
      direction,
    );
    const range = request.headers.get("range");
    const download = await fetch(attachment.download_url, {
      cache: "no-store",
      headers: range ? { Range: range } : undefined,
    });

    if (!download.ok || !download.body) {
      throw new Error("The attachment file is unavailable.");
    }

    const contentType =
      attachment.content_type || "application/octet-stream";
    const normalizedContentType = contentType.toLowerCase();
    const previewRequested =
      new URL(request.url).searchParams.get("preview") === "1";
    const inline =
      previewRequested && previewContentTypes.has(normalizedContentType);
    const headers = new Headers({
      "Cache-Control": inline
        ? "private, max-age=300"
        : "private, no-store",
      "Content-Disposition": createContentDisposition(
        attachment.filename || "attachment",
        inline,
      ),
      "Content-Type": contentType,
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    });

    for (const header of [
      "accept-ranges",
      "content-length",
      "content-range",
    ]) {
      const value = download.headers.get(header);

      if (value) {
        headers.set(header, value);
      }
    }

    return new Response(download.body, {
      headers,
      status: download.status,
    });
  } catch (error) {
    console.error("Unable to download the attachment.", error);

    return Response.json(
      { error: "Unable to download this attachment." },
      { status: 502 },
    );
  }
}

function createContentDisposition(filename: string, inline: boolean) {
  const fallback =
    filename
      .replace(/[\r\n]/g, "")
      .replace(/["\\]/g, "_")
      .replace(/[^\x20-\x7e]/g, "_")
      .trim() || "attachment";
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  const disposition = inline ? "inline" : "attachment";

  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
