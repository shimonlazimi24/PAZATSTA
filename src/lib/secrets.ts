/**
 * Central accessor for signing secrets.
 *
 * Read from process.env on every call rather than at module load: in serverless
 * the environment is not always populated when the module is first evaluated.
 *
 * In production a missing or too-short secret throws. Falling back to a constant
 * that lives in the repo would mean session cookies and OTP hashes are signed
 * with a value anyone can read.
 */

const MIN_SECRET_LENGTH = 32;
const DEV_FALLBACK = "dev-only-secret-min-32-characters-long";

export function getSigningSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (secret && secret.length >= MIN_SECRET_LENGTH) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `COOKIE_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters. ` +
        "Set it in the environment before starting the server."
    );
  }
  return DEV_FALLBACK;
}
