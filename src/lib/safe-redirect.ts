/**
 * Validates a "where to go after login" value from the URL (e.g. /login?callbackUrl=/settings).
 *
 * Without this check an attacker could send someone a link like
 * /login?callbackUrl=https://evil.example and, after a genuine login, the victim would land on
 * the attacker's site (an "open redirect"). We only allow paths on our own site.
 */
export function getSafeRedirect(value: string | null | undefined, fallback = "/dashboard") {
  if (!value) return fallback;
  // Must be a relative path ("/x"), not protocol-relative ("//evil.com") or a backslash trick
  // ("/\evil.com"), which some browsers treat like "//".
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
