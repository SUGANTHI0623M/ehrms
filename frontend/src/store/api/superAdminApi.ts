import { apiSlice } from './apiSlice';

// ==================== TYPES ====================

export interface DashboardStats {
  companies: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    newToday: number;
    newThisMonth: number;
    monthlyGrowth: number;
  };
  users: {
    total: number;
    active: number;
    managers: number;
  };
  subscriptions: {
    byPlan: Array<{ _id: string; count: number; active: number }>;
    byStatus: Array<{ _id: string; count: number }>;
    expired: number;
    upcomingRenewals: number;
  };
  revenue: {
    totalMonthly: number;
    byPlan: Array<{
      plan: string;
      activeCompanies: number;
      totalCompanies: number;
      monthlyRevenue: number;
    }>;
    estimatedAnnual: number;
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
  planType?: 'trial' | 'standard' | 'premium';
  subscriptionPlan?: string;
  subscriptionPlanId?: string;
  subscriptionStatus: 'active' | 'suspended' | 'expired' | 'trial' | 'cancelled';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionRenewalDate?: string;
  trial?: {
    isTrial: boolean;
    trialStartDate?: string;
    trialEndDate?: string;
  };
  userLimits?: {
    maxAdmins: number;
    maxRecruiters: number;
    maxManagers: number;
  };
  usage?: {
    currentAdmins: number;
    currentRecruiters: number;
    currentManagers: number;
  };
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt?: string;
  suspendedReason?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  managerCount?: number;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  updatedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreateCompanyRequest {
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
  subscriptionPlan?: string;
  subscriptionPlanId?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  subscriptionPlan?: string;
  subscriptionPlanId?: string;
  subscriptionStatus?: 'active' | 'suspended' | 'expired' | 'trial' | 'cancelled';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionRenewalDate?: string;
  isActive?: boolean;
  isSuspended?: boolean;
}

export interface CompaniesResponse {
  companies: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  status: 'active' | 'inactive';
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  trialPeriodDays: number;
  features: {
    recruitment: boolean;
    performance: boolean;
    payroll: boolean;
    lms: boolean;
    assetManagement: boolean;
    integrations: boolean;
    advancedAnalytics: boolean;
    customRolesPermissions: boolean;
    maxUsers: number;
    maxManagers: number;
    maxJobPostings: number;
    maxCandidatesPerMonth: number;
    maxStorage: number;
    apiRateLimit: number;
    whatsappNotificationLimit: number;
    voiceNotificationLimit: number;
    support: 'basic' | 'priority' | 'dedicated';
  };
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  companiesUsingPlan?: number;
}

export interface PlatformSettings {
  general: {
    platformName: string;
    platformLogo?: string;
    defaultTimezone: string;
    defaultLocale: string;
    defaultSubscriptionPlan?: string;
  };
  subscription: {
    gracePeriodDays: number;
    autoRenewal: boolean;
    trialPeriodDays: number;
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      expiryDays: number;
    };
    sessionTimeout: number;
    loginRateLimit: {
      maxAttempts: number;
      windowMinutes: number;
    };
    apiRateLimit: {
      maxRequests: number;
      windowMinutes: number;
    };
  };
  billing: {
    currency: string;
    taxRate: number;
    invoicePrefix: string;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  performedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ==================== API SLICE ====================

export const superAdminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Dashboard
    getDashboardStats: builder.query<{ success: boolean; data: DashboardStats }, void>({
      query: () => '/super-admin/dashboard/stats',
      providesTags: ['Dashboard'],
    }),

    // Companies
    getCompanies: builder.query<
      { success: boolean; data: CompaniesResponse },
      {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        plan?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      }
    >({
      query: (params) => ({
        url: '/super-admin/companies',
        params,
      }),
      providesTags: ['User'],
    }),

    getCompanyById: builder.query<
      { success: boolean; data: { company: Company } },
      string
    >({
      query: (id) => `/super-admin/companies/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    createCompany: builder.mutation<
      { success: boolean; data: { company: Company } },
      CreateCompanyRequest
    >({
      query: (data) => ({
        url: '/super-admin/companies',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Dashboard'],
    }),

    updateCompany: builder.mutation<
      { success: boolean; data: { company: Company } },
      { id: string; data: UpdateCompanyRequest }
    >({
      query: ({ id, data }) => ({
        url: `/super-admin/companies/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        'User',
        'Dashboard',
        { type: 'User', id },
      ],
    }),

    deleteCompany: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/super-admin/companies/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User', 'Dashboard'],
    }),

    suspendCompany: builder.mutation<
      { success: boolean; message: string; data: { company: Company } },
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/super-admin/companies/${id}/suspend`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        'User',
        'Dashboard',
        { type: 'User', id },
      ],
    }),

    resumeCompany: builder.mutation<
      { success: boolean; message: string; data: { company: Company } },
      string
    >({
      query: (id) => ({
        url: `/super-admin/companies/${id}/resume`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        'User',
        'Dashboard',
        { type: 'User', id },
      ],
    }),

    activateCompany: builder.mutation<
      { success: boolean; message: string; data: { company: Company } },
      string
    >({
      query: (id) => ({
        url: `/super-admin/companies/${id}/activate`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        'User',
        'Dashboard',
        { type: 'User', id },
      ],
    }),

    deactivateCompany: builder.mutation<
      { success: boolean; message: string; data: { company: Company } },
      string
    >({
      query: (id) => ({
        url: `/super-admin/companies/${id}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        'User',
        'Dashboard',
        { type: 'User', id },
      ],
    }),

    resetTrial: builder.mutation<
      { success: boolean; message: string; data: { company: Company } },
      { id: string; trialEndDate?: string; days?: number }
    >({
      query: ({ id, ...body }) => ({
        url: `/super-admin/companies/${id}/reset-trial`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        'User',
        'Dashboard',
        { type: 'User', id },
      ],
    }),

    // Settings
    getPlatformSettings: builder.query<
      { success: boolean; data: { settings: PlatformSettings } },
      void
    >({
      query: () => '/super-admin/settings',
      providesTags: ['Settings'],
    }),

    updatePlatformSettings: builder.mutation<
      { success: boolean; data: { settings: PlatformSettings } },
      { data: Partial<PlatformSettings>; logoFile?: File }
    >({
      query: ({ data, logoFile }) => {
        // If logo file is provided, use FormData
        if (logoFile) {
          const formData = new FormData();
          formData.append('logo', logoFile);
          // Append other fields
          Object.keys(data).forEach(key => {
            const value = data[key as keyof PlatformSettings];
            if (value !== undefined && value !== null) {
              if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
                // For nested objects, stringify them
                formData.append(key, JSON.stringify(value));
              } else {
                formData.append(key, String(value));
              }
            }
          });
          return {
            url: '/super-admin/settings',
            method: 'PUT',
            body: formData,
          };
        }
        // Otherwise, use JSON
        return {
          url: '/super-admin/settings',
          method: 'PUT',
          body: data,
        };
      },
      invalidatesTags: ['Settings'],
    }),

    // Subscription Plans
    getSubscriptionPlans: builder.query<
      { success: boolean; data: { plans: SubscriptionPlan[] } },
      void
    >({
      query: () => '/super-admin/subscription-plans',
      providesTags: ['Settings'],
    }),

    getSubscriptionPlanById: builder.query<
      { success: boolean; data: { plan: SubscriptionPlan; companiesUsingPlan: number } },
      string
    >({
      query: (id) => `/super-admin/subscription-plans/${id}`,
      providesTags: (result, error, id) => [{ type: 'Settings', id }],
    }),

    createSubscriptionPlan: builder.mutation<
      { success: boolean; data: { plan: SubscriptionPlan } },
      Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt' | 'companiesUsingPlan'>
    >({
      query: (data) => ({
        url: '/super-admin/subscription-plans',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),

    updateSubscriptionPlan: builder.mutation<
      { success: boolean; data: { plan: SubscriptionPlan }; warnings?: string[] },
      { id: string; data: Partial<Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt' | 'companiesUsingPlan'>> }
    >({
      query: ({ id, data }) => ({
        url: `/super-admin/subscription-plans/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => ['Settings', { type: 'Settings', id }],
    }),

    assignPlanToCompany: builder.mutation<
      { success: boolean; message: string; data: { company: Company } },
      { companyId: string; planId: string; billingCycle?: 'monthly' | 'yearly'; startDate?: string }
    >({
      query: (data) => ({
        url: '/super-admin/subscription-plans/assign',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Settings'],
    }),

    extendCompanySubscription: builder.mutation<
      { success: boolean; message: string; data: { company: Company } },
      { companyId: string; months: number }
    >({
      query: (data) => ({
        url: '/super-admin/subscription-plans/extend',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Settings'],
    }),

    // Audit Logs
    getAuditLogs: builder.query<
      { success: boolean; data: AuditLogsResponse },
      {
        page?: number;
        limit?: number;
        action?: string;
        entityType?: string;
        startDate?: string;
        endDate?: string;
      }
    >({
      query: (params) => ({
        url: '/super-admin/audit-logs',
        params,
      }),
      providesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetCompaniesQuery,
  useGetCompanyByIdQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useSuspendCompanyMutation,
  useResumeCompanyMutation,
  useActivateCompanyMutation,
  useDeactivateCompanyMutation,
  useResetTrialMutation,
  useGetPlatformSettingsQuery,
  useUpdatePlatformSettingsMutation,
  useGetSubscriptionPlansQuery,
  useGetSubscriptionPlanByIdQuery,
  useCreateSubscriptionPlanMutation,
  useUpdateSubscriptionPlanMutation,
  useAssignPlanToCompanyMutation,
  useExtendCompanySubscriptionMutation,
  useGetAuditLogsQuery,
} = superAdminApi;

