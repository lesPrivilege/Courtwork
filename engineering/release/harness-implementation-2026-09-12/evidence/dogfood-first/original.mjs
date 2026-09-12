// Synthetic coding fixture. Pure function; no I/O or dependencies.
// Return the zero-based page containing offset, or null when out of range.
// totalItems and offset are nonnegative integers; pageSize is positive integer.
export function pageForOffset(totalItems, pageSize, offset) {
  if (!Number.isInteger(totalItems) || totalItems < 0) throw new RangeError('totalItems');
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new RangeError('pageSize');
  if (!Number.isInteger(offset) || offset < 0) throw new RangeError('offset');
  if (offset > totalItems) return null;
  return Math.floor(offset / pageSize);
}
