import { apiSlice } from './apiSlice';

export interface JobOpening {
  _id: string;
  title: string;
  description: string;
  requirements: string[]; // Kept for legacy
  keyResponsibilities?: string; // New field
  skills: string[];
  location?: string;
  department?: string;
  workplaceType?: 'Remote' | 'On-site' | 'Hybrid' | 'OffShore'; // New field for workplace type
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  numberOfPositions: number;
  educationalQualification: string;
  experienceLevel?: 'Fresher' | 'Experienced' | 'Fresher / Experienced';
  minExperience?: number;
  maxExperience?: number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED' | 'INACTIVE';
  targetDate?: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    salaryType: 'Monthly' | 'Annual';
  };
  publicApplyLink?: string; // Shareable link for public job applications
  publicApplyEnabled: boolean; // Whether job can be shared/applied publicly
  interviewRounds?: Array<{
    roundNumber: number;
    roundName: string;
    enabled: boolean;
    assignedInterviewers: Array<string | {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    }>;
    assignedRole: 'HR' | 'Senior HR' | 'Recruiter' | 'Manager' | 'Admin';
    templateId?: string | {
      _id: string;
      templateName: string;
      interviewType: string;
    };
    questions?: Array<{
      questionText: string;
      questionType: 'text' | 'textarea' | 'dropdown' | 'rating' | 'scenario' | 'multiple-choice';
      options?: string[];
      isRequired: boolean;
      maxScore?: number;
    }>;
    maxScore?: number;
    isRequired: boolean;
    branchId?: string | {
      _id: string;
      branchName: string;
      branchCode: string;
    };
  }>;
  // Legacy field
  interviewStages?: Array<{
    stageNumber: number;
    stageName: string;
    assignedRole: 'HR' | 'Senior HR' | 'Manager' | 'Admin';
    templateId?: string | {
      _id: string;
      templateName: string;
      interviewType: string;
    };
    branchId?: string | {
      _id: string;
      branchName: string;
      branchCode: string;
    };
    isRequired: boolean;
  }>;
  branchId?: string | {
    _id: string;
    branchName: string;
    branchCode: string;
    address: any;
    city: string;
    state: string;
    country: string;
    isHeadOffice: boolean;
  };
  businessId: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  candidateCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobOpeningRequest {
  title: string;
  description: string;
  requirements?: string[];
  keyResponsibilities?: string;
  skills?: string[];
  location?: string;
  branchId?: string; // Job location branch
  workplaceType?: 'Remote' | 'On-site' | 'Hybrid' | 'OffShore';
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  numberOfPositions?: number;
  educationalQualification: string;
  experienceLevel: 'Fresher' | 'Experienced' | 'Fresher / Experienced';
  targetDate?: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  publicApplyEnabled?: boolean; // Enable job sharing for public applications
  interviewStages?: Array<{
    stageNumber: number;
    stageName: string;
    assignedRole: 'HR' | 'Senior HR' | 'Manager' | 'Admin';
    templateId?: string; // Optional Q&A template for this stage
    branchId?: string; // Interview location for this stage
    isRequired?: boolean;
  }>;
}

