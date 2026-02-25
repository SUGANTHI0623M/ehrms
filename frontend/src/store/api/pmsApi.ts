import { apiSlice } from './apiSlice';

export interface Goal {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    employeeId: string;
    designation: string;
    department: string;
  };
  title: string;
  type: string;
  kpi: string;
  target: string;
  weightage: number;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'modified' | 'completed';
  cycle: string;
  achievements?: string;
  challenges?: string;
  managerNotes?: string;
  hrNotes?: string;
  selfReview?: {
    rating: number;
    comments: string;
    submittedAt?: string;
  };
  managerReview?: {
    rating: number;
    comments: string;
    submittedAt?: string;
  };
  hrReview?: {
    rating: number;
    comments: string;
    submittedAt?: string;
  };
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  assignedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  kraId?: string | {
    _id: string;
    title: string;
    kpi: string;
    target: string;
  };
  completedAt?: string;
  completedBy?: string;
  completedApprovedAt?: string;
  completedApprovedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGoalRequest {
  employeeId?: string;
  title: string;
  type: string;
  kpi: string;
  target: string;
  weightage: number;
  startDate: string;
  endDate: string;
  cycle: string;
}

export const pmsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGoals: builder.query<
      {
        success: boolean;
        data: {
          goals: Goal[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { employeeId?: string; status?: string; cycle?: string; search?: string; page?: number; limit?: number; myGoals?: boolean }
    >({
      query: (params) => ({
        url: '/pms',
        params,
      }),
      providesTags: ['PMS'],
    }),
    getGoalById: builder.query<{ success: boolean; data: { goal: Goal } }, string>({
      query: (id) => `/pms/${id}`,
      providesTags: (result, error, id) => [{ type: 'PMS', id }],
    }),
    createGoal: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      CreateGoalRequest
    >({
      query: (goalData) => ({
        url: '/pms',
        method: 'POST',
        body: goalData,
      }),
      invalidatesTags: ['PMS'],
    }),
    updateGoal: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      { id: string; data: Partial<CreateGoalRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/pms/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'PMS', id }, 'PMS'],
    }),
    approveGoal: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      { id: string; notes?: string }
    >({
      query: ({ id, notes }) => ({
        url: `/pms/${id}/approve`,
        method: 'PATCH',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PMS', id }, 
        'PMS',
        'Performance' // Invalidate KRA cache since KRA progress may have changed
      ],
    }),
    rejectGoal: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      { id: string; notes: string }
    >({
      query: ({ id, notes }) => ({
        url: `/pms/${id}/reject`,
        method: 'PATCH',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'PMS', id }, 'PMS'],
    }),
    modifyGoal: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      { id: string; notes: string }
    >({
      query: ({ id, notes }) => ({
        url: `/pms/${id}/modify`,
        method: 'PATCH',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'PMS', id }, 'PMS'],
    }),
    completeGoal: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      { id: string; completionNotes?: string }
    >({
      query: ({ id, completionNotes }) => ({
        url: `/pms/${id}/complete`,
        method: 'PATCH',
        body: { completionNotes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PMS', id }, 
        'PMS',
        'Performance' // Invalidate KRA cache
      ],
    }),
    approveGoalCompletion: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      { id: string; approvalNotes?: string }
    >({
      query: ({ id, approvalNotes }) => ({
        url: `/pms/${id}/approve-completion`,
        method: 'PATCH',
        body: { approvalNotes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PMS', id }, 
        'PMS',
        'Performance' // Invalidate KRA cache
      ],
    }),
    reopenGoal: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      { id: string; reopenNotes?: string }
    >({
      query: ({ id, reopenNotes }) => ({
        url: `/pms/${id}/reopen`,
        method: 'PATCH',
        body: { reopenNotes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PMS', id }, 
        'PMS',
        'Performance' // Invalidate KRA cache
      ],
    }),
    submitReview: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      { id: string; type: 'self' | 'manager' | 'hr'; rating: number; comments: string }
    >({
      query: ({ id, ...data }) => ({
        url: `/pms/${id}/review`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'PMS', id }, 'PMS'],
    }),
    updateGoalProgress: builder.mutation<
      { success: boolean; data: { goal: Goal } },
      { id: string; progress: number; achievements?: string; challenges?: string }
    >({
      query: ({ id, ...data }) => ({
        url: `/pms/${id}/progress`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PMS', id }, 
        'PMS',
        'Performance' // Invalidate KRA cache since KRA progress may have changed
      ],
    }),
  }),
});

export const {
  useGetGoalsQuery,
  useGetGoalByIdQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useApproveGoalMutation,
  useRejectGoalMutation,
  useModifyGoalMutation,
  useCompleteGoalMutation,
  useApproveGoalCompletionMutation,
  useReopenGoalMutation,
  useSubmitReviewMutation,
  useUpdateGoalProgressMutation,
} = pmsApi;

