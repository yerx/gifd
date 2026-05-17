/**
 * Fractional indexing utilities for sort_order fields.
 *
 * Instead of reindexing all items when reordering, we compute a
 * midpoint between two adjacent sort_order values.
 */

/**
 * Compute a sort_order value between two existing values.
 * If inserting at the start, pass null for `before`.
 * If inserting at the end, pass null for `after`.
 */
export function between(before: number | null, after: number | null): number {
  const lo = before ?? 0;
  const hi = after ?? lo + 1;

  if (lo >= hi) {
    // Fallback: place after the higher value
    return hi + 1;
  }

  return (lo + hi) / 2;
}

/**
 * Generate the next sort_order value after the last item in a list.
 * Pass the current maximum sort_order, or null for an empty list.
 */
export function afterLast(maxSortOrder: number | null): number {
  return (maxSortOrder ?? 0) + 1;
}

/**
 * Check if fractional values have become too precise (more than 10 decimal places)
 * and a rebalance is recommended.
 */
export function needsRebalance(sortOrder: number): boolean {
  const str = sortOrder.toString();
  const decimalIndex = str.indexOf(".");
  if (decimalIndex === -1) return false;
  return str.length - decimalIndex - 1 > 10;
}

/**
 * Rebalance an array of sort_order values to clean integers.
 * Returns a new array of evenly-spaced sort_order values.
 */
export function rebalance(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}
