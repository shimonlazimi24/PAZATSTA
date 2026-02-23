/**
 * Server-side upload validation. Do not trust client-provided file.type;
 * verify by magic bytes (signature) to prevent malicious uploads.
 */

const SIGNATURES: { mime: string; ext: string; check: (buf: Uint8Array) => boolean }[] = [
  {
    mime: "image/jpeg",
    ext: ".jpg",
    check: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: ".png",
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  {
    mime: "image/gif",
    ext: ".gif",
    check: (buf) =>
      buf.length >= 6 &&
      buf[0] === 0x47 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x38 &&
      (buf[4] === 0x37 || buf[4] === 0x39) &&
      buf[5] === 0x61,
  },
  {
    mime: "image/webp",
    ext: ".webp",
    check: (buf) =>
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50,
  },
];

export type SafeUploadResult =
  | { ok: true; mime: string; ext: string }
  | { ok: false; error: string };

/**
 * Verify file content by magic bytes. Returns detected mime/ext or error.
 * Use this instead of trusting file.type from the client.
 */
export function safeUploadTypeCheck(fileBytes: Uint8Array): SafeUploadResult {
  for (const { mime, ext, check } of SIGNATURES) {
    if (check(fileBytes)) return { ok: true, mime, ext };
  }
  return { ok: false, error: "Unsupported file type" };
}

export const ALLOWED_UPLOAD_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const ALLOWED_UPLOAD_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
