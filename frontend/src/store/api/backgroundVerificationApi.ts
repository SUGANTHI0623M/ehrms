import { apiSlice } from './apiSlice';
import { Candidate } from './candidateApi';
import { Offer } from './offerApi';

export type VerificationStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'CLEARED' | 'FAILED';
export type VerificationItemStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type DocumentCategory = 'PAN_CARD' | 'AADHAAR_CARD' | 'ADDRESS_PROOF' | 'IDENTITY_PROOF' | 'EDUCATIONAL_CERTIFICATES';

export interface VerificationDocument {
  url: string;
  name: string;
  uploadedAt: string;
  uploadedBy: string | {
    _id: string;
    name: string;
    email: string;
  };
}

export interface VerificationItem {
  category: DocumentCategory;
  status: VerificationItemStatus;
  documents: VerificationDocument[];
  remarks?: string;
  verifiedBy?: string | {
    _id: string;
    name: string;
    email: string;
  };
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface ContactVerification {
  type: 'PRIMARY' | 'SECONDARY';
  contactNumber: string;
  status: VerificationItemStatus;
  remarks?: string;
  verifiedBy?: string | {
    _id: string;
    name: string;
    email: string;
  };
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface AddressVerification {
  currentResidentialAddress: string;
  status: VerificationItemStatus;
  remarks?: string;
  verifiedBy?: string | {
    _id: string;
    name: string;
    email: string;
  };
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface BackgroundVerification {
  _id: string;
  candidateId: string | Candidate;
  offerId: string | Offer;
  jobOpeningId?: string;
  overallStatus: VerificationStatus;
  verificationItems: VerificationItem[];
  contactVerifications: ContactVerification[];
  addressVerification: AddressVerification;
  clearedAt?: string;
  clearedBy?: string | {
    _id: string;
    name: string;
    email: string;
  };
  failedAt?: string;
  failedBy?: string | {
    _id: string;
    name: string;
    email: string;
  };
  failureReason?: string;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackgroundVerificationCandidate extends Candidate {
  offer?: Offer;
  backgroundVerification?: {
    id: string;
    status: VerificationStatus;
    createdAt: string;
  } | null;
}

export interface UploadDocumentRequest {
  candidateId: string;
  category: DocumentCategory;
  file: File;
}

export interface UpdateContactInfoRequest {
  candidateId: string;
  primaryContact?: string;
  secondaryContact?: string;
  currentResidentialAddress?: string;
}

export interface VerifyItemRequest {
  candidateId: string;
  itemType: 'document' | 'contact' | 'address';
  itemCategory: DocumentCategory | 'PRIMARY' | 'SECONDARY';
  status: VerificationItemStatus;
  remarks?: string;
}

export interface ApproveRejectRequest {
  candidateId: string;
  action: 'APPROVE' | 'REJECT';
  remarks?: string;
}

export const backgroundVerificationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBackgroundVerificationCandidates: builder.query<
      {
        success: boolean;
        data: {
          candidates: BackgroundVerificationCandidate[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { page?: number; limit?: number; search?: string }
    >({
      query: (params) => ({
        url: '/background-verification/candidates',
        params,
      }),
      providesTags: ['BackgroundVerification', 'Candidate', 'Offer'],
    }),

    getBackgroundVerificationDetails: builder.query<
      {
        success: boolean;
        data: {
          candidate: Candidate;
          offer: Offer;
          backgroundVerification: BackgroundVerification;
        };
      },
      string
    >({
      query: (candidateId) => `/background-verification/candidate/${candidateId}`,
      providesTags: (result, error, candidateId) => [
        { type: 'BackgroundVerification', id: candidateId },
        'BackgroundVerification',
      ],
    }),

    uploadDocument: builder.mutation<
      {
        success: boolean;
        data: { verification: BackgroundVerification };
        message: string;
      },
      UploadDocumentRequest
    >({
      query: ({ candidateId, category, file }) => {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('category', category);

        return {
          url: `/background-verification/candidate/${candidateId}/upload`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { candidateId }) => [
        { type: 'BackgroundVerification', id: candidateId },
        'BackgroundVerification',
      ],
    }),

    updateContactInfo: builder.mutation<
      {
        success: boolean;
        data: { verification: BackgroundVerification };
        message: string;
      },
      UpdateContactInfoRequest
    >({
      query: ({ candidateId, ...data }) => ({
        url: `/background-verification/candidate/${candidateId}/contact-info`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { candidateId }) => [
        { type: 'BackgroundVerification', id: candidateId },
        'BackgroundVerification',
      ],
    }),

    verifyItem: builder.mutation<
      {
        success: boolean;
        data: { verification: BackgroundVerification };
        message: string;
      },
      VerifyItemRequest
    >({
      query: ({ candidateId, ...data }) => ({
        url: `/background-verification/candidate/${candidateId}/verify`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { candidateId }) => [
        { type: 'BackgroundVerification', id: candidateId },
        'BackgroundVerification',
      ],
    }),

    approveOrRejectVerification: builder.mutation<
      {
        success: boolean;
        data: { verification: BackgroundVerification };
        message: string;
      },
      ApproveRejectRequest
    >({
      query: ({ candidateId, ...data }) => ({
        url: `/background-verification/candidate/${candidateId}/approve-reject`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { candidateId }) => [
        { type: 'BackgroundVerification', id: candidateId },
        'BackgroundVerification',
        'Candidate',
      ],
    }),

    addLog: builder.mutation<
      {
        success: boolean;
        data: { log: any };
        message: string;
      },
      { candidateId: string; body: FormData }
    >({
      query: ({ candidateId, body }) => ({
        url: `/background-verification/candidate/${candidateId}/log`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { candidateId }) => [
        { type: 'BackgroundVerification', id: candidateId },
        'BackgroundVerification',
      ],
    }),

    notifyCandidateAddress: builder.mutation<
      {
        success: boolean;
        message: string;
      },
      { candidateId: string; message?: string }
    >({
      query: ({ candidateId, message }) => ({
        url: `/background-verification/candidate/${candidateId}/notify-address`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: (result, error, { candidateId }) => [
        { type: 'BackgroundVerification', id: candidateId },
        'BackgroundVerification',
      ],
    }),
  }),
});

export const {
  useGetBackgroundVerificationCandidatesQuery,
  useGetBackgroundVerificationDetailsQuery,
  useUploadDocumentMutation,
  useUpdateContactInfoMutation,
  useVerifyItemMutation,
  useApproveOrRejectVerificationMutation,
  useAddLogMutation,
  useNotifyCandidateAddressMutation,
} = backgroundVerificationApi;

