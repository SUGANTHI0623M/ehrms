import { apiSlice } from './apiSlice';

export interface DocumentRequirement {
  _id: string;
  name: string;
  type: 'form' | 'document';
  required: boolean;
  description?: string;
  order: number;
  businessId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentRequirementRequest {
  name: string;
  type: 'form' | 'document';
  required: boolean;
  description?: string;
  order: number;
  isActive?: boolean;
}

export interface UpdateDocumentRequirementRequest extends CreateDocumentRequirementRequest {
  _id: string;
}

export const documentRequirementsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDocumentRequirements: builder.query<
      {
        success: boolean;
        data: {
          requirements: DocumentRequirement[];
        };
      },
      void
    >({
      query: () => '/document-requirements',
      providesTags: ['DocumentRequirements'],
    }),

    createDocumentRequirement: builder.mutation<
      {
        success: boolean;
        data: {
          requirement: DocumentRequirement;
        };
        message: string;
      },
      CreateDocumentRequirementRequest
    >({
      query: (data) => ({
        url: '/document-requirements',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['DocumentRequirements'],
    }),

    updateDocumentRequirement: builder.mutation<
      {
        success: boolean;
        data: {
          requirement: DocumentRequirement;
        };
        message: string;
      },
      UpdateDocumentRequirementRequest
    >({
      query: ({ _id, ...data }) => ({
        url: `/document-requirements/${_id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['DocumentRequirements'],
    }),

    deleteDocumentRequirement: builder.mutation<
      {
        success: boolean;
        message: string;
      },
      string
    >({
      query: (id) => ({
        url: `/document-requirements/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DocumentRequirements'],
    }),

    initializeDefaultRequirements: builder.mutation<
      {
        success: boolean;
        data: {
          requirements: DocumentRequirement[];
        };
        message: string;
      },
      void
    >({
      query: () => ({
        url: '/document-requirements/initialize-defaults',
        method: 'POST',
      }),
      invalidatesTags: ['DocumentRequirements'],
    }),
  }),
});

export const {
  useGetDocumentRequirementsQuery,
  useCreateDocumentRequirementMutation,
  useUpdateDocumentRequirementMutation,
  useDeleteDocumentRequirementMutation,
  useInitializeDefaultRequirementsMutation,
} = documentRequirementsApi;

