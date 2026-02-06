import { apiSlice } from './apiSlice';
import { CandidateStatus, CandidateSource } from '@/utils/constants';

export interface Candidate {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode?: string;
  dateOfBirth?: string;
  gender?: string;
  currentCity?: string;
  preferredJobLocation?: string;
  position: string;
  primarySkill: string;
  status: CandidateStatus;
  displayStatus?: string; // Computed display status (RE_APPLIED, APPLIED_FOR_MULTIPLE_JOBS, etc.)
  applicationCount?: number; // Number of different jobs applied for
  appliedJobs?: string[]; // List of job titles applied for (for tooltip)
  source: CandidateSource;
  referrerId?: string | {
    _id: string;
    name: string;
    email: string;
  };
  referralMetadata?: {
    relationship?: string;
    knownPeriod?: string;
    notes?: string;
  };
  jobId: string | {
    _id: string;
    title: string;
    department: string;
    interviewTemplateId?: string;
    interviewRounds?: Array<{
      roundNumber: number;
      roundName: string;
      questions?: any[];
    }>;
  };
  expectedJoining?: string;
  totalYearsOfExperience?: number;
  currentCompany?: string;
  currentJobTitle?: string;
  employmentType?: 'Full-time' | 'Contract' | 'Internship';
  education: Array<{
    qualification: string;
    courseName: string;
    institution: string;
    university: string;
    yearOfPassing: string;
    percentage?: string;
    cgpa?: string;
  }>;
  experience: Array<{
    company: string;
    role: string;
    designation: string;
    durationFrom: string;
    durationTo?: string;
    keyResponsibilities?: string;
    reasonForLeaving?: string;
  }>;
  documents: Array<{
    type: string;
    url: string;
    name: string;
  }>;
  resume?: {
    url: string;
    name: string;
    uploadedAt: string;
  };
  skills: string[];
  location?: string;
  currentInterviewTemplateId?: string | {
    _id: string;
    templateName: string;
    totalRounds: number;
  };
  currentRound?: number;
  currentJobStage?: number; // Current job interview stage (from job's interviewRounds)
  completedRounds?: number[];
  completedJobStages?: number[]; // Array of completed job stage numbers
  userId?: string;
  businessId?: string;
  createdBy?: {
    name: string;
    email?: string;
    role?: string;
  };
  hiredForOtherJob?: {
    jobTitle: string;
    hiredDate?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateStats {
  total: number;
  hired: number;
  inPipeline: number;
  rejected: number;
  interviewAppointments: number;
  round1: number;
  round2: number;
  round3: number;
  round4: number;
  selected: number;
  offerLetter: number;
  documentVerification: number;
  backgroundVerification: number;
}

export interface CreateCandidateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  position: string;
  primarySkill: string;
  education?: Candidate['education'];
  experience?: Candidate['experience'];
  documents?: Candidate['documents'];
  skills?: string[];
  location?: string;
}

export const candidateApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCandidates: builder.query<
      {
        success: boolean;
        data: {
          candidates: Candidate[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { search?: string; status?: string; position?: string; jobId?: string; source?: string; startDate?: string; endDate?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/candidates',
        params,
      }),
      // Normalize query args to ensure consistent cache keys
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        // Always serialize to the same format regardless of undefined values
        const normalized: any = {
          page: queryArgs?.page || 1,
          limit: queryArgs?.limit || 10,
        };
        if (queryArgs?.search) normalized.search = queryArgs.search;
        if (queryArgs?.status) normalized.status = queryArgs.status;
        if (queryArgs?.position) normalized.position = queryArgs.position;
        if (queryArgs?.jobId) normalized.jobId = queryArgs.jobId;
        if (queryArgs?.source) normalized.source = queryArgs.source;
        if (queryArgs?.startDate) normalized.startDate = queryArgs.startDate;
        if (queryArgs?.endDate) normalized.endDate = queryArgs.endDate;
        // Use a consistent key format
        return `${endpointName}(${JSON.stringify(normalized)})`;
      },
      // Always use fresh data, don't merge with cache
      merge: (currentCache, newItems) => {
        return newItems;
      },
      providesTags: ['Candidate'],
      // Keep unused data for a short time to prevent flickering
      keepUnusedDataFor: 30,
    }),
    getCandidateStats: builder.query<
      { success: boolean; data: { stats: CandidateStats } },
      void
    >({
      query: () => '/candidates/stats',
      providesTags: ['Candidate'],
    }),
    getCandidateById: builder.query<
      { success: boolean; data: { candidate: Candidate } },
      string
    >({
      query: (id) => `/candidates/${id}`,
      providesTags: (result, error, id) => [{ type: 'Candidate', id }],
    }),
    createCandidate: builder.mutation<
      { success: boolean; data: { candidate: Candidate } },
      CreateCandidateRequest
    >({
      query: (candidateData) => ({
        url: '/candidates',
        method: 'POST',
        body: candidateData,
      }),
      invalidatesTags: ['Candidate'],
    }),
    updateCandidate: builder.mutation<
      { success: boolean; data: { candidate: Candidate } },
      { id: string; data: Partial<CreateCandidateRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/candidates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Candidate', id }, 'Candidate'],
    }),
    updateCandidateStatus: builder.mutation<
      { success: boolean; data: { candidate: Candidate } },
      { id: string; status: Candidate['status'] }
    >({
      query: ({ id, status }) => ({
        url: `/candidates/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Candidate', id }, 'Candidate'],
    }),
    deleteCandidate: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/candidates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Candidate'],
    }),
    getCandidatesForInterview: builder.query<
      {
        success: boolean;
        data: {
          candidates: (Candidate & { scheduledInterview?: any })[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { interviewerRole: 'HR' | 'Manager'; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/candidates/for-interview',
        params,
      }),
      providesTags: ['Candidate', 'Interview'],
    }),
    createDummySelectedCandidate: builder.mutation<
      { success: boolean; data: { candidate: Candidate }; message: string },
      void
    >({
      query: () => ({
        url: '/candidates/create-dummy-selected',
        method: 'POST',
      }),
      invalidatesTags: ['Candidate'],
    }),
    getCandidatesForRound: builder.query<
      {
        success: boolean;
        data: {
          candidates: (Candidate & { scheduledInterview?: any })[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { roundNumber: number | string; search?: string; page?: number; limit?: number }
    >({
      query: ({ roundNumber, ...params }) => ({
        url: `/candidates/round/${roundNumber}`,
        params,
      }),
      providesTags: (result, error, { roundNumber }) => [
        { type: 'Candidate', id: `ROUND_${roundNumber}` },
        'Candidate',
        'Interview'
      ],
    }),
    getSelectedCandidates: builder.query<
      {
        success: boolean;
        data: {
          candidates: Candidate[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/candidates/selected/all',
        params,
      }),
      providesTags: ['Candidate', 'Interview'],
    }),
    moveCandidateToInterview: builder.mutation<
      { success: boolean; data: any },
      { candidateId: string; jobId: string }
    >({
      query: ({ candidateId, jobId }) => ({
        url: `/candidates/${candidateId}/move-to-interview`,
        method: 'POST',
        body: { jobId },
      }),
      invalidatesTags: ['Candidate', 'Interview'],
    }),
    switchCandidateJob: builder.mutation<
      { success: boolean; data: any },
      { candidateId: string; newJobId: string }
    >({
      query: ({ candidateId, newJobId }) => ({
        url: `/candidates/${candidateId}/switch-job`,
        method: 'POST',
        body: { newJobId },
      }),
      invalidatesTags: ['Candidate', 'Interview'],
    }),
    getAvailableJobsForSwitch: builder.query<
      { success: boolean; data: any[] },
      string
    >({
      query: (candidateId) => `/candidates/${candidateId}/available-jobs`,
    }),
  }),
});

export const {
  useGetCandidatesQuery,
  useGetCandidateStatsQuery,
  useGetCandidateByIdQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useUpdateCandidateStatusMutation,
  useDeleteCandidateMutation,
  useGetCandidatesForInterviewQuery,
  useMoveCandidateToInterviewMutation,
  useSwitchCandidateJobMutation,
  useGetAvailableJobsForSwitchQuery,
  useCreateDummySelectedCandidateMutation,
  useGetCandidatesForRoundQuery,
  useGetSelectedCandidatesQuery,
} = candidateApi;

// Reject candidate mutation - added to existing endpoints
export const rejectCandidateApi = candidateApi.injectEndpoints({
  endpoints: (builder) => ({
    rejectCandidate: builder.mutation<
      {
        success: boolean;
        data: {
          candidate: Candidate;
          rejectionReason: string;
          notes?: string | null;
        };
        message: string
      },
      { candidateId: string; rejectionReason: string; notes?: string }
    >({
      query: ({ candidateId, rejectionReason, notes }) => ({
        url: `/candidates/${candidateId}/reject`,
        method: 'POST',
        body: { rejectionReason, notes },
      }),
      invalidatesTags: (result, error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        'Candidate',
        'Interview',
      ],
    }),
  }),
  overrideExisting: true,
});

export const { useRejectCandidateMutation } = rejectCandidateApi;

// Upload candidate document mutation
export const uploadCandidateDocumentApi = candidateApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadCandidateDocument: builder.mutation<
      {
        success: boolean;
        data: {
          candidate: Candidate;
          documentUrl: string;
        };
        message: string;
      },
      { candidateId: string; documentType: string; file: File }
    >({
      query: ({ candidateId, documentType, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);
        return {
          url: `/candidates/${candidateId}/documents/upload`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { candidateId }) => [
        { type: 'Candidate', id: candidateId },
        'Candidate',
      ],
    }),
  }),
  overrideExisting: true,
});

export const { useUploadCandidateDocumentMutation } = uploadCandidateDocumentApi;

