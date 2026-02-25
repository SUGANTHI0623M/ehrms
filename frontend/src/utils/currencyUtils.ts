/**
 * Central currency formatting for INR (Indian Rupee).
 * Human-readable format with Indian number grouping (e.g. 12,34,567.89)
 * and proper Rupee symbol (₹).
 */

const INR_SYMBOL = "\u20B9"; // ₹ (Indian Rupee Sign, Unicode)
const NBSP = "\u00A0"; // Non-breaking space so "₹ 1,00,000" doesn't wrap awkwardly

/**
 * Format a number as Indian Rupee with human-readable grouping and 2 decimals.
 * Handles null, undefined, NaN; treats them as 0.
 * Example: 1234567.5 → "₹ 12,34,567.50"
 */
export function formatINR(amount: number | null | undefined): string {
  const n = amount == null || Number.isNaN(Number(amount)) ? 0 : Number(amount);
  const formatted = n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${INR_SYMBOL}${NBSP}${formatted}`;
}

/**
 * Alias for formatINR for backward compatibility with formatCurrency usage.
 */
export function formatCurrency(amount: number | null | undefined): string {
  return formatINR(amount);
}
