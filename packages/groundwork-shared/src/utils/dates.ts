/**
 * ISO 8601 date/time helpers for GroundWork.
 * All timestamps stored as TEXT in SQLite using ISO 8601 format.
 */

/**
 * Returns the current timestamp in ISO 8601 format.
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Returns today's date as YYYY-MM-DD.
 */
export function today(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Formats a Date object to ISO 8601 date string (YYYY-MM-DD).
 */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Formats a Date object to HH:MM 24-hour format using local time.
 */
export function toTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Parse an ISO 8601 string to a Date object.
 */
export function parseISO(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Check if date string A is before date string B.
 * Works with both full ISO 8601 timestamps and YYYY-MM-DD dates.
 */
export function isBefore(a: string, b: string): boolean {
  return a < b;
}

/**
 * Check if date string A is after date string B.
 */
export function isAfter(a: string, b: string): boolean {
  return a > b;
}

/**
 * Calculate the difference in days between two YYYY-MM-DD date strings.
 */
export function daysDiff(a: string, b: string): number {
  const dateA = new Date(a);
  const dateB = new Date(b);
  const diffMs = dateB.getTime() - dateA.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a YYYY-MM-DD date string.
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}
