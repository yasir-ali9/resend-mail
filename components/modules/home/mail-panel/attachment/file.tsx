import {
  Archive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Presentation,
} from "lucide-react";

export const rasterPreviewTypes = new Set([
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const textPreviewTypes = new Set([
  "application/json",
  "text/csv",
  "text/markdown",
  "text/plain",
]);

export function AttachmentIcon({
  contentType,
  filename,
  size = "sm",
  tone = "default",
}: {
  contentType: string;
  filename: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "inverse";
}) {
  const normalizedType = contentType.toLowerCase();
  const extension = fileExtension(filename);
  const className = [
    size === "lg" ? "size-10" : size === "md" ? "size-6" : "size-4",
    "shrink-0",
    tone === "inverse" ? "text-white/60" : "text-fg-60",
  ].join(" ");

  if (normalizedType.startsWith("image/")) {
    return <ImageIcon aria-hidden="true" className={className} />;
  }

  if (
    normalizedType.includes("spreadsheet") ||
    normalizedType.includes("excel") ||
    normalizedType.includes("csv") ||
    ["CSV", "XLS", "XLSX"].includes(extension)
  ) {
    return <FileSpreadsheet aria-hidden="true" className={className} />;
  }

  if (
    normalizedType.includes("presentation") ||
    ["PPT", "PPTX", "KEY"].includes(extension)
  ) {
    return <Presentation aria-hidden="true" className={className} />;
  }

  if (
    normalizedType.includes("zip") ||
    normalizedType.includes("compressed") ||
    ["7Z", "GZ", "RAR", "TAR", "ZIP"].includes(extension)
  ) {
    return <Archive aria-hidden="true" className={className} />;
  }

  return <FileText aria-hidden="true" className={className} />;
}

export function fileExtension(filename: string) {
  const extension = filename.split(".").at(-1);

  if (!extension || extension === filename) {
    return "FILE";
  }

  return extension.slice(0, 5).toUpperCase();
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentUrl(
  emailId: string,
  attachmentId: string,
  preview = false,
) {
  const base = `/api/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`;
  return preview ? `${base}?preview=1` : base;
}
