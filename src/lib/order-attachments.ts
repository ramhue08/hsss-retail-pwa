export const ORDER_ATTACHMENTS_BUCKET = "order-attachments";

export const MAX_ORDER_ATTACHMENTS = 5;
export const MAX_ORDER_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB each

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "webp", "gif"]);

export type OrderAttachmentMeta = {
  name: string;
  path: string;
  contentType: string;
  size: number;
};

export function isAllowedAttachmentFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (ALLOWED_MIME.has(type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXT.has(ext);
}

export function validateAttachmentFiles(files: File[]): string | null {
  if (files.length > MAX_ORDER_ATTACHMENTS) {
    return `You can attach up to ${MAX_ORDER_ATTACHMENTS} files.`;
  }
  for (const file of files) {
    if (!isAllowedAttachmentFile(file)) {
      return `"${file.name}" is not allowed. Use PDF or image files only.`;
    }
    if (file.size > MAX_ORDER_ATTACHMENT_BYTES) {
      return `"${file.name}" is too large (max 10 MB per file).`;
    }
    if (file.size <= 0) {
      return `"${file.name}" is empty.`;
    }
  }
  return null;
}

export function sanitizeAttachmentFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/[^\w.\-()+\s]/g, "_");
  return base.slice(0, 120) || "attachment";
}

export function orderAttachmentStoragePath(
  builderId: string,
  orderId: string,
  filename: string
): string {
  const safe = sanitizeAttachmentFilename(filename);
  const id = crypto.randomUUID();
  return `${builderId}/${orderId}/${id}-${safe}`;
}

export function attachmentListLabel(
  attachments: OrderAttachmentMeta[] | undefined
): string | null {
  if (!attachments?.length) return null;
  return attachments.map((a) => a.name).join(", ");
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
