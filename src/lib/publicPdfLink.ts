import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";

const TOKEN_BYTES = 48; // 48 bytes = 64 base64url chars
const BASE = "base64url";
/** How long an emailed lesson-summary link stays valid. */
export const LINK_TTL_DAYS = 90;

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString(BASE);
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

function buildPublicUrl(baseUrl: string, rawToken: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/p/lesson-summary/${encodeURIComponent(rawToken)}`;
}

/**
 * Create a public PDF link for a lesson. Returns publicUrl for use in emails.
 * Optional: if a non-revoked link exists for lessonId, we cannot return its URL
 * (hash-only storage). So we always create a new link. One link per completion.
 */
export async function createLessonSummaryLink(params: {
  lessonId: string;
  recipientEmail?: string | null;
  baseUrl: string;
}): Promise<{ rawToken: string; publicUrl: string; expiresAt: Date }> {
  const { lessonId, recipientEmail, baseUrl } = params;
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.publicPdfLink.create({
    data: {
      tokenHash,
      lessonId,
      recipientEmail: recipientEmail ?? null,
      expiresAt,
    },
  });

  return { rawToken, publicUrl: buildPublicUrl(baseUrl, rawToken), expiresAt };
}
