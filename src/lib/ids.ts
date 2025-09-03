// src/lib/ids.ts
/**
 * Generates a short numeric ID (default 6 digits, non-leading-zero).
 * Note: Not cryptographically secure; good enough for human-facing IDs.
 */
export function generateShortNumericId(length = 6): number {
  const min = Math.pow(10, Math.max(1, length) - 1); // e.g. 100000 for 6
  const span = min * 9; // e.g. 900000 for 6
  return Math.floor(min + Math.random() * span);
}
