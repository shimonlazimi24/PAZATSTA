import path from "path";
import { unlink } from "fs/promises";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import type { RatingItem, RatingKind } from "@/lib/ratings";

export const LOCAL_RATINGS_DIR = path.join(process.cwd(), "public", "uploads", "ratings");

export function toItem(r: { id: string; kind: string; url: string; createdAt: Date }): RatingItem {
  return { id: r.id, kind: r.kind as RatingKind, url: r.url, createdAt: r.createdAt.toISOString() };
}

/** Removes the row and its file. A file that is already gone is not an error. */
export async function deleteRating(row: { id: string; url: string }): Promise<void> {
  await prisma.ratingUpload.delete({ where: { id: row.id } });
  try {
    if (row.url.startsWith("/uploads/ratings/")) {
      const file = path.resolve(process.cwd(), "public", `.${row.url}`);
      if (file.startsWith(LOCAL_RATINGS_DIR + path.sep)) await unlink(file);
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(row.url);
    }
  } catch (e) {
    console.error("[ratings] file delete failed:", e);
  }
}
