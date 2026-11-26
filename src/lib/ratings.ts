/**
 * Ratings: photos and videos a teacher uploads from the dashboard, which the
 * admin sees per teacher with a count.
 *
 * Files go straight from the browser to Vercel Blob (a video is too big to pass
 * through a server function). Without a Blob store, a local dev machine keeps
 * them on disk, and production keeps the feature switched off.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const RATING_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
/** Uploads one teacher may keep; a guard against filling the storage by mistake. */
export const MAX_UPLOADS_PER_TEACHER = 300;

export type RatingKind = "image" | "video";
export type RatingMode = "blob" | "local" | "off";
export type RatingItem = { id: string; kind: RatingKind; url: string; createdAt: string };

export function kindOfType(type: string): RatingKind | null {
  if (IMAGE_TYPES.includes(type)) return "image";
  if (VIDEO_TYPES.includes(type)) return "video";
  return null;
}

export function ratingMode(): RatingMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return process.env.NODE_ENV === "production" ? "off" : "local";
}

/** Every teacher's files sit under their own folder, so a path proves whose it is. */
export function ratingFolder(teacherId: string): string {
  return `ratings/${teacherId}/`;
}

/** Why a chosen file can't be uploaded, or null when it can. */
export function fileProblem(type: string, size: number): string | null {
  const kind = kindOfType(type);
  if (!kind) return "אפשר להעלות תמונה (JPG, PNG, WebP) או סרטון (MP4, MOV, WebM).";
  if (kind === "image" && size > MAX_IMAGE_BYTES) return "התמונה גדולה מדי. הגודל המרבי הוא 15MB.";
  if (kind === "video" && size > MAX_VIDEO_BYTES) return "הסרטון גדול מדי. הגודל המרבי הוא 200MB (בערך 2 דקות צילום).";
  return null;
}
