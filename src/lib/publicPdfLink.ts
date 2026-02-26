import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";

const TOKEN_BYTES = 48; // 48 bytes = 64 base64url chars
const BASE = "base64url";

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
}): Promise<{ rawToken: string; publicUrl: string }> {
  const { lessonId, recipientEmail, baseUrl } = params;
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  await prisma.publicPdfLink.create({
    data: {
      tokenHash,
      lessonId,
      recipientEmail: recipientEmail ?? null,
    },
  });

  return { rawToken, publicUrl: buildPublicUrl(baseUrl, rawToken) };
}
