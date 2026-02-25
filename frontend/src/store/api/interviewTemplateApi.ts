import { apiSlice } from './apiSlice';

export interface InterviewQuestion {
  _id?: string;
  questionText: string;
  questionType: 'text' | 'textarea' | 'dropdown' | 'rating' | 'scenario' | 'multiple-choice';
  options?: string[];
  isRequired: boolean;
  scoringType?: 'rating' | 'pass-fail' | 'weighted';
  maxScore?: number;
  weight?: number;
  evaluationCriteria?: string;
  redFlags?: string[];
}

export interface InterviewRound {
  _id?: string;
  roundName: string; // Round 1, Round 2, Round 3, Final
  enabled: boolean;
  assignedInterviewers: string[]; // Array of User IDs
  assignedRole: 'Recruiter' | 'Manager' | 'HR' | 'Senior HR' | 'Admin';
  questions: InterviewQuestion[];
  maxScore?: number;
  isRequired: boolean;
}

export interface InterviewTemplate {
  _id: string;
  flowName: string;
  jobOpeningId: string | {
    _id: string;
    title: string;
    status: string;
  };
  description?: string;
  rounds: InterviewRound[];
  isActive: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInterviewTemplateRequest {
  flowName: string;
  jobOpeningId: string;
  description?: string;
  rounds: InterviewRound[];
}

export const interviewTemplateApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInterviewTemplates: builder.query<
      {
        success: boolean;
        data: {
          templates: InterviewTemplate[];
          pagination?: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { isActive?: boolean; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/interview-templates',
        params,
      }),
      providesTags: ['InterviewTemplate'],
    }),

    getInterviewFlowByJobId: builder.query<
      { success: boolean; data: { flow: InterviewTemplate | null } },
      string
    >({
      query: (jobId) => `/interview-templates/job/${jobId}`,
      providesTags: (result, error, jobId) => [
        { type: 'InterviewTemplate', id: `job-${jobId}` },
        'InterviewTemplate'
      ],
    }),

    getInterviewTemplateById: builder.query<
      { success: boolean; data: { template: InterviewTemplate } },
      string
    >({
      query: (id) => `/interview-templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'InterviewTemplate', id }],
    }),


    createInterviewTemplate: builder.mutation<
      { success: boolean; data: { template: InterviewTemplate }; message: string },
      CreateInterviewTemplateRequest
    >({
      query: (data) => ({
        url: '/interview-templates',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['InterviewTemplate'],
    }),

    updateInterviewTemplate: builder.mutation<
      { success: boolean; data: { template: InterviewTemplate }; message: string },
      { id: string; data: Partial<CreateInterviewTemplateRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/interview-templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'InterviewTemplate', id },
        'InterviewTemplate',
      ],
    }),

    deleteInterviewTemplate: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/interview-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['InterviewTemplate'],
    }),
  }),
});

export const {
  useGetInterviewTemplatesQuery,
  useGetInterviewTemplateByIdQuery,
  useGetInterviewFlowByJobIdQuery,
  useCreateInterviewTemplateMutation,
  useUpdateInterviewTemplateMutation,
  useDeleteInterviewTemplateMutation,
} = interviewTemplateApi;

