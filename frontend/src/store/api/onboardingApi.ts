import { apiSlice } from './apiSlice';

export const DOCUMENT_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
} as const;

export const ONBOARDING_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];
export type OnboardingStatus = typeof ONBOARDING_STATUS[keyof typeof ONBOARDING_STATUS];

export interface OnboardingDocument {
  _id: string;
  name: string;
  type: string;
  required: boolean;
  status: DocumentStatus;
  url?: string;
  uploadedAt?: string;
  reviewedAt?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  notes?: string;
}

export interface Onboarding {
  _id: string;
  staffId?: {
    _id: string;
    employeeId: string;
    name: string;
    email: string;
    phone: string;
    designation: string;
    department: string;
    joiningDate: string;
    userId?: {
      _id: string;
      name: string;
      email: string;
    };
  };
  candidateId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    jobId: string;
  };
  status: OnboardingStatus;
  documents: OnboardingDocument[];
  progress: number;
  startedAt?: string;
  completedAt?: string;
  businessId?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingStats {
  activeOnboarding: number;
  completed: number;
  pendingDocuments: number;
}

export interface UpdateDocumentStatusRequest {
  status: DocumentStatus;
  url?: string;
  notes?: string;
}

export const onboardingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOnboardingList: builder.query<
      {
        success: boolean;
        data: {
          onboardings: Onboarding[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { page?: number; limit?: number; status?: OnboardingStatus }
    >({
      query: (params) => ({
        url: '/onboarding',
        params,
      }),
      providesTags: ['Onboarding'],
    }),

    getOnboardingStats: builder.query<
      {
        success: boolean;
        data: OnboardingStats;
      },
      void
    >({
      query: () => '/onboarding/stats',
      providesTags: ['Onboarding'],
    }),

    getOnboardingByCurrentUser: builder.query<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
        };
      },
      void
    >({
      query: () => '/onboarding/my-onboarding',
      providesTags: ['Onboarding'],
    }),

    getAllOnboardingByCurrentUser: builder.query<
      {
        success: boolean;
        data: {
          onboardings: Onboarding[];
        };
      },
      void
    >({
      query: () => '/onboarding/my-onboarding/all',
      providesTags: ['Onboarding'],
    }),

    getOnboardingById: builder.query<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
        };
      },
      string
    >({
      query: (id) => {
        console.log('[API] Fetching onboarding by ID:', id);
        return `/onboarding/${id}`;
      },
      providesTags: (result, error, id) => [{ type: 'Onboarding', id }],
      // Force refetch when ID changes
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
    }),

    getOnboardingByStaffId: builder.query<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
        };
      },
      string
    >({
      query: (staffId) => `/onboarding/staff/${staffId}`,
      providesTags: (result, error, staffId) => [{ type: 'Onboarding', id: staffId }],
    }),

    initializeOnboarding: builder.mutation<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
        };
        message: string;
      },
      { staffId: string }
    >({
      query: (data) => ({
        url: '/onboarding/initialize',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Onboarding'],
    }),

    updateDocumentStatus: builder.mutation<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
        };
        message: string;
      },
      {
        onboardingId: string;
        documentId: string;
        data: UpdateDocumentStatusRequest;
      }
    >({
      query: ({ onboardingId, documentId, data }) => ({
        url: `/onboarding/${onboardingId}/documents/${documentId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Onboarding'],
    }),

    uploadOnboardingDocument: builder.mutation<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
          documentUrl: string;
        };
        message: string;
      },
      {
        onboardingId: string;
        documentId: string;
        file: File;
      }
    >({
      query: ({ onboardingId, documentId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/onboarding/${onboardingId}/documents/${documentId}/upload`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Onboarding'],
    }),

    batchUploadOnboardingDocuments: builder.mutation<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
          uploaded: Array<{ documentId: string; fileName: string; success: boolean }>;
          errors?: Array<{ documentId: string; fileName: string; error: string }>;
        };
        message: string;
      },
      {
        onboardingId: string;
        files: File[];
        documentIds: string[];
      }
    >({
      query: ({ onboardingId, files, documentIds }) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('documentIds', JSON.stringify(documentIds));
        return {
          url: `/onboarding/${onboardingId}/documents/batch-upload`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Onboarding'],
    }),

    createDummyCandidate: builder.mutation<
      {
        success: boolean;
        data: {
          candidate: any;
          staff: any;
          onboarding: Onboarding;
          defaultPassword: string;
        };
        message: string;
      },
      void
    >({
      query: () => ({
        url: '/onboarding/create-dummy-candidate',
        method: 'POST',
      }),
      invalidatesTags: ['Onboarding', 'Candidate', 'Staff'],
    }),

    approveOnboarding: builder.mutation<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
        };
        message: string;
      },
      { onboardingId: string }
    >({
      query: ({ onboardingId }) => ({
        url: `/onboarding/${onboardingId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['Onboarding'],
    }),

    removeDocument: builder.mutation<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
        };
        message: string;
      },
      { onboardingId: string; documentId: string }
    >({
      query: ({ onboardingId, documentId }) => ({
        url: `/onboarding/${onboardingId}/documents/${documentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Onboarding'],
    }),

    addDocument: builder.mutation<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
        };
        message: string;
      },
      { onboardingId: string; name: string; type: string; required?: boolean }
    >({
      query: ({ onboardingId, ...data }) => ({
        url: `/onboarding/${onboardingId}/documents`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Onboarding'],
    }),

    notifyCandidate: builder.mutation<
      {
        success: boolean;
        message: string;
      },
      { onboardingId: string }
    >({
      query: ({ onboardingId }) => ({
        url: `/onboarding/${onboardingId}/notify`,
        method: 'POST',
      }),
      invalidatesTags: ['Onboarding'],
    }),

    verifyDocument: builder.mutation<
      {
        success: boolean;
        data: {
          onboarding: Onboarding;
        };
        message: string;
      },
      { onboardingId: string; documentId: string; status: 'COMPLETED' | 'REJECTED'; notes?: string }
    >({
      query: ({ onboardingId, documentId, ...data }) => ({
        url: `/onboarding/${onboardingId}/documents/${documentId}/verify`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Onboarding'],
    }),
  }),
});

export const {
  useGetOnboardingListQuery,
  useGetOnboardingStatsQuery,
  useGetOnboardingByCurrentUserQuery,
  useGetAllOnboardingByCurrentUserQuery,
  useGetOnboardingByIdQuery,
  useGetOnboardingByStaffIdQuery,
  useInitializeOnboardingMutation,
  useUpdateDocumentStatusMutation,
  useUploadOnboardingDocumentMutation,
  useBatchUploadOnboardingDocumentsMutation,
  useCreateDummyCandidateMutation,
  useApproveOnboardingMutation,
  useRemoveDocumentMutation,
  useAddDocumentMutation,
  useNotifyCandidateMutation,
  useVerifyDocumentMutation,
} = onboardingApi;

