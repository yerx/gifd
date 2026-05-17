import { ulid } from "ulid";

/**
 * Generate a new ULID (Universally Unique Lexicographically Sortable Identifier).
 * ULIDs are time-sortable, globally unique, and require no coordination.
 */
export function generateId(): string {
  return ulid();
}

/**
 * Extract the timestamp from a ULID.
 * Returns the millisecond timestamp encoded in the ULID.
 */
export function extractTimestamp(id: string): number {
  const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const timeChars = id.substring(0, 10).toUpperCase();
  let time = 0;
  for (const char of timeChars) {
    const index = ENCODING.indexOf(char);
    if (index === -1) throw new Error(`Invalid ULID character: ${char}`);
    time = time * 32 + index;
  }
  return time;
}
