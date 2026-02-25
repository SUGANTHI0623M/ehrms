import { apiSlice } from './apiSlice';

export interface QuestionResponse {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string | number | string[];
  score?: number;
  remarks?: string;
  isSatisfactory?: boolean;
}

export interface InterviewResponse {
  _id: string;
  interviewId: string;
  candidateId: string;
  templateId: string;
  roundNumber: number;
  roundName: string;
  interviewerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  interviewerRole: 'HR' | 'Senior HR' | 'Recruiter' | 'Manager' | 'Admin';
  responses: QuestionResponse[];
  overallScore?: number;
  overallFeedback?: string;
  recommendation: 'PROCEED' | 'REJECT' | 'HOLD' | 'FURTHER_ROUND';
  finalDecision?: 'SELECTED' | 'REJECTED';
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitInterviewResponseRequest {
  interviewId: string;
  responses: QuestionResponse[];
  overallFeedback?: string;
  recommendation: 'PROCEED' | 'REJECT' | 'HOLD' | 'FURTHER_ROUND';
}

export interface InterviewProgress {
  interviewId: string;
  round: number;
  roundName: string;
  status: string;
  assignedRole?: string;
  interviewerRole?: string;
  isCompleted: boolean;
  overallScore?: number;
  recommendation?: string;
  completedAt?: string;
  interviewer?: string;
  remarks?: string;
  responses?: QuestionResponse[];
  canAccess: boolean;
}

export interface TimelineStep {
  id: string;
  label: string;
  subLabel?: string;
  status: 'pending' | 'active' | 'completed' | 'rejected' | 'failed';
  date?: string;
  roundNumber?: number;
  order?: number;
}

export interface TimelineData {
  currentStage: string;
  stages: TimelineStep[];
}

export const interviewResponseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCandidateInterviewResponses: builder.query<
      { success: boolean; data: { responses: InterviewResponse[] } },
      string
    >({
      query: (candidateId) => `/interview-responses/candidate/${candidateId}`,
      providesTags: (result, error, candidateId) => [
        { type: 'InterviewResponse', id: `CANDIDATE-${candidateId}` },
      ],
    }),

    getInterviewResponse: builder.query<
      { success: boolean; data: { response: InterviewResponse } },
      { interviewId: string; roundNumber: number }
    >({
      query: ({ interviewId, roundNumber }) =>
        `/interview-responses/interview/${interviewId}/round/${roundNumber}`,
      providesTags: (result, error, { interviewId, roundNumber }) => [
        { type: 'InterviewResponse', id: `INTERVIEW-${interviewId}-${roundNumber}` },
      ],
    }),

    getInterviewProgress: builder.query<
      {
        success: boolean;
        data: {
          candidate: {
            _id: string;
            name: string;
            status: string;
          };
          progress: InterviewProgress[];
          timeline?: TimelineData;
          totalRounds: number;
        };
      },
      string | { candidateId: string; interviewId?: string }
    >({
      query: (arg) => {
        const candidateId = typeof arg === 'string' ? arg : arg.candidateId;
        const interviewId = typeof arg === 'object' ? arg.interviewId : undefined;
        let url = `/interview-responses/candidate/${candidateId}/progress`;
        if (interviewId) {
          url += `?interviewId=${interviewId}`;
        }
        return url;
      },
      providesTags: (result, error, arg) => {
        const candidateId = typeof arg === 'string' ? arg : arg.candidateId;
        return [{ type: 'InterviewResponse', id: `PROGRESS-${candidateId}` }];
      },
    }),

    submitInterviewResponse: builder.mutation<
      {
        success: boolean;
        data: {
          response: InterviewResponse;
          nextRoundUnlocked: boolean;
          candidateStatus: string;
        };
        message: string;
      },
      SubmitInterviewResponseRequest
    >({
      query: (data) => ({
        url: '/interview-responses/submit',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { interviewId }) => [
        { type: 'InterviewResponse', id: `INTERVIEW-${interviewId}` },
        'InterviewResponse',
        'Interview',
        'Candidate',
      ],
    }),
  }),
});

export const {
  useGetCandidateInterviewResponsesQuery,
  useGetInterviewResponseQuery,
  useGetInterviewProgressQuery,
  useSubmitInterviewResponseMutation,
} = interviewResponseApi;

