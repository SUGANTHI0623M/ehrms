import { apiSlice } from './apiSlice';

export interface PerformanceReview {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    employeeId: string;
    designation: string;
    department: string;
    email?: string;
  };
  reviewCycle: string;
  reviewPeriod: {
    startDate: string;
    endDate: string;
  };
  reviewType: 'Quarterly' | 'Half-Yearly' | 'Annual' | 'Probation' | 'Custom';
  status: 'draft' | 'self-review-pending' | 'self-review-submitted' | 'manager-review-pending' | 'manager-review-submitted' | 'hr-review-pending' | 'hr-review-submitted' | 'completed' | 'cancelled';
  selfReview?: {
    overallRating: number;
    strengths: string[];
    areasForImprovement: string[];
    achievements: string[];
    challenges: string[];
    goalsAchieved: string[];
    comments: string;
    submittedAt?: string;
  };
  managerId?: {
    _id: string;
    name: string;
    employeeId: string;
    designation: string;
  };
  managerReview?: {
    overallRating: number;
    technicalSkills: number;
    communication: number;
    teamwork: number;
    leadership: number;
    problemSolving: number;
    punctuality: number;
    strengths: string[];
    areasForImprovement: string[];
    achievements: string[];
    feedback: string;
    recommendations: string;
    submittedAt?: string;
  };
  hrReview?: {
    overallRating: number;
    alignmentWithCompanyValues: number;
    growthPotential: number;
    feedback: string;
    recommendations: string;
    submittedAt?: string;
  };
  finalRating?: number;
  finalComments?: string;
  completedAt?: string;
  goalIds?: any[];
  // PMS Outcomes (set by admin)
  incrementPercent?: number;
  bonusAmount?: number;
  promotionFlag?: boolean;
  pipFlag?: boolean;
  trainingNeeds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePerformanceReviewRequest {
  employeeId: string;
  reviewCycle: string;
  reviewPeriod: {
    startDate: string;
    endDate: string;
  };
  reviewType: 'Quarterly' | 'Half-Yearly' | 'Annual' | 'Probation' | 'Custom';
  goalIds?: string[];
}

export interface BulkCreatePerformanceReviewRequest {
  reviewCycleId: string;
  reviewCycle: string;
  reviewType: 'Quarterly' | 'Half-Yearly' | 'Annual' | 'Probation' | 'Custom';
  reviewPeriod: {
    startDate: string;
    endDate: string;
  };
  excludeEmployeeIds?: string[];
}

export interface SubmitSelfReviewRequest {
  overallRating: number;
  strengths: string[];
  areasForImprovement: string[];
  achievements: string[];
  challenges: string[];
  goalsAchieved: string[];
  comments: string;
}

export interface SubmitManagerReviewRequest {
  overallRating: number;
  technicalSkills: number;
  communication: number;
  teamwork: number;
  leadership: number;
  problemSolving: number;
  punctuality: number;
  strengths: string[];
  areasForImprovement: string[];
  achievements: string[];
  feedback: string;
  recommendations: string;
}

export interface SubmitHRReviewRequest {
  overallRating: number;
  alignmentWithCompanyValues: number;
  growthPotential: number;
  feedback: string;
  recommendations: string;
}

export const performanceReviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPerformanceReviews: builder.query<
      {
        success: boolean;
        data: {
          reviews: PerformanceReview[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      {
        employeeId?: string;
        status?: string | string[];
        myReviews?: boolean;
        reviewCycle?: string;
        reviewType?: string;
        search?: string;
        page?: number;
        limit?: number;
        month?: number;
        year?: number;
      }
    >({
      query: (params) => ({
        url: '/performance/reviews',
        params,
      }),
      providesTags: ['PerformanceReview'],
    }),
    getPerformanceReviewById: builder.query<
      { success: boolean; data: { review: PerformanceReview } },
      string
    >({
      query: (id) => `/performance/reviews/${id}`,
      providesTags: (result, error, id) => [{ type: 'PerformanceReview', id }],
    }),
    getPerformanceAnalytics: builder.query<
      {
        success: boolean;
        data: {
          summary: {
            totalReviews: number;
            completedReviews: number;
            pendingReviews: number;
            avgRating: number;
          };
          ratingDistribution: {
            excellent: number;
            good: number;
            average: number;
            needsImprovement: number;
          };
          topPerformers: Array<{
            employeeId: string;
            name: string;
            employeeIdCode: string;
            designation: string;
            department: string;
            rating: number;
          }>;
          departmentStats: Record<string, {
            total: number;
            completed: number;
            avgRating: number;
          }>;
        };
      },
      { reviewCycle?: string; department?: string }
    >({
      query: (params) => ({
        url: '/performance/reviews/analytics',
        params,
      }),
      providesTags: ['PerformanceReview'],
    }),
    getEmployeePerformanceSummary: builder.query<
      {
        success: boolean;
        data: {
          employee: {
            name: string;
            employeeId: string;
            designation: string;
            department: string;
          };
          latestReview: PerformanceReview | null;
          averageRating: number;
          totalReviews: number;
          completedReviews: number;
          currentGoals: number;
          recentReviews: PerformanceReview[];
        };
      },
      void
    >({
      query: () => '/performance/reviews/employee/summary',
      providesTags: ['PerformanceReview'],
    }),
    createPerformanceReview: builder.mutation<
      { success: boolean; data: { review: PerformanceReview } },
      CreatePerformanceReviewRequest
    >({
      query: (data) => ({
        url: '/performance/reviews',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['PerformanceReview'],
    }),
    bulkCreatePerformanceReviews: builder.mutation<
      { success: boolean; data: { created: number; skipped: number; total: number; reviews: PerformanceReview[] } },
      BulkCreatePerformanceReviewRequest
    >({
      query: (data) => ({
        url: '/performance/reviews/bulk',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['PerformanceReview'],
    }),
    updatePerformanceReview: builder.mutation<
      { success: boolean; data: { review: PerformanceReview } },
      { id: string; data: Partial<CreatePerformanceReviewRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/performance/reviews/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PerformanceReview', id },
        'PerformanceReview',
      ],
    }),
    submitSelfReview: builder.mutation<
      { success: boolean; data: { review: PerformanceReview } },
      { id: string; data: SubmitSelfReviewRequest }
    >({
      query: ({ id, data }) => ({
        url: `/performance/reviews/${id}/self-review`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PerformanceReview', id },
        'PerformanceReview',
      ],
    }),
    submitManagerReview: builder.mutation<
      { success: boolean; data: { review: PerformanceReview } },
      { id: string; data: SubmitManagerReviewRequest }
    >({
      query: ({ id, data }) => ({
        url: `/performance/reviews/${id}/manager-review`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PerformanceReview', id },
        'PerformanceReview',
      ],
    }),
    submitHRReview: builder.mutation<
      { success: boolean; data: { review: PerformanceReview } },
      { id: string; data: SubmitHRReviewRequest }
    >({
      query: ({ id, data }) => ({
        url: `/performance/reviews/${id}/hr-review`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PerformanceReview', id },
        'PerformanceReview',
      ],
    }),
  }),
});

export const {
  useGetPerformanceReviewsQuery,
  useGetPerformanceReviewByIdQuery,
  useGetPerformanceAnalyticsQuery,
  useGetEmployeePerformanceSummaryQuery,
  useCreatePerformanceReviewMutation,
  useBulkCreatePerformanceReviewsMutation,
  useUpdatePerformanceReviewMutation,
  useSubmitSelfReviewMutation,
  useSubmitManagerReviewMutation,
  useSubmitHRReviewMutation,
} = performanceReviewApi;

