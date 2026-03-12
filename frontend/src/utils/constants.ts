/**
 * Frontend constants matching backend enums
 */

export const CANDIDATE_STATUS = {
  APPLIED: 'APPLIED',
  INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
  HR_INTERVIEW_IN_PROGRESS: 'HR_INTERVIEW_IN_PROGRESS',
  HR_INTERVIEW_COMPLETED: 'HR_INTERVIEW_COMPLETED',
  MANAGER_INTERVIEW_IN_PROGRESS: 'MANAGER_INTERVIEW_IN_PROGRESS',
  MANAGER_INTERVIEW_COMPLETED: 'MANAGER_INTERVIEW_COMPLETED',
  ROUND3_INTERVIEW_IN_PROGRESS: 'ROUND3_INTERVIEW_IN_PROGRESS',
  ROUND3_INTERVIEW_COMPLETED: 'ROUND3_INTERVIEW_COMPLETED',
  ROUND4_INTERVIEW_IN_PROGRESS: 'ROUND4_INTERVIEW_IN_PROGRESS',
  ROUND4_INTERVIEW_COMPLETED: 'ROUND4_INTERVIEW_COMPLETED',
  INTERVIEW_COMPLETED: 'INTERVIEW_COMPLETED',
  SELECTED: 'SELECTED',
  OFFER_PENDING: 'OFFER_PENDING',
  REJECTED: 'REJECTED',
  OFFER_SENT: 'OFFER_SENT',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  ONBOARDING: 'ONBOARDING',
  BACKGROUND_VERIFICATION: 'BACKGROUND_VERIFICATION',
  HIRED: 'HIRED'
} as const;

/**
 * Pipeline order for status filter dropdown.
 * Groups round-related statuses (Round 1 / Round 2 in progress and completed) so they are easy to find.
 */
export const CANDIDATE_STATUS_FILTER_ORDER = [
  'APPLIED',
  'RE_APPLIED',
  'APPLIED_FOR_MULTIPLE_JOBS',
  'INTERVIEW_SCHEDULED',
  'HR_INTERVIEW_IN_PROGRESS',      // Round 1 In Progress
  'HR_INTERVIEW_COMPLETED',        // Round 1 Completed
  'MANAGER_INTERVIEW_IN_PROGRESS', // Round 2 In Progress
  'MANAGER_INTERVIEW_COMPLETED',   // Round 2 Completed
  'ROUND3_INTERVIEW_IN_PROGRESS',  // Round 3 In Progress
  'ROUND3_INTERVIEW_COMPLETED',    // Round 3 Completed
  'ROUND4_INTERVIEW_IN_PROGRESS',  // Round 4 In Progress
  'ROUND4_INTERVIEW_COMPLETED',    // Round 4 Completed
  'INTERVIEW_COMPLETED',           // All Rounds Completed
  'SELECTED',
  'OFFER_PENDING',
  'OFFER_SENT',
  'OFFER_ACCEPTED',
  'ONBOARDING',
  'BACKGROUND_VERIFICATION',
  'HIRED',
  'REJECTED'
] as const;

export type CandidateStatus = typeof CANDIDATE_STATUS[keyof typeof CANDIDATE_STATUS];

export const INTERVIEW_STATUS = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  RESCHEDULED: 'RESCHEDULED',
  CANCELLED: 'CANCELLED'
} as const;

export type InterviewStatus = typeof INTERVIEW_STATUS[keyof typeof INTERVIEW_STATUS];

export const OFFER_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
} as const;

export type OfferStatus = typeof OFFER_STATUS[keyof typeof OFFER_STATUS];

export const CANDIDATE_SOURCE = {
  MANUAL: 'MANUAL',
  REFERRAL: 'REFERRAL',
  SELF_APPLIED: 'SELF_APPLIED'
} as const;

export type CandidateSource = typeof CANDIDATE_SOURCE[keyof typeof CANDIDATE_SOURCE];

/**
 * Helper function to format status for display
 */
export const formatCandidateStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    APPLIED: 'Applied',
    RE_APPLIED: 'Re-Applied',
    APPLIED_FOR_MULTIPLE_JOBS: 'Applied for Multiple Jobs',
    INTERVIEW_SCHEDULED: 'Interview Scheduled',
    HR_INTERVIEW_IN_PROGRESS: 'Round 1 In Progress',
    HR_INTERVIEW_COMPLETED: 'Round 1 Completed',
    MANAGER_INTERVIEW_IN_PROGRESS: 'Round 2 In Progress',
    MANAGER_INTERVIEW_COMPLETED: 'Round 2 Completed',
    ROUND3_INTERVIEW_IN_PROGRESS: 'Round 3 In Progress',
    ROUND3_INTERVIEW_COMPLETED: 'Round 3 Completed',
    ROUND4_INTERVIEW_IN_PROGRESS: 'Round 4 In Progress',
    ROUND4_INTERVIEW_COMPLETED: 'Round 4 Completed',
    INTERVIEW_COMPLETED: 'All Rounds Completed',
    SELECTED: 'Selected',
    OFFER_PENDING: 'Offer Pending',
    REJECTED: 'Rejected',
    OFFER_SENT: 'Offer Sent',
    OFFER_ACCEPTED: 'Offer Accepted',
    ONBOARDING: 'Onboarding',
    BACKGROUND_VERIFICATION: 'Background Verification',
    HIRED: 'Hired'
  };
  return statusMap[status] || status;
};

