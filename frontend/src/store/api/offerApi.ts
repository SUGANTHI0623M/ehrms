import { apiSlice } from './apiSlice';
import { OfferStatus } from '@/utils/constants';

export interface Offer {
  _id: string;
  candidateId: string | {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
  };
  jobOpeningId?: string | {
    _id: string;
    title: string;
    department: string;
  };
  offerTemplate?: string;
  emailMethod?: 'without-esign' | 'with-esign';
  emailTemplate?: string;
  department?: string;
  offerOwner?: string | {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  salary: {
    amount: number;
    currency: string;
    frequency: 'Monthly' | 'Annual' | 'Hourly';
  };
  employmentType: 'Full-time' | 'Contract' | 'Internship' | 'Permanent' | 'Temporary';
  joiningDate: string;
  expiryDate: string;
  status: OfferStatus;
  offerLetterUrl?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  notes?: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  emailSent?: boolean;
  whatsappSent?: boolean;
  // Revision tracking fields
  previousOfferId?: string;
  isRevision?: boolean;
  revisionNumber?: number;
  revisionChanges?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOfferRequest {
  candidateId: string;
  jobOpeningId?: string;
  offerTemplateId?: string;
  offerTemplate?: string;
  emailMethod?: 'without-esign' | 'with-esign';
  emailTemplate?: string;
  department?: string;
  offerOwner?: string;
  salary: {
    amount: number;
    currency: string;
    frequency: 'Monthly' | 'Annual' | 'Hourly';
  };
  employmentType: 'Full-time' | 'Contract' | 'Internship' | 'Permanent' | 'Temporary';
  role?: 'Intern' | 'Employee';
  joiningDate: string;
  expiryDate: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  notes?: string;
}

export const offerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOffers: builder.query<
      {
        success: boolean;
        data: {
          offers: Offer[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { status?: string; candidateId?: string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/offers',
        params,
      }),
      providesTags: ['Offer'],
    }),

    getOfferById: builder.query<
      { success: boolean; data: { offer: Offer } },
      string
    >({
      query: (id) => `/offers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Offer', id }],
    }),

    getOfferByCandidateId: builder.query<
      { success: boolean; data: { offer: Offer } },
      string
    >({
      query: (candidateId) => `/offers/candidate/${candidateId}`,
      providesTags: (result, error, candidateId) => [
        { type: 'Offer', id: `CANDIDATE-${candidateId}` },
        'Offer'
      ],
    }),

    getAllOffersByCandidateId: builder.query<
      { success: boolean; data: { offers: Offer[] } },
      string
    >({
      query: (candidateId) => `/offers/candidate/${candidateId}/all`,
      providesTags: (result, error, candidateId) => [
        { type: 'Offer', id: `CANDIDATE-${candidateId}-ALL` },
        'Offer'
      ],
    }),

    createOffer: builder.mutation<
      { success: boolean; data: { offer: Offer }; message: string },
      CreateOfferRequest
    >({
      query: (data) => ({
        url: '/offers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Offer', 'Candidate'],
    }),

    updateOffer: builder.mutation<
      { success: boolean; data: { offer: Offer }; message: string },
      { id: string; data: Partial<CreateOfferRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/offers/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Offer', id }, 'Offer'],
    }),

    sendOffer: builder.mutation<
      { success: boolean; data: { offer: Offer }; message: string },
      string
    >({
      query: (id) => ({
        url: `/offers/${id}/send`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Offer', id },
        'Offer',
        'Candidate'
      ],
    }),

    acceptOffer: builder.mutation<
      { success: boolean; data: { offer: Offer }; message: string },
      string
    >({
      query: (id) => ({
        url: `/offers/${id}/accept`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Offer', id },
        'Offer',
        'Candidate'
      ],
    }),

    rejectOffer: builder.mutation<
      { success: boolean; data: { offer: Offer }; message: string },
      { id: string; rejectionReason?: string }
    >({
      query: ({ id, rejectionReason }) => ({
        url: `/offers/${id}/reject`,
        method: 'POST',
        body: { rejectionReason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Offer', id },
        'Offer',
        'Candidate'
      ],
    }),

    previewOffer: builder.query<
      { success: boolean; data: { preview: any; offer: Offer } },
      string
    >({
      query: (id) => `/offers/${id}/preview`,
      providesTags: (result, error, id) => [{ type: 'Offer', id }],
    }),

    sendOfferEmail: builder.mutation<
      { success: boolean; data: { offer: Offer }; message: string },
      string
    >({
      query: (id) => ({
        url: `/offers/${id}/send-email`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Offer', id },
        'Offer',
        'Candidate'
      ],
    }),

    sendOfferWhatsApp: builder.mutation<
      { success: boolean; data: { offer: Offer; messageId?: string }; message: string },
      string
    >({
      query: (id) => ({
        url: `/offers/${id}/send-whatsapp`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Offer', id },
        'Offer',
        'Candidate'
      ],
    }),

    sendOfferMultiChannel: builder.mutation<
      { success: boolean; data: { offer: Offer; results: any }; message: string },
      { id: string; sendEmail?: boolean; sendWhatsApp?: boolean }
    >({
      query: ({ id, sendEmail, sendWhatsApp }) => ({
        url: `/offers/${id}/send`,
        method: 'POST',
        body: { sendEmail, sendWhatsApp },
      }),
      invalidatesTags: (result, error, { id }) => {
        const candidateId = result?.data?.offer?.candidateId;
        const candidateIdStr = typeof candidateId === 'object' ? candidateId._id : candidateId;
        return [
          { type: 'Offer', id },
          'Offer',
          'Candidate',
          { type: 'Offer', id: `CANDIDATE-${candidateIdStr}` }, // Invalidate candidate-specific offer query
        ];
      },
    }),

    uploadOfferDocuments: builder.mutation<
      { success: boolean; data: { offer: Offer; uploadedCount: number }; message: string },
      { id: string; files: File[] }
    >({
      query: ({ id, files }) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('documents', file);
        });
        return {
          url: `/offers/${id}/upload-documents`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Offer', id },
        'Offer'
      ],
    }),

    generateOfferLetterPreview: builder.query<
      {
        success: boolean;
        data: {
          offerLetterContent: string;
          business: {
            name: string;
            logo: string;
            address: any;
          };
          candidate: any;
          jobOpening: any;
          offer: Offer;
        };
      },
      string
    >({
      query: (id) => `/offers/${id}/generate-preview`,
      providesTags: (result, error, id) => [{ type: 'Offer', id }],
    }),

    moveToOnboarding: builder.mutation<
      {
        success: boolean;
        data: { offer: Offer; candidate: any; onboarding: any };
        message: string;
      },
      string
    >({
      query: (id) => ({
        url: `/offers/${id}/move-to-onboarding`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Offer', id },
        'Offer',
        'Candidate',
        'Onboarding',
      ],
    }),

    createRevisedOffer: builder.mutation<
      { success: boolean; data: { offer: Offer }; message: string },
      { id: string; revisionChanges?: string }
    >({
      query: ({ id, revisionChanges }) => ({
        url: `/offers/${id}/revise`,
        method: 'POST',
        body: { revisionChanges },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Offer', id },
        'Offer',
        'Candidate',
      ],
    }),
  }),
});

export const {
  useGetOffersQuery,
  useGetOfferByIdQuery,
  useGetOfferByCandidateIdQuery,
  useGetAllOffersByCandidateIdQuery,
  useCreateOfferMutation,
  useCreateRevisedOfferMutation,
  useUpdateOfferMutation,
  useSendOfferMutation,
  useAcceptOfferMutation,
  useRejectOfferMutation,
  usePreviewOfferQuery,
  useSendOfferEmailMutation,
  useSendOfferWhatsAppMutation,
  useSendOfferMultiChannelMutation,
  useUploadOfferDocumentsMutation,
  useGenerateOfferLetterPreviewQuery,
  useMoveToOnboardingMutation,
} = offerApi;

