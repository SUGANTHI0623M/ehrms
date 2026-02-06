import { apiSlice } from './apiSlice';

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Business {
  _id: string;
  name: string;
  legalEntityType?: string;
  email: string;
  phone: string;
  logo?: string;
  taxId?: string;
  registrationNumber?: string;
  registeredAddress: BusinessAddress;
  address?: BusinessAddress; // Legacy field
  settings?: {
    attendance?: any;
    payroll?: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateBusinessRequest {
  name?: string;
  legalEntityType?: string;
  email?: string;
  phone?: string;
  logo?: string;
  taxId?: string;
  registrationNumber?: string;
  registeredAddress?: BusinessAddress;
}

export const businessApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get business details
    getBusiness: builder.query<
      { success: boolean; data: { business: Business } },
      void
    >({
      query: () => '/settings/business',
      providesTags: ['Settings'],
    }),

    // Update business details
    updateBusiness: builder.mutation<
      { success: boolean; data: { business: Business } },
      UpdateBusinessRequest
    >({
      query: (businessData) => ({
        url: '/settings/business',
        method: 'PUT',
        body: businessData,
      }),
      invalidatesTags: ['Settings'],
    }),

    // Upload business logo
    uploadBusinessLogo: builder.mutation<
      { success: boolean; data: { business: Business; logoUrl: string } },
      File
    >({
      query: (file) => {
        const formData = new FormData();
        formData.append('logo', file);
        return {
          url: '/settings/business/upload-logo',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetBusinessQuery,
  useUpdateBusinessMutation,
  useUploadBusinessLogoMutation,
} = businessApi;

