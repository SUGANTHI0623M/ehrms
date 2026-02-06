import { apiSlice } from './apiSlice';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: string;
  // Company registration fields
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
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
    login: builder.mutation<{ success: boolean; data: AuthResponse }, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<{ success: boolean; data: AuthResponse }, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
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