export const jobOpeningApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDepartments: builder.query<
      { success: boolean; data: { departments: { _id: string; name: string }[] } },
      void
    >({
      query: () => '/job-openings/departments/list',
      providesTags: ['JobOpening'],
    }),

    createDepartment: builder.mutation<
      { success: boolean; data: { department: { _id: string; name: string } }; message: string },
      { name: string }
    >({
      query: (data) => ({
        url: '/job-openings/departments/create',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['JobOpening'],
    }),

    getJobOpenings: builder.query<
      {
        success: boolean;
        data: {
          jobOpenings: JobOpening[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { status?: string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/job-openings',
        params,
      }),
      providesTags: ['JobOpening'],
    }),

    getJobOpeningById: builder.query<
      { success: boolean; data: { jobOpening: JobOpening } },
      string
    >({
      query: (id) => `/job-openings/${id}`,
      providesTags: (result, error, id) => [{ type: 'JobOpening', id }],
    }),

    getJobOpeningByPublicLink: builder.query<
      { success: boolean; data: { jobOpening: JobOpening } },
      string
    >({
      query: (link) => `/job-openings/public/${link}`,
    }),

    createJobOpening: builder.mutation<
      { success: boolean; data: { jobOpening: JobOpening }; message: string },
      CreateJobOpeningRequest
    >({
      query: (data) => ({
        url: '/job-openings',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['JobOpening'],
    }),

    updateJobOpening: builder.mutation<
      { success: boolean; data: { jobOpening: JobOpening }; message: string },
      { id: string; data: Partial<CreateJobOpeningRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/job-openings/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'JobOpening', id }, 'JobOpening'],
    }),

    publishJobOpening: builder.mutation<
      { success: boolean; data: { jobOpening: JobOpening }; message: string },
      string
    >({
      query: (id) => ({
        url: `/job-openings/${id}/publish`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'JobOpening', id }, 'JobOpening'],
    }),

    // Generate or regenerate public apply link for job sharing
    generatePublicApplyLink: builder.mutation<
      {
        success: boolean;
        data: {
          publicApplyLink: string;
          publicUrl: string;
          publicApplyEnabled: boolean;
        };
        message: string;
      },
      { id: string; regenerate?: boolean }
    >({
      query: ({ id, regenerate }) => ({
        url: `/job-openings/${id}/generate-link${regenerate ? '?regenerate=true' : ''}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'JobOpening', id }, 'JobOpening'],
    }),

    deleteJobOpening: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/job-openings/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JobOpening'],
    }),

    // Job Interview Flow endpoints
    getJobInterviewFlow: builder.query<
      {
        success: boolean;
        data: {
          job: {
            _id: string;
            title: string;
            interviewRounds: JobOpening['interviewRounds'];
          };
        };
      },
      string
    >({
      query: (jobId) => `/job-openings/${jobId}/interview-flow`,
      providesTags: (result, error, jobId) => [
        { type: 'JobOpening', id: jobId },
        { type: 'JobInterviewFlow', id: jobId },
      ],
    }),

    saveJobInterviewFlow: builder.mutation<
      {
        success: boolean;
        data: { job: JobOpening };
        message: string;
      },
      { jobId: string; interviewRounds: JobOpening['interviewRounds'] }
    >({
      query: ({ jobId, interviewRounds }) => ({
        url: `/job-openings/${jobId}/interview-flow`,
        method: 'PUT',
        body: { interviewRounds },
      }),
      invalidatesTags: (result, error, { jobId }) => [
        { type: 'JobOpening', id: jobId },
        { type: 'JobInterviewFlow', id: jobId },
        'JobOpening',
      ],
    }),

    getAvailableTemplatesForRound: builder.query<
      {
        success: boolean;
        data: {
          templates: Array<{
            _id: string;
            templateName: string;
            interviewType: string;
            description?: string;
          }>;
        };
      },
      { roundRole?: string }
    >({
      query: (params) => ({
        url: '/job-openings/interview-flow/templates',
        params,
      }),
      providesTags: ['InterviewTemplate'],
    }),

    getNextJobCode: builder.query<
      { success: boolean; data: { jobCode: string } },
      string
    >({
      query: (branchId) => `/job-openings/next-code/${branchId}`,
      keepUnusedDataFor: 0, // Don't cache this as it changes frequently
    }),

    getCandidatesByJobId: builder.query<
      {
        success: boolean;
        data: {
          candidates: Array<{
            _id: string;
            firstName: string;
            lastName: string;
            email: string;
            phone: string;
            status: string;
            currentJobStage?: number;
            createdAt: string;
            updatedAt: string;
          }>;
          total: number;
        };
      },
      string
    >({
      query: (jobId) => `/job-openings/${jobId}/candidates`,
      providesTags: (result, error, jobId) => [
        { type: 'JobOpening', id: jobId },
        'Candidate',
      ],
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useGetJobOpeningsQuery,
  useGetJobOpeningByIdQuery,
  useGetJobOpeningByPublicLinkQuery,
  useCreateJobOpeningMutation,
  useUpdateJobOpeningMutation,
  usePublishJobOpeningMutation,
  useGeneratePublicApplyLinkMutation,
  useDeleteJobOpeningMutation,
  useGetJobInterviewFlowQuery,
  useSaveJobInterviewFlowMutation,
  useGetAvailableTemplatesForRoundQuery,
  useGetNextJobCodeQuery, // Export the new hook
  useGetCandidatesByJobIdQuery,
} = jobOpeningApi;

// Public job application API (no auth required)
export const publicJobApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getJobByPublicLink: builder.query<
      {
        success: boolean;
        data: { jobOpening: JobOpening };
      },
      string
    >({
      query: (link) => `/job-openings/public/${link}`,
    }),
    submitPublicJobApplication: builder.mutation<
      {
        success: boolean;
        data: {
          candidate: any;
        };
        message: string;
      },
      { link: string; data: any }
    >({
      query: ({ link, data }) => ({
        url: `/job-openings/public/${link}/apply`,
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useGetJobByPublicLinkQuery,
  useSubmitPublicJobApplicationMutation,
} = publicJobApi;

