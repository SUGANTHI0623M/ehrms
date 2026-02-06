import { apiSlice } from './apiSlice';

export interface BranchAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface BranchGeofence {
  enabled: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface Branch {
  _id: string;
  branchName: string;
  branchCode: string;
  isHeadOffice: boolean;
  businessId: string;
  email: string;
  contactNumber: string;
  countryCode?: string;
  logo?: string;
  address: BranchAddress;
  status: 'ACTIVE' | 'INACTIVE';
  geofence?: BranchGeofence;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBranchRequest {
  branchName: string;
  branchCode?: string;
  isHeadOffice?: boolean;
  email: string;
  contactNumber: string;
  countryCode?: string;
  address: BranchAddress;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateBranchRequest {
  branchName?: string;
  branchCode?: string;
  isHeadOffice?: boolean;
  email?: string;
  contactNumber?: string;
  countryCode?: string;
  address?: BranchAddress;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const branchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all branches
    getBranches: builder.query<
      { success: boolean; data: { branches: Branch[] } },
      { status?: string; includeInactive?: boolean }
    >({
      query: (params) => ({
        url: '/branches',
        params,
      }),
      providesTags: ['Settings'],
    }),

    // Get active branches (for dropdowns)
    getActiveBranches: builder.query<
      { success: boolean; data: { branches: Branch[] } },
      void
    >({
      query: () => '/branches/active',
      providesTags: ['Settings'],
    }),

    // Get branch by ID
    getBranchById: builder.query<
      { success: boolean; data: { branch: Branch } },
      string
    >({
      query: (id) => `/branches/${id}`,
      providesTags: (result, error, id) => [{ type: 'Settings', id }],
    }),

    // Create branch
    createBranch: builder.mutation<
      { success: boolean; data: { branch: Branch } },
      CreateBranchRequest
    >({
      query: (branchData) => ({
        url: '/branches',
        method: 'POST',
        body: branchData,
      }),
      invalidatesTags: ['Settings'],
    }),

    // Update branch
    updateBranch: builder.mutation<
      { success: boolean; data: { branch: Branch } },
      { id: string; data: UpdateBranchRequest }
    >({
      query: ({ id, data }) => ({
        url: `/branches/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Settings', id },
        'Settings',
      ],
    }),

    // Delete branch
    deleteBranch: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/branches/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Settings'],
    }),

    // Upload branch logo
    uploadBranchLogo: builder.mutation<
      { success: boolean; data: { branch: Branch; logoUrl: string } },
      { id: string; file: File }
    >({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('logo', file);
        return {
          url: `/branches/${id}/upload-logo`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Settings', id },
        'Settings',
      ],
    }),

    // Get branch geofence settings
    getBranchGeofence: builder.query<
      { success: boolean; data: { branch: { _id: string; branchName: string; branchCode: string; geofence: BranchGeofence } } },
      string
    >({
      query: (id) => `/branches/${id}/geofence`,
      providesTags: (result, error, id) => [{ type: 'Settings', id }],
    }),

    // Update branch geofence settings
    updateBranchGeofence: builder.mutation<
      { success: boolean; data: { branch: Branch } },
      { id: string; geofence: BranchGeofence }
    >({
      query: ({ id, geofence }) => ({
        url: `/branches/${id}/geofence`,
        method: 'PUT',
        body: { geofence },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Settings', id },
        'Settings',
      ],
    }),
  }),
});

export const {
  useGetBranchesQuery,
  useGetActiveBranchesQuery,
  useGetBranchByIdQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  useUploadBranchLogoMutation,
  useGetBranchGeofenceQuery,
  useUpdateBranchGeofenceMutation,
} = branchApi;

