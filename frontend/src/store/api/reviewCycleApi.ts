import { apiSlice } from './apiSlice';

export interface ReviewCycle {
  _id: string;
  name: string; // e.g., "Q1 2024", "Annual 2024"
  type: 'Quarterly' | 'Half-Yearly' | 'Annual' | 'Probation' | 'Custom';
  startDate: string;
  endDate: string;
  goalSubmissionDeadline: string;
  selfReviewDeadline: string;
  managerReviewDeadline: string;
  hrReviewDeadline: string;
  status: 'draft' | 'active' | 'goal-submission' | 'self-review' | 'manager-review' | 'hr-review' | 'completed' | 'cancelled';
  description?: string;
  businessId: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewCycleRequest {
  name: string;
  type: 'Quarterly' | 'Half-Yearly' | 'Annual' | 'Probation' | 'Custom';
  startDate: string;
  endDate: string;
  goalSubmissionDeadline: string;
  selfReviewDeadline: string;
  managerReviewDeadline: string;
  hrReviewDeadline: string;
  description?: string;
}

export const reviewCycleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReviewCycles: builder.query<
      {
        success: boolean;
        data: {
          cycles: ReviewCycle[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { status?: string; type?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/performance/cycles',
        params,
      }),
      providesTags: ['PerformanceReview'],
    }),
    getReviewCycleById: builder.query<
      { success: boolean; data: { cycle: ReviewCycle } },
      string
    >({
      query: (id) => `/performance/cycles/${id}`,
      providesTags: (result, error, id) => [{ type: 'PerformanceReview', id }],
    }),
    createReviewCycle: builder.mutation<
      { success: boolean; data: { cycle: ReviewCycle } },
      CreateReviewCycleRequest
    >({
      query: (cycleData) => ({
        url: '/performance/cycles',
        method: 'POST',
        body: cycleData,
      }),
      invalidatesTags: ['PerformanceReview'],
    }),
    updateReviewCycle: builder.mutation<
      { success: boolean; data: { cycle: ReviewCycle } },
      { id: string; data: Partial<CreateReviewCycleRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/performance/cycles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'PerformanceReview', id }, 'PerformanceReview'],
    }),
    deleteReviewCycle: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/performance/cycles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PerformanceReview'],
    }),
    getReviewCycleStats: builder.query<
      {
        success: boolean;
        data: {
          cycle: ReviewCycle;
          reviews: {
            total: number;
            selfReviewPending: number;
            selfReviewSubmitted: number;
            managerReviewPending: number;
            managerReviewSubmitted: number;
            hrReviewPending: number;
            hrReviewSubmitted: number;
            completed: number;
            completionRate: number;
          };
          goals: {
            total: number;
            approved: number;
            pending: number;
            completed: number;
            completionRate: number;
          };
        };
      },
      string
    >({
      query: (id) => `/performance/cycles/${id}/stats`,
      providesTags: (result, error, id) => [{ type: 'PerformanceReview', id }],
    }),
    completeReviewCycle: builder.mutation<
      {
        success: boolean;
        data: {
          cycle: ReviewCycle;
          message: string;
          statistics: {
            totalReviews: number;
            completedReviews: number;
          };
        };
      },
      string
    >({
      query: (id) => ({
        url: `/performance/cycles/${id}/complete`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'PerformanceReview', id }, 'PerformanceReview'],
    }),
    updateCycleStatus: builder.mutation<
      {
        success: boolean;
        data: {
          message: string;
          updatedCount: number;
          totalCycles: number;
        };
      },
      void
    >({
      query: () => ({
        url: '/performance/cycles/update-status',
        method: 'PATCH',
      }),
      invalidatesTags: ['PerformanceReview'],
    }),
  }),
});

export const {
  useGetReviewCyclesQuery,
  useGetReviewCycleByIdQuery,
  useCreateReviewCycleMutation,
  useUpdateReviewCycleMutation,
  useDeleteReviewCycleMutation,
  useGetReviewCycleStatsQuery,
  useCompleteReviewCycleMutation,
  useUpdateCycleStatusMutation,
} = reviewCycleApi;

