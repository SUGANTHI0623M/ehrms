/**
 * LMS Design System Constants
 * Use these across the LMS module for consistent status colors, date formats, and breakpoints.
 * See docs/LMS_DESIGN_SYSTEM.md for full design system documentation.
 */

/** Ant Design Tag color names for status badges (maps to design tokens) */
export const LMS_STATUS_TAG_COLORS: Record<string, string> = {
  // Assessment / session status
  Requested: 'orange',
  Scheduled: 'blue',
  Live: 'gold',
  Completed: 'gold',
  Cancelled: 'default',
  Rejected: 'red',
  Upcoming: 'blue',
  Ended: 'default',
  // Course / progress status
  Published: 'gold',
  Archived: 'default',
  Draft: 'default',
  'Not Started': 'default',
  'In Progress': 'processing',
  Expired: 'warning',
  Passed: 'gold',
  Failed: 'red',
  // Generic
  success: 'gold',
  warning: 'gold',
  error: 'red',
  info: 'blue',
};

/** Standard date format for LMS (e.g. "Jan 15, 2025") */
export const LMS_DATE_FORMAT = 'MMM D, YYYY';

/** Standard date-time format for LMS (e.g. "Jan 15, 2025 2:30 PM") */
export const LMS_DATETIME_FORMAT = 'MMM D, YYYY h:mm A';

/** Short date for tables (e.g. "Jan 15, 2025") */
export const LMS_DATE_SHORT = 'MMM D, YYYY';

/** Time only (e.g. "2:30 PM") */
export const LMS_TIME_FORMAT = 'h:mm A';

/**
 * Responsive breakpoints (match Tailwind defaults).
 * Use in CSS media queries and JS when needed.
 */
export const LMS_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** Chart color palette for LMS (consistent across dashboard, scores, analytics) */
export const LMS_CHART_COLORS = [
  '#efaa1f', /* primary/success */
  '#2563eb', /* blue */
  '#ca8a04', /* warning/amber */
  '#dc2626', /* destructive */
  '#9333ea', /* purple */
  '#0891b2', /* cyan */
];
