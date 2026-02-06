import { apiSlice } from './apiSlice';

export interface Customer {
  _id: string;
  customerName: string;
  customerNumber: string;
  companyName?: string;
  address: string;
  emailId: string;
  city: string;
  pincode: string;
  phone?: string;
  customFields?: Record<string, any>;
  assignedTo?: string | {
    _id: string;
    name: string;
    email: string;
    employeeId: string;
  };
  assignedDate?: string;
  status?: 'Not yet Started' | 'Pending' | 'In progress' | 'Serving Today' | 'Delayed Tasks' | 'Completed Tasks' | 'Reopened' | 'Rejected' | 'Hold';
  completedDate?: string;
  expectedCompletionDate?: string;
  addedBy: string | {
    _id: string;
    name: string;
    email: string;
  };
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDataField {
  _id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'dropdown' | 'textarea' | 'boolean';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  businessId: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  customerName: string;
  customerNumber: string;
  companyName?: string;
  address: string;
  emailId: string;
  city: string;
  pincode: string;
  phone?: string;
  customFields?: Record<string, any>;
}

export interface UpdateCustomerRequest {
  customerName?: string;
  customerNumber?: string;
  companyName?: string;
  address?: string;
  emailId?: string;
  city?: string;
  pincode?: string;
  phone?: string;
  customFields?: Record<string, any>;
}

export interface CustomerStats {
  totalCustomers: number;
  notYetStarted: number;
  inProgress: number;
  completedTasks: number;
  reopenedTasks: number;
}

export const customerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<
      {
        success: boolean;
        data: {
          customers: Customer[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { search?: string; page?: number; limit?: number; startDate?: string; endDate?: string }
    >({
      query: (params) => ({
        url: '/customers',
        params,
      }),
      providesTags: ['Customer'],
    }),
    getCustomerById: builder.query<
      { success: boolean; data: { customer: Customer } },
      string
    >({
      query: (id) => `/customers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Customer', id }],
    }),
    getCustomerStats: builder.query<
      { success: boolean; data: { stats: CustomerStats } },
      void
    >({
      query: () => '/customers/stats',
      providesTags: ['Customer'],
    }),
    getCustomersByDateRange: builder.query<
      { success: boolean; data: { chartData: Array<{ date: string; count: number }> } },
      { startDate?: string; endDate?: string }
    >({
      query: (params) => ({
        url: '/customers/chart-data',
        params,
      }),
      providesTags: ['Customer'],
    }),
    createCustomer: builder.mutation<
      { success: boolean; data: { customer: Customer } },
      CreateCustomerRequest
    >({
      query: (customerData) => ({
        url: '/customers',
        method: 'POST',
        body: customerData,
      }),
      invalidatesTags: ['Customer'],
    }),
    updateCustomer: builder.mutation<
      { success: boolean; data: { customer: Customer } },
      { id: string; data: UpdateCustomerRequest }
    >({
      query: ({ id, data }) => ({
        url: `/customers/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Customer', id }, 'Customer'],
    }),
    deleteCustomer: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/customers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Customer'],
    }),
    importCustomersFromExcel: builder.mutation<
      {
        success: boolean;
        data: {
          imported: number;
          failed: number;
          total: number;
          success: Array<{ row: number; customerName: string; customerNumber: string; emailId: string }>;
          failedItems: Array<{ row: number; customerName: string; customerNumber: string; error: string }>;
        };
      },
      { file: File }
    >({
      query: ({ file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/customers/import',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Customer'],
    }),
    exportCustomersToExcel: builder.mutation<Blob, void>({
      query: () => ({
        url: '/customers/export',
        method: 'GET',
        responseHandler: async (response) => {
          const blob = await response.blob();
          return blob;
        },
      }),
    }),
    assignCustomerToStaff: builder.mutation<
      { success: boolean; data: { customer: Customer } },
      { id: string; staffId: string; expectedCompletionDate?: string }
    >({
      query: ({ id, staffId, expectedCompletionDate }) => ({
        url: `/customers/${id}/assign`,
        method: 'POST',
        body: { staffId, expectedCompletionDate },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Customer', id }, 'Customer'],
    }),
    updateCustomerStatus: builder.mutation<
      { success: boolean; data: { customer: Customer } },
      { id: string; status: 'Not yet Started' | 'Pending' | 'In progress' | 'Serving Today' | 'Delayed Tasks' | 'Completed Tasks' | 'Reopened' | 'Rejected' | 'Hold'; expectedCompletionDate?: string }
    >({
      query: ({ id, status, expectedCompletionDate }) => ({
        url: `/customers/${id}/status`,
        method: 'PATCH',
        body: { status, expectedCompletionDate },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Customer', id }, 
        'Customer',
        { type: 'Task', id },
        'Task'
      ],
    }),
    getCustomersByStaff: builder.query<
      { success: boolean; data: { chartData: Array<{ staffId: string; staffName: string; count: number }> } },
      { startDate?: string; endDate?: string; staffId?: string }
    >({
      query: (params) => ({
        url: '/customers/staff-chart',
        params,
      }),
      providesTags: ['Customer'],
    }),

    reopenTask: builder.mutation<
      { success: boolean; data: { customer: Customer } },
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/customers/${id}/reopen`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Customer', id }, 
        'Customer',
        { type: 'Task', id },
        'Task'
      ],
    }),

    approveTask: builder.mutation<
      { success: boolean; data: { customer: Customer } },
      string
    >({
      query: (id) => ({
        url: `/customers/${id}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Customer', id }, 
        'Customer',
        { type: 'Task', id },
        'Task'
      ],
    }),

    rejectTask: builder.mutation<
      { success: boolean; data: { customer: Customer } },
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/customers/${id}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Customer', id }, 
        'Customer',
        { type: 'Task', id },
        'Task'
      ],
    }),

    approveTaskCompletion: builder.mutation<
      { success: boolean; data: { customer: Customer } },
      string
    >({
      query: (id) => ({
        url: `/customers/${id}/approve-completion`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Customer', id }, 
        'Customer',
        { type: 'Task', id },
        'Task'
      ],
    }),

    rejectTaskCompletion: builder.mutation<
      { success: boolean; data: { customer: Customer } },
      { id: string; reason?: string }
    >({
      query: ({ id, reason }) => ({
        url: `/customers/${id}/reject-completion`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Customer', id }, 
        'Customer',
        { type: 'Task', id },
        'Task'
      ],
    }),

    generateTaskOTP: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/customers/${id}/generate-otp`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Customer', id }, 'Customer'],
    }),

    verifyTaskOTP: builder.mutation<
      { success: boolean; data: { customer: Customer; message: string } },
      { id: string; otp: string }
    >({
      query: ({ id, otp }) => ({
        url: `/customers/${id}/verify-otp`,
        method: 'POST',
        body: { otp },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Customer', id }, 
        'Customer',
        { type: 'Task', id },
        'Task'
      ],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useGetCustomerStatsQuery,
  useGetCustomersByDateRangeQuery,
  useGetCustomersByStaffQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useImportCustomersFromExcelMutation,
  useExportCustomersToExcelMutation,
  useAssignCustomerToStaffMutation,
  useUpdateCustomerStatusMutation,
  useReopenTaskMutation,
  useApproveTaskMutation,
  useRejectTaskMutation,
  useApproveTaskCompletionMutation,
  useRejectTaskCompletionMutation,
  useGenerateTaskOTPMutation,
  useVerifyTaskOTPMutation,
} = customerApi;
