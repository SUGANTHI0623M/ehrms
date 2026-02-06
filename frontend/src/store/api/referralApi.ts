import { apiSlice } from './apiSlice';

export interface ReferralCandidate {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobReferredFor: {
    _id: string;
    title: string;
    department: string;
  } | null;
  referredBy: {
    _id: string;
    name: string;
    email: string;
  } | null;
  referralDate: string;
  status: string;
}

export interface ReferralLink {
  _id: string;
  token: string;
  staffId: string;
  companyId: string;
  isActive: boolean;
  referralCount: number;
  createdAt: string;
}

import { CandidateFormData } from './candidateFormApi';

export interface ReferralFormData extends CandidateFormData {
  // Referral-specific metadata
  referralMetadata?: {
    relationship?: string;
    knownPeriod?: string;
    notes?: string;
  };
}

export interface JobOpening {
  _id: string;
  title: string;
  department: string;
}

export const referralApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Generate referral link
    generateReferralLink: builder.mutation<
      {
        success: boolean;
        data: {
          referralLink: ReferralLink;
          publicUrl: string;
          token: string;
        };
      },
      void
    >({
      query: () => ({
        url: '/referrals/generate-link',
        method: 'POST',
      }),
      invalidatesTags: ['Referral'],
    }),

    // Get referral candidates list
    getReferralCandidates: builder.query<
      {
        success: boolean;
        data: {
          candidates: ReferralCandidate[];
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
        url: '/referrals/candidates',
        params,
      }),
      providesTags: ['Referral'],
    }),

    // Get referral link by token (public)
    getReferralLinkByToken: builder.query<
      {
        success: boolean;
        data: {
          referralLink: {
            token: string;
            staffId: string;
            companyId: string;
          };
          jobOpenings: JobOpening[];
          referrerInfo?: {
            name: string;
            email: string;
          };
        };
      },
      { token: string; staffId: string; companyId: string }
    >({
      query: ({ token, staffId, companyId }) => ({
        url: `/referrals/public/${token}?staffId=${staffId}&companyId=${companyId}`,
      }),
    }),

    // Submit referral form (public)
    submitReferralForm: builder.mutation<
      {
        success: boolean;
        data: {
          candidate: any;
          userAccount?: any;
          message: string;
        };
      },
      {
        token: string;
        staffId: string;
        companyId: string;
        formData: CandidateFormData;
        referralMetadata?: {
          relationship?: string;
          knownPeriod?: string;
          notes?: string;
        };
      }
    >({
      query: ({ token, staffId, companyId, formData, referralMetadata }) => ({
        url: `/referrals/public/${token}/submit?staffId=${staffId}&companyId=${companyId}`,
        method: 'POST',
        body: {
          ...formData,
          referralMetadata,
        },
      }),
    }),
  }),
});

export const {
  useGenerateReferralLinkMutation,
  useGetReferralCandidatesQuery,
  useGetReferralLinkByTokenQuery,
  useSubmitReferralFormMutation,
} = referralApi;

