/**
 * Parse timestamp from client. Clients should send UTC ISO strings (e.g. "2025-02-06T10:07:00.000Z").
 * If string has no timezone (no Z or offset), treat as UTC to avoid server-timezone misinterpretation.
 * MongoDB stores dates in UTC; this ensures correct storage regardless of server timezone.
 */
function parseTimestamp(value) {
  if (!value) return new Date();
  if (typeof value === 'number') return new Date(value);
  const str = String(value).trim();
  // ISO format without timezone: "2025-02-06T10:07:00" or "2025-02-06T10:07:00.000"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(str) && !/[Z+-]\d{2}:?\d{2}$/.test(str)) {
    return new Date(str + 'Z'); // Assume UTC when no timezone
  }
  return new Date(str);
}

module.exports = { parseTimestamp };
