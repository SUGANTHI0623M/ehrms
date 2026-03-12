import { apiSlice } from './apiSlice';

export interface LoginRequest {
  email: string;
  password: string;
  otp?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  countryCode?: string;
  role?: string;
  // Company registration fields
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyCountryCode?: string;
  companyLogo?: string | File;
  companyAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  logo?: string;
  isActive: boolean;
  subscriptionPlan?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  countryCode?: string;
  companyId?: string | null;
  company?: Company | null;
  isActive: boolean;
  permissions?: Array<{
    module: string;
    actions: string[];
  }>;
  roleId?: {
    _id: string;
    name: string;
    description?: string;
    permissions: Array<{
      module: string;
      actions: string[];
    }>;
    isSystemRole?: boolean;
  };
  subRole?: 'Senior HR' | 'Junior HR' | 'Manager';
  sidebarPermissions?: string[];
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  token?: string; // For backward compatibility
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<{ success: boolean; data: AuthResponse; requiresOTP?: boolean; message?: string }, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<{ success: boolean; data: AuthResponse }, RegisterRequest>({
      query: (userData) => {
        // Check if logo is a File (needs FormData)
        const hasLogoFile = userData.companyLogo instanceof File;
        
        if (hasLogoFile) {
          // Use FormData for file upload
          const formData = new FormData();
          formData.append('name', userData.name);
          formData.append('email', userData.email);
          formData.append('password', userData.password);
          if (userData.phone) formData.append('phone', userData.phone);
          if (userData.countryCode) formData.append('countryCode', userData.countryCode);
          if (userData.role) formData.append('role', userData.role);
          if (userData.companyName) formData.append('companyName', userData.companyName);
          if (userData.companyEmail) formData.append('companyEmail', userData.companyEmail);
          if (userData.companyPhone) formData.append('companyPhone', userData.companyPhone);
          if (userData.companyCountryCode) formData.append('companyCountryCode', userData.companyCountryCode);
          if (userData.companyLogo instanceof File) {
            formData.append('companyLogo', userData.companyLogo);
          }
          if (userData.companyAddress) {
            // Send address as JSON string for easier parsing
            formData.append('companyAddress', JSON.stringify(userData.companyAddress));
          }
          
          return {
            url: '/auth/register',
            method: 'POST',
            body: formData,
          };
        } else {
          // Use JSON for regular registration
          return {
            url: '/auth/register',
            method: 'POST',
            body: userData,
          };
        }
      },
    }),
    logout: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    getCurrentUser: builder.query<{ success: boolean; data: { user: User } }, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<
      { success: boolean; data: { user: User } },
      { name?: string; phone?: string }
    >({
      query: (updates) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['User'],
    }),
    forgotPassword: builder.mutation<
      { success: boolean; message: string },
      { email: string }
    >({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
    verifyOTP: builder.mutation<
      { success: boolean; message: string },
      { email: string; otp: string }
    >({
      query: (data) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<
      { success: boolean; message: string },
      { email: string; otp: string; newPassword: string }
    >({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
    refreshToken: builder.mutation<
      { success: boolean; data: { accessToken: string } },
      void
    >({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
    }),
    getPlatformLogo: builder.query<
      { success: boolean; data: { logo: string | null } },
      void
    >({
      query: () => '/auth/platform-logo',
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useVerifyOTPMutation,
  useResetPasswordMutation,
  useRefreshTokenMutation,
  useGetPlatformLogoQuery,
} = authApi;

