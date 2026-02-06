import { apiSlice } from './apiSlice';

export interface Task {
  _id: string;
  taskId: string;
  taskTitle: string;
  description?: string;
  customerId: string | {
    _id: string;
    customerName: string;
    customerNumber: string;
    emailId: string;
    address: string;
    city: string;
    pincode: string;
    phone?: string;
  };
  assignedTo: string | {
    _id: string;
    name: string;
    email: string;
    employeeId: string;
  };
  assignedBy: string | {
    _id: string;
    name: string;
    email: string;
  };
  assignedDate: string;
  status: 'Not yet Started' | 'Pending' | 'In progress' | 'Serving Today' | 'Delayed Tasks' | 'Completed Tasks' | 'Reopened' | 'Rejected' | 'Hold';
  completedDate?: string;
  expectedCompletionDate?: string;
  earliestCompletionDate?: string;
  latestCompletionDate?: string;
  customFields?: Record<string, any>;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  totalTasks: number;
  notYetStarted: number;
  delayedTasks: number;
  inProgress: number;
  completedTasks: number;
  reopenedTasks: number;
}

export interface CreateTaskRequest {
  staffId: string;
  customerId: string;
  taskTitle: string;
  description?: string;
  earliestCompletionDate: string;
  latestCompletionDate: string;
  customFields?: Record<string, any>;
}

export interface TaskChartData {
  date: string;
  notYetStarted: number;
  inProgress: number;
  reopenedTasks: number;
  completedTasks: number;
}

export const taskApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<
      {
        success: boolean;
        data: {
          tasks: Task[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { 
        search?: string; 
        staffId?: string; 
        status?: string;
        startDate?: string; 
        endDate?: string;
        page?: number; 
        limit?: number;
      }
    >({
      query: (params) => {
        const queryParams: any = {
          search: params.search,
          page: params.page,
          limit: params.limit,
        };
        if (params.staffId) queryParams.staffId = params.staffId;
        if (params.status) queryParams.status = params.status;
        if (params.startDate) queryParams.startDate = params.startDate;
        if (params.endDate) queryParams.endDate = params.endDate;
        return {
          url: '/tasks',
          params: queryParams,
        };
      },
      providesTags: ['Task'],
    }),
    getTaskStats: builder.query<
      { success: boolean; data: TaskStats },
      { staffId?: string; startDate?: string; endDate?: string }
    >({
      query: (params) => ({
        url: '/tasks/stats',
        params,
      }),
      transformResponse: (response: { success: boolean; data: { stats: TaskStats } }) => {
        return {
          success: response.success,
          data: response.data.stats
        };
      },
      providesTags: ['Task'],
    }),
    getTasksByDateRange: builder.query<
      { success: boolean; data: { chartData: TaskChartData[] } },
      { staffId?: string; startDate?: string; endDate?: string }
    >({
      query: (params) => ({
        url: '/tasks/chart-data',
        params,
      }),
      providesTags: ['Task'],
    }),
    createTask: builder.mutation<
      { success: boolean; data: { task: Task } },
      CreateTaskRequest
    >({
      query: ({ customerId, staffId, taskTitle, description, earliestCompletionDate, latestCompletionDate, customFields }) => ({
        url: '/tasks',
        method: 'POST',
        body: {
          customerId,
          staffId,
          taskTitle,
          description,
          earliestCompletionDate,
          latestCompletionDate,
          customFields,
        },
      }),
      invalidatesTags: ['Task'],
    }),
    updateTaskStatus: builder.mutation<
      { success: boolean; data: { task: Task } },
      { id: string; status: 'Not yet Started' | 'Pending' | 'In progress' | 'Serving Today' | 'Delayed Tasks' | 'Completed Tasks' | 'Reopened' | 'Rejected' | 'Hold'; expectedCompletionDate?: string }
    >({
      query: ({ id, status, expectedCompletionDate }) => ({
        url: `/tasks/${id}/status`,
        method: 'PATCH',
        body: { status, expectedCompletionDate },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, 'Task'],
    }),
    reopenTask: builder.mutation<
      { success: boolean; data: { task: Task } },
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/tasks/${id}/reopen`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, 'Task'],
    }),
    approveTask: builder.mutation<
      { success: boolean; data: { task: Task } },
      string
    >({
      query: (id) => ({
        url: `/tasks/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Task', id }, 'Task'],
    }),
    rejectTask: builder.mutation<
      { success: boolean; data: { task: Task } },
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/tasks/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, 'Task'],
    }),
    approveTaskCompletion: builder.mutation<
      { success: boolean; data: { task: Task } },
      string
    >({
      query: (id) => ({
        url: `/tasks/${id}/approve-completion`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Task', id }, 'Task'],
    }),
    rejectTaskCompletion: builder.mutation<
      { success: boolean; data: { task: Task } },
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/tasks/${id}/reject-completion`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, 'Task'],
    }),
    generateTaskOTP: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/tasks/${id}/generate-otp`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Task', id }, 'Task'],
    }),
    verifyTaskOTP: builder.mutation<
      { success: boolean; data: { task: Task; message: string } },
      { id: string; otp: string }
    >({
      query: ({ id, otp }) => ({
        url: `/tasks/${id}/verify-otp`,
        method: 'POST',
        body: { otp },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }, 'Task'],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskStatsQuery,
  useGetTasksByDateRangeQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useReopenTaskMutation,
  useApproveTaskMutation,
  useRejectTaskMutation,
  useApproveTaskCompletionMutation,
  useRejectTaskCompletionMutation,
  useGenerateTaskOTPMutation,
  useVerifyTaskOTPMutation,
} = taskApi;
