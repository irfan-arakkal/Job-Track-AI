/** Upload limits shared by the browser (early feedback) and the server (the real check). */
export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const RESUME_MAX_COUNT = 20;
export const RESUME_ACCEPTED_TYPES = ["application/pdf"] as const;

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