/**
 * Simplified Status Display for Interview Rounds
 * Maps internal granular statuses to simple "Applied", "Scheduled", "Completed"
 */
export const getRoundedStatusLabel = (status: string, scheduledInterview?: any, currentRound?: number): string => {
  const round = currentRound || 1;
  
  // 1. Completed (Strict Override)
  // Check if scheduledInterview exists and has completion indicators
  const isInterviewCompleted = scheduledInterview && (
    scheduledInterview.status === 'COMPLETED' ||
    scheduledInterview.feedback ||
    scheduledInterview.rating ||
    scheduledInterview.recommendation ||
    scheduledInterview.interviewResult
  );

  // Round-specific completed statuses
  if (
    status === 'HR_INTERVIEW_COMPLETED' && round === 1 ||
    status === 'MANAGER_INTERVIEW_COMPLETED' && round === 2 ||
    status === 'ROUND3_INTERVIEW_COMPLETED' && round === 3 ||
    status === 'ROUND4_INTERVIEW_COMPLETED' && round === 4 ||
    (status === 'INTERVIEW_COMPLETED' && isInterviewCompleted) ||
    status === 'REJECTED' ||
    isInterviewCompleted
  ) {
    return `Round ${round} Completed`;
  }

  // 2. Scheduled (Includes In Progress)
  if (
    status === 'HR_INTERVIEW_IN_PROGRESS' && round === 1 ||
    status === 'MANAGER_INTERVIEW_IN_PROGRESS' && round === 2 ||
    status === 'ROUND3_INTERVIEW_IN_PROGRESS' && round === 3 ||
    status === 'ROUND4_INTERVIEW_IN_PROGRESS' && round === 4 ||
    (status === 'INTERVIEW_SCHEDULED' && round > 0) ||
    (scheduledInterview && status === 'APPLIED') // Edge case: Applied status but interview scheduled
  ) {
    return `Round ${round} In Progress`;
  }

  // 3. Applied (Default / Not Scheduled)
  if (
    status === 'APPLIED' ||
    status === 'RE_APPLIED' ||
    status === 'APPLIED_FOR_MULTIPLE_JOBS'
  ) {
    return 'Applied';
  }

  return formatCandidateStatus(status); // Fallback to normal for unexpected states (e.g. HIRED)
};

export const formatInterviewStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    COMPLETED: 'Completed',
    RESCHEDULED: 'Rescheduled',
    CANCELLED: 'Cancelled'
  };
  return statusMap[status] || status;
};

export const formatOfferStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Sent',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    EXPIRED: 'Expired'
  };
  return statusMap[status] || status;
};

export const formatCandidateSource = (source: string): string => {
  const sourceMap: Record<string, string> = {
    MANUAL: 'Manual',
    REFERRAL: 'Referral',
    SELF_APPLIED: 'Self Applied'
  };
  return sourceMap[source] || source;
};

/**
 * Get status color for badges
 */
export const getCandidateStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    APPLIED: 'bg-primary/10 text-primary border-primary/20',
    RE_APPLIED: 'bg-orange-100 text-orange-800 border-orange-300',
    APPLIED_FOR_MULTIPLE_JOBS: 'bg-purple-100 text-purple-800 border-purple-300',
    INTERVIEW_SCHEDULED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    HR_INTERVIEW_IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-300',
    HR_INTERVIEW_COMPLETED: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    MANAGER_INTERVIEW_IN_PROGRESS: 'bg-violet-100 text-violet-800 border-violet-300',
    MANAGER_INTERVIEW_COMPLETED: 'bg-teal-100 text-teal-800 border-teal-300',
    ROUND3_INTERVIEW_IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-300',
    ROUND3_INTERVIEW_COMPLETED: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
    ROUND4_INTERVIEW_IN_PROGRESS: 'bg-pink-100 text-pink-800 border-pink-300',
    ROUND4_INTERVIEW_COMPLETED: 'bg-rose-100 text-rose-800 border-rose-300',
    INTERVIEW_COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    SELECTED: 'bg-green-100 text-green-800 border-green-300',
    OFFER_PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    REJECTED: 'bg-red-100 text-red-800 border-red-300',
    OFFER_SENT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    OFFER_ACCEPTED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    ONBOARDING: 'bg-sky-100 text-sky-800 border-sky-300',
    BACKGROUND_VERIFICATION: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    HIRED: 'bg-green-200 text-green-900 border-green-400'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
};

export const getInterviewStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    RESCHEDULED: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getOfferStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-orange-100 text-orange-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string | Date): string => {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

