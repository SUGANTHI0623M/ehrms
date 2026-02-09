/**
 * Assessment request lifecycle: Requested → Scheduled → Live → Completed (or Cancelled).
 * Status-driven workflow: each status determines tab placement and available actions.
 */

export type AssessmentRequestStatus =
  | 'Requested'
  | 'Scheduled'
  | 'Live'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export const ASSESSMENT_TAB_KEYS = {
  SCHEDULED: 'scheduled',   // "Scheduled Assessment" — Requested only
  UPCOMING: 'upcoming',     // Scheduled + Live (upcoming = not yet completed)
  COMPLETED: 'completed',  // Completed (+ results table); Cancelled can be shown here or filtered
} as const;

/** Which tab a request belongs to based on status */
export function getTabForStatus(status: AssessmentRequestStatus): string {
  switch (status) {
    case 'Requested':
      return ASSESSMENT_TAB_KEYS.SCHEDULED;
    case 'Scheduled':
    case 'Live':
      return ASSESSMENT_TAB_KEYS.UPCOMING;
    case 'Completed':
    case 'Cancelled':
    case 'Rejected':
      return ASSESSMENT_TAB_KEYS.COMPLETED;
    default:
      return ASSESSMENT_TAB_KEYS.SCHEDULED;
  }
}

export type AssessmentActionType =
  | 'schedule'      // Open Schedule Assessment modal
  | 'start'         // Start Assessment (navigate to live session, set Live)
  | 'cancel'        // Cancel request/session (set Cancelled)
  | 'end_session'   // End Session (open review modal, then set Completed)
  | 'view_review'   // View saved review/notes (Completed only)
  | 'reject';       // Reject request (optional)

export interface AssessmentAction {
  key: AssessmentActionType;
  label: string;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  visible: boolean;
}

export interface AssessmentActionsConfig {
  primary: AssessmentAction | null;
  secondary: AssessmentAction[];
}

/** Whether the scheduled time has been reached or we're within 1 minute of it (start is allowed when "Starts in 0 minutes" is shown) */
export function isScheduledTimeReached(scheduledAt: string | Date | undefined): boolean {
  if (!scheduledAt) return false;
  const scheduledMs = new Date(scheduledAt).getTime();
  const now = Date.now();
  const oneMinuteMs = 60 * 1000;
  return now >= scheduledMs - oneMinuteMs;
}

/** Minutes until scheduled time (positive = future) */
export function getMinutesUntilScheduled(scheduledAt: string | Date | undefined): number | null {
  if (!scheduledAt) return null;
  return Math.floor((new Date(scheduledAt).getTime() - Date.now()) / (60 * 1000));
}

/** Get allowed actions for an assessment request based on status and time */
export function getActionsForRequest(record: {
  status: AssessmentRequestStatus;
  scheduledAt?: string | Date;
  liveSessionId?: string | { _id: string };
}): AssessmentActionsConfig {
  const status = record.status as AssessmentRequestStatus;
  const scheduledReached = isScheduledTimeReached(record.scheduledAt);
  const liveSessionIdRaw = record.liveSessionId;
  const liveSessionId = typeof liveSessionIdRaw === 'object' && liveSessionIdRaw !== null
    ? (liveSessionIdRaw as { _id?: string })._id ?? (liveSessionIdRaw as any).id
    : (typeof liveSessionIdRaw === 'string' ? liveSessionIdRaw : undefined);

  switch (status) {
    case 'Requested':
      return {
        primary: { key: 'schedule', label: 'Schedule Assessment', primary: true, visible: true, disabled: false },
        secondary: [],
      };

    case 'Scheduled':
      return {
        primary: scheduledReached && liveSessionId
          ? { key: 'start', label: 'Start Assessment', primary: true, visible: true, disabled: false }
          : null,
        secondary: [
          { key: 'cancel', label: 'Cancel', danger: true, visible: true, disabled: false },
        ],
      };

    case 'Live':
      return {
        primary: { key: 'start', label: 'Start Assessment', primary: true, visible: true, disabled: false },
        secondary: [
          { key: 'end_session', label: 'End Session', danger: true, visible: true, disabled: false },
        ],
      };

    case 'Completed':
    case 'Cancelled':
    case 'Rejected':
      return {
        primary: status === 'Completed'
          ? { key: 'view_review', label: 'View Review', primary: false, visible: true, disabled: false }
          : null,
        secondary: [],
      };

    default:
      return { primary: null, secondary: [] };
  }
}

/** Status display config for tags */
export const STATUS_TAG_COLOR: Record<string, string> = {
  Requested: 'orange',
  Scheduled: 'blue',
  Live: 'green',
  Completed: 'green',
  Cancelled: 'default',
  Rejected: 'red',
};
