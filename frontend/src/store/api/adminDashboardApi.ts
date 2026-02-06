import { apiSlice } from './apiSlice';

export interface RecruitmentAnalytics {
  totalJobOpenings: number;
  totalCandidates: number;
  candidatesByStatus: {
    Applied: number;
    Screening: number;
    Shortlisted: number;
    Interview: number;
    Offer: number;
    Hired: number;
    Rejected: number;
  };
  upcomingInterviews: Array<{
    name: string;
    position: string;
    status: string;
    updatedAt: string;
  }>;
  offerLettersGenerated: number;
  hiringConversionRate: number;
  avgTimeToHire: number;
}

export interface StaffAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  employeesByDepartment: Array<{
    department: string;
    count: number;
  }>;
  employeesByRole: Array<{
    role: string;
    count: number;
  }>;
  recentOnboardings: number;
  salaryOverview: {
    totalGross: number;
    totalNet: number;
    averageGross: number;
    averageNet: number;
    employeeCount: number;
  };
  attritionCount: number;
}

export interface PerformanceAnalytics {
  totalGoals: number;
  goalsByStatus: {
    pending: number;
    approved: number;
    completed: number;
    overdue: number;
  };
  goalProgress: {
    avgProgress: number;
    totalProgress: number;
  };
  selfReviewsSubmitted: number;
  managerReviewsPending: number;
  hrReviewsPending: number;
  kraKpiCompletion: number;
  complianceStatus: {
    complianceRate: string;
    goalsWithReviews: number;
    totalGoals: number;
  };
}

export interface PayrollAnalytics {
  payrollCyclesCompleted: number;
  payrollPending: number;
  payrollInProgress: number;
  attendanceSummary: {
    present: number;
    absent: number;
    late: number;
  };
  totalPayrollProcessed: number;
  reimbursements: {
    submitted: number;
    approved: number;
    pending: number;
  };
}

export interface LMSAnalytics {
  totalCourses: number;
  activeLearners: number;
  courseCompletionRate: number;
  liveSessionsScheduled: number;
  quizStats: {
    totalQuizzes: number;
    totalAttempts: number;
    averageScore: number;
  };
}

export interface AssetsAnalytics {
  totalAssetTypes: number;
  totalAssets: number;
  allocatedAssets: number;
  unallocatedAssets: number;
  assetsByStatus: {
    Working: number;
    'Under Maintenance': number;
    Damaged: number;
    Retired: number;
  };
}

export interface PendingRequests {
  leaves: number;
  loans: number;
  expenses: number;
  payslipRequests: number;
}

export interface AdminDashboardData {
  recruitment: RecruitmentAnalytics;
  staff: StaffAnalytics;
  performance: PerformanceAnalytics;
  payroll: PayrollAnalytics;
  lms: LMSAnalytics;
  assets: AssetsAnalytics;
  pendingRequests?: PendingRequests;
}

export interface AdminDashboardParams {
  department?: string;
  status?: string;
}

export const adminDashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<
      {
        success: boolean;
        data: AdminDashboardData;
      },
      AdminDashboardParams | void
    >({
      query: (params) => {
        // Normalize params to ensure consistent cache keys
        // Only include defined, non-empty values
        const normalizedParams: AdminDashboardParams = {};
        if (params?.department && params.department !== 'all') {
          normalizedParams.department = params.department;
        }
        if (params?.status && params.status !== 'all') {
          normalizedParams.status = params.status;
        }
        
        const queryParams = new URLSearchParams();
        if (normalizedParams.department) queryParams.append('department', normalizedParams.department);
        if (normalizedParams.status) queryParams.append('status', normalizedParams.status);
        
        const queryString = queryParams.toString();
        return `/admin/dashboard${queryString ? `?${queryString}` : ''}`;
      },
      // Normalize query args to ensure consistent cache keys
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        // Always serialize to the same format regardless of undefined values
        const normalized: any = {};
        if (queryArgs?.department && queryArgs.department !== 'all') {
          normalized.department = queryArgs.department;
        }
        if (queryArgs?.status && queryArgs.status !== 'all') {
          normalized.status = queryArgs.status;
        }
        // Use a consistent key format - empty object for no params
        return `${endpointName}(${JSON.stringify(normalized)})`;
      },
      // Always use fresh data, don't merge with cache
      merge: (currentCache, newItems) => {
        return newItems;
      },
      providesTags: ['Dashboard'],
      // Keep unused data for a short time (60 seconds) to balance freshness and performance
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useGetAdminDashboardQuery } = adminDashboardApi;

