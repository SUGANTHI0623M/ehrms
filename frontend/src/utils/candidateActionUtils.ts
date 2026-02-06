
// import { Candidate } from "@/types/candidate"; 


export type ActionType =
    | 'SCHEDULE'
    | 'START'
    | 'VIEW_PROGRESS'
    | 'GENERATE_OFFER'
    | 'VIEW_OFFER'
    | 'ONBOARD'
    | 'DOCUMENT_COLLECTION'
    | 'BACKGROUND_VERIFICATION'
    | 'CONVERT_TO_STAFF'
    | 'VIEW_LOGS'
    | 'VIEW_PROFILE'
    | 'NONE';

export interface CandidateAction {
    label: string;
    type: ActionType;
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
    color?: string; // For custom styling
    round?: number; // For scheduling specific rounds
    path?: string; // Navigation path
}

/**
 * Get the appropriate action for a candidate based on their current status
 * Implements the complete candidate lifecycle from application to staff conversion
 * 
 * @param candidate - The candidate object with status, round info, etc.
 * @param currentUser - The current logged-in user (for access control)
 * @returns CandidateAction object with label, type, styling, etc.
 */
export const getCandidateAction = (candidate: any, currentUser?: any): CandidateAction => {
    const status = candidate?.status;
    const currentRound = candidate?.currentJobStage || candidate?.currentRound || 1;

    // Access Control Roles
    const isAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin';
    const isHR = currentUser?.role === 'HR' || currentUser?.role === 'Senior HR';
    const isManager = currentUser?.role === 'Manager';
    const canOperate = isAdmin || isHR; // Only Admin/HR can Schedule/Offer/Onboard

    const scheduledInterview = candidate?.scheduledInterview;

    // Check if user is the assigned interviewer for the scheduled interview
    const isAssignedInterviewer = currentUser && scheduledInterview && (
        (scheduledInterview.interviewerId &&
            (scheduledInterview.interviewerId.toString() === currentUser.id?.toString() ||
                scheduledInterview.interviewerId._id?.toString() === currentUser.id?.toString())) ||
        (scheduledInterview.interviewerEmail &&
            scheduledInterview.interviewerEmail.toLowerCase() === currentUser.email?.toLowerCase())
    );

    // ============================================
    // 0. PRIORITY CHECKS (Object state overrides Status)
    // ============================================

    // Fix: If interview is already completed (regardless of candidate status lag), show Logs
    if (scheduledInterview?.status === 'COMPLETED') {
        return {
            label: 'View Logs',
            type: 'VIEW_LOGS',
            variant: 'outline',
            disabled: false,
            path: `/interview/candidate/${candidate._id}/progress?interviewId=${scheduledInterview._id}`
        };
    }

    // Fix: If interview is active (Scheduled/In-Progress/Rescheduled), prioritize Start
    // This handles cases where candidate status is still "COMPLETED" (from previous round) 
    // but a new interview has been scheduled for the next round.
    if (scheduledInterview && ['SCHEDULED', 'IN_PROGRESS', 'RESCHEDULED'].includes(scheduledInterview.status)) {
        if (isAdmin || isAssignedInterviewer) {
            return {
                label: scheduledInterview.status === 'IN_PROGRESS' ? 'Resume Interview' : 'Start Interview',
                type: 'START',
                variant: 'default',
                color: 'bg-green-600 hover:bg-green-700 text-white',
                round: currentRound,
                path: scheduledInterview._id ? `/interview/round/${scheduledInterview._id}` : undefined
            };
        }
        // Others view "Interview Scheduled"
        return {
            label: 'Interview Scheduled',
            type: 'VIEW_PROGRESS',
            variant: 'outline',
            disabled: false,
            path: `/interview/candidate/${candidate._id}/progress`
        };
    }

    // ============================================
    // 1. APPLIED -> SCHEDULE INTERVIEW
    // ============================================
    // Fix: Ensure we don't show "Schedule" if an interview is already attached
    if ((status === 'APPLIED' || status === 'RE_APPLIED' || status === 'APPLIED_FOR_MULTIPLE_JOBS') && !scheduledInterview) {
        if (canOperate) {
            return {
                label: 'Schedule Interview',
                type: 'SCHEDULE',
                variant: 'default',
                color: 'bg-blue-600 hover:bg-blue-700 text-white',
                round: 1 // Always start at Round 1
            };
        } else {
            return {
                label: 'Applied',
                type: 'VIEW_PROFILE',
                variant: 'outline',
                disabled: true
            };
        }
    }

    // ============================================
    // 2. INTERVIEW SCHEDULED / IN PROGRESS -> START INTERVIEW
    // ============================================
    // Fix: Also catch cases where status is APPLIED but scheduledInterview exists
    if (['INTERVIEW_SCHEDULED', 'HR_INTERVIEW_IN_PROGRESS', 'MANAGER_INTERVIEW_IN_PROGRESS'].includes(status) || (status === 'APPLIED' && scheduledInterview)) {
        // Access Control: Admin OR Assigned Interviewer can START
        if (isAdmin || isAssignedInterviewer) {
            return {
                label: 'Start Interview',
                type: 'START',
                variant: 'default',
                color: 'bg-green-600 hover:bg-green-700 text-white',
                round: currentRound,
                path: scheduledInterview?._id ? `/interview/round/${scheduledInterview._id}` : undefined
            };
        }
        // Others view "Interview Scheduled"
        return {
            label: 'Interview Scheduled',
            type: 'VIEW_PROGRESS',
            variant: 'outline',
            disabled: false,
            path: `/interview/candidate/${candidate._id}/progress`
        };
    }

    // ============================================
    // 3. INTERVIEW COMPLETED (Transition State)
    // ============================================
    if (status === 'INTERVIEW_COMPLETED' || status === 'HR_INTERVIEW_COMPLETED' || status === 'MANAGER_INTERVIEW_COMPLETED') {
        // SCENARIO 1: New to this round (Moved from previous round)
        // Backend ensures currentJobStage is incremented.
        // If we have NO scheduled interview for THIS stage, we must Schedule.
        if (!scheduledInterview) {
            if (canOperate) {
                return {
                    label: 'Schedule Interview',
                    type: 'SCHEDULE',
                    variant: 'default',
                    color: 'bg-blue-600 hover:bg-blue-700 text-white',
                    round: currentRound
                };
            }
            return {
                label: 'Ready for Interview',
                type: 'VIEW_PROGRESS',
                variant: 'outline',
                disabled: true
            };
        }

        // SCENARIO 2: Finished interview for THIS round
        // Waiting for decision
        return {
            label: 'View Logs',
            type: 'VIEW_LOGS',
            variant: 'outline',
            disabled: false,
            path: `/interview/candidate/${candidate._id}/progress?interviewId=${scheduledInterview._id}`
        };
    }

    // ============================================
    // 4. SELECTED -> GENERATE OFFER
    // ============================================
    if (status === 'SELECTED') {
        if (canOperate) {
            return {
                label: 'Generate Offer Letter',
                type: 'GENERATE_OFFER',
                variant: 'default',
                color: 'bg-green-600 hover:bg-green-700 text-white'
            };
        }
        return {
            label: 'Selected',
            type: 'VIEW_PROGRESS',
            variant: 'outline',
            disabled: true
        };
    }

    // ============================================
    // 5. OFFER SENT -> VIEW OFFER
    // ============================================
    if (status === 'OFFER_SENT') {
        return {
            label: 'View Offer',
            type: 'VIEW_OFFER',
            variant: 'outline'
        };
    }

    // ============================================
    // 6. OFFER ACCEPTED -> ONBOARD
    // ============================================
    if (status === 'OFFER_ACCEPTED') {
        if (canOperate) {
            return {
                label: 'Onboard',
                type: 'ONBOARD',
                variant: 'default',
                color: 'bg-indigo-600 hover:bg-indigo-700 text-white'
            };
        }
        return {
            label: 'Offer Accepted',
            type: 'VIEW_OFFER',
            variant: 'outline'
        };
    }

    // ============================================
    // 7. HIRED -> CONVERT TO STAFF
    // ============================================
    if (status === 'HIRED') {
        // Check if already has user ID (Converted)
        if (candidate.userId) {
            return {
                label: 'Candidate Logs',
                type: 'VIEW_LOGS',
                variant: 'outline',
                disabled: false
            };
        }

        if (canOperate) {
            return {
                label: 'Convert to Staff',
                type: 'CONVERT_TO_STAFF',
                variant: 'default',
                color: 'bg-purple-600 hover:bg-purple-700 text-white'
            };
        }

        return {
            label: 'Hired',
            type: 'VIEW_LOGS',
            variant: 'outline',
            disabled: false
        };
    }

    // ============================================
    // 8. REJECTED -> VIEW LOGS
    // ============================================
    if (status === 'REJECTED') {
        return {
            label: 'View Logs',
            type: 'VIEW_LOGS',
            variant: 'destructive',
            disabled: false
        };
    }

    // ============================================
    // FALLBACK
    // ============================================
    return {
        label: 'View Profile',
        type: 'VIEW_PROFILE',
        variant: 'outline'
    };
};
