import { apiSlice } from './apiSlice';

export interface Reimbursement {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    employeeId: string;
    designation: string;
  };
  type: 'Travel' | 'Meal' | 'Accommodation' | 'Other';
  amount: number;
  description: string;
  date: string;
  receipt?: string;
  proofFiles?: string[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Processed' | 'Paid';
  approvedBy?: {
    _id: string;
    name: string;
    email?: string;
    role?: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  processedInPayroll?: string;
  processedAt?: string;
}

export const reimbursementApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReimbursements: builder.query<
      {
        success: boolean;
        data: {
          reimbursements: Reimbursement[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { employeeId?: string; status?: string; type?: string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/reimbursements',
        params,
      }),
      providesTags: ['Payroll'],
    }),
    getReimbursementById: builder.query<
      { success: boolean; data: { reimbursement: Reimbursement } },
      string
    >({
      query: (id) => `/reimbursements/${id}`,
      providesTags: (result, error, id) => [{ type: 'Payroll', id }],
    }),
    createReimbursement: builder.mutation<
      { success: boolean; data: { reimbursement: Reimbursement } },
      Partial<Reimbursement>
    >({
      query: (reimbursementData) => ({
        url: '/reimbursements',
        method: 'POST',
        body: reimbursementData,
      }),
      invalidatesTags: ['Payroll'],
    }),
    updateReimbursement: builder.mutation<
      { success: boolean; data: { reimbursement: Reimbursement } },
      { id: string; data: Partial<Reimbursement> }
    >({
      query: ({ id, data }) => ({
        url: `/reimbursements/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Payroll', id }, 'Payroll'],
    }),
    approveReimbursement: builder.mutation<
      { success: boolean; data: { reimbursement: Reimbursement } },
      string
    >({
      query: (id) => ({
        url: `/reimbursements/${id}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Payroll', id }, 'Payroll'],
    }),
    rejectReimbursement: builder.mutation<
      { success: boolean; data: { reimbursement: Reimbursement } },
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/reimbursements/${id}/reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Payroll', id }, 'Payroll'],
    }),
  }),
});

export const {
  useGetReimbursementsQuery,
  useGetReimbursementByIdQuery,
  useCreateReimbursementMutation,
  useUpdateReimbursementMutation,
  useApproveReimbursementMutation,
  useRejectReimbursementMutation,
} = reimbursementApi;

