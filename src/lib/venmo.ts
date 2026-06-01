const VENMO_PATTERN = /^[a-zA-Z0-9_-]{1,30}$/;

export function normalizeVenmo(username: string): string {
  const cleaned = username.trim().replace(/^@/, "").toLowerCase();
  if (!VENMO_PATTERN.test(cleaned)) {
    throw new Error(
      "Venmo username must be 1–30 characters (letters, numbers, underscore, hyphen)",
    );
  }
  return cleaned;
}

export function venmoUrl(username: string): string {
  return `https://venmo.com/${normalizeVenmo(username)}`;
}
