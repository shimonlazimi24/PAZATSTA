import { z } from "zod";
import { normalizeEmailInput } from "@/lib/login-messages";

/**
 * Body of POST /api/auth/verify-code. Every key is optional at the schema level
 * (the route checks email and code itself): from zod 4.6 a missing key on a bare
 * z.unknown() is rejected, and the login form leaves out phone when it is empty.
 */
export const VerifyCodeSchema = z.object({
  // Must clean exactly as request-code does, or the stored code would never match.
  email: z.unknown().optional().transform((s) => (typeof s === "string" ? normalizeEmailInput(s) : "")),
  code: z.unknown().optional().transform((s) => (typeof s === "string" ? s.replace(/\D/g, "") : "")),
  role: z.unknown().optional().transform((s) => (s === "teacher" || s === "admin" ? s : "student")),
  phone: z.unknown().optional().transform((s) => (typeof s === "string" ? s.trim() : "")),
  // Set when logging in by phone: the account is found by this number instead of email.
  loginPhone: z.unknown().optional().transform((s) => (typeof s === "string" ? s.trim() : "")),
  next: z.unknown().optional().transform((s) => (typeof s === "string" ? s.trim() : "")),
});
