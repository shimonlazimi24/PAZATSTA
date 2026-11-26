import { z } from "zod";
import { MAX_TIP_SELECTION } from "@/lib/report-template";

/** Report fields are free text; bound them so a single request cannot store megabytes. */
export const MAX_FIELD_LENGTH = 5000;

/**
 * A free-text field that may be missing from the request. `.optional()` is
 * required: from zod 4.6 a missing key on a bare z.unknown() is rejected, which
 * once made every report fail with a misleading "5000 characters" message.
 */
const text = () =>
  z
    .unknown()
    .optional()
    .transform((v) => (typeof v === "string" ? v.trim() : ""))
    .pipe(z.string().max(MAX_FIELD_LENGTH));

export const ReportSchema = z.object({
  summaryText: text(),
  homeworkText: text(),
  pointsToKeep: text(),
  pointsToImprove: text(),
  /** Legacy shape: a comma-separated slug list. Still accepted so a client that
   *  has not reloaded across the deploy keeps working. */
  tips: text(),
  /** Current shape: the selected tip slugs. */
  tipIds: z
    .unknown()
    .optional()
    .transform((v) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []))
    .pipe(z.array(z.string().trim().max(120)).max(MAX_TIP_SELECTION)),
  /** Free text the teacher added alongside the selection. */
  tipsCustom: text(),
  recommendations: text(),
  /** Answers to the questions the admin added, by field key. */
  extra: z
    .unknown()
    .optional()
    .transform((v) => {
      if (!v || typeof v !== "object" || Array.isArray(v)) return {} as Record<string, string>;
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 50)) {
        if (typeof val === "string") out[k.slice(0, 60)] = val.trim().slice(0, MAX_FIELD_LENGTH);
      }
      return out;
    }),
  screeningType: text().transform((v) => v || null),
  parentEmail: text().transform((v) => v || null),
  screeningDate: text().transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "")),
});
