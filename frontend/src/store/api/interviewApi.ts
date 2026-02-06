import { apiSlice } from './apiSlice';
import { InterviewStatus } from '@/utils/constants';

export interface Interview {
  _id: string;
  candidateId: string | {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  jobOpeningId?: string;
  interviewType: 'Virtual' | 'In-Person';
  interviewDate: string;
  interviewTime: string; // HH:mm format
  interviewLocation?: string;
  interviewMode: 'Virtual' | 'Direct';
  status: InterviewStatus;
  interviewResult?: 'SELECTED' | 'REJECTED';
  round: number;
  interviewerId?: string | {
    _id: string;
    name: string;
    email: string;
  };
  interviewerName?: string;
  interviewerEmail?: string;
  notes?: string;
  feedback?: string;
  rating?: number;
  scheduledBy: string | {
    _id: string;
    name: string;
    email: string;
  };
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInterviewRequest {
  interviewType: 'Virtual' | 'In-Person';
  interviewDate: string; // ISO date string
  interviewTime: string; // HH:mm format
  interviewLocation?: string;
  interviewMode: 'Virtual' | 'Direct';
  interviewerId?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  notes?: string;
  round?: number;
}

export interface UpdateInterviewRequest {
  interviewType?: 'Virtual' | 'In-Person';
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  interviewMode?: 'Virtual' | 'Direct';
  interviewerId?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  notes?: string;
  status?: InterviewStatus;
  feedback?: string;
  rating?: number;
  interviewResult?: 'SELECTED' | 'REJECTED';
}

export interface CompleteInterviewRequest {
  feedback?: string;
  rating?: number;
  interviewResult: 'SELECTED' | 'REJECTED';
}

export const interviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all interviews for a candidate
    getCandidateInterviews: builder.query<
      { success: boolean; data: { interviews: Interview[] } },
      string
    >({
      query: (candidateId) => `/interviews/candidate/${candidateId}`,
      providesTags: (result, error, candidateId) => [
        { type: 'Interview', id: `LIST-${candidateId}` },
        'Interview'
      ],
    }),

    // Get a single interview by ID
    getInterviewById: builder.query<
      { success: boolean; data: { interview: Interview } },
      string
    >({
      query: (id) => `/interviews/${id}`,
      providesTags: (result, error, id) => [{ type: 'Interview', id }],
    }),

    // Schedule a new interview
    scheduleInterview: builder.mutation<
      { success: boolean; data: { interview: Interview }; message: string },
      { candidateId: string; data: ScheduleInterviewRequest }
    >({
      query: ({ candidateId, data }) => ({
        url: `/interviews/candidate/${candidateId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { candidateId }) => [
        { type: 'Interview', id: `LIST-${candidateId}` },
        { type: 'Candidate', id: candidateId },
        'Interview',
        'Candidate'
      ],
    }),

    // Update an interview
    updateInterview: builder.mutation<
      { success: boolean; data: { interview: Interview }; message: string },
      { id: string; data: UpdateInterviewRequest }
    >({
      query: ({ id, data }) => ({
        url: `/interviews/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Interview', id },
        'Interview',
        'Candidate'
      ],
    }),

    // Complete an interview with result
    completeInterview: builder.mutation<
      { success: boolean; data: { interview: Interview }; message: string },
      { id: string; data: CompleteInterviewRequest }
    >({
      query: ({ id, data }) => ({
        url: `/interviews/${id}/complete`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Interview', id },
        'Interview',
        'Candidate'
      ],
    }),

    // Assign interview template to interview
    assignInterviewTemplate: builder.mutation<
      { success: boolean; data: { interview: Interview }; message: string },
      { id: string; templateId: string; round?: 'HR' | 'Manager' }
    >({
      query: ({ id, templateId, round }) => ({
        url: `/interviews/${id}/assign-template`,
        method: 'POST',
        body: { templateId, round },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Interview', id },
        'Interview',
        'Candidate',
      ],
    }),

    // Cancel/Delete an interview
    deleteInterview: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/interviews/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Interview', 'Candidate'],
    }),
  }),
});

export const {
  useGetCandidateInterviewsQuery,
  useGetInterviewByIdQuery,
  useScheduleInterviewMutation,
  useUpdateInterviewMutation,
  useCompleteInterviewMutation,
  useAssignInterviewTemplateMutation,
  useDeleteInterviewMutation,
} = interviewApi;

