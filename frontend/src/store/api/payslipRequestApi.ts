import { apiSlice } from './apiSlice';

export interface PayslipRequest {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    employeeId: string;
    designation: string;
  };
  month: number;
  year: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: {
    _id: string;
    name: string;
    email?: string;
  };
  approvedAt?: string;
  rejectedBy?: {
    _id: string;
    name: string;
    email?: string;
  };
  rejectedAt?: string;
  rejectionReason?: string;
  payrollId?: {
    _id: string;
    payslipUrl?: string;
    status: string;
  };
}

export const payslipRequestApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPayslipRequests: builder.query<
      {
        success: boolean;
        data: {
          requests: PayslipRequest[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { employeeId?: string; status?: string; month?: number; year?: number; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/payslip-requests',
        params,
      }),
      providesTags: ['Payroll'],
    }),
    createPayslipRequest: builder.mutation<
      { success: boolean; data: { request: PayslipRequest } },
      { month: number; year: number; reason?: string }
    >({
      query: (requestData) => ({
        url: '/payslip-requests',
        method: 'POST',
        body: requestData,
      }),
      invalidatesTags: ['Payroll'],
    }),
    approvePayslipRequest: builder.mutation<
      { success: boolean; data: { request: PayslipRequest } },
      string
    >({
      query: (id) => ({
        url: `/payslip-requests/${id}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Payroll', id }, 'Payroll'],
    }),
    rejectPayslipRequest: builder.mutation<
      { success: boolean; data: { request: PayslipRequest } },
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/payslip-requests/${id}/reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Payroll', id }, 'Payroll'],
    }),
  }),
});

export const {
  useGetPayslipRequestsQuery,
  useCreatePayslipRequestMutation,
  useApprovePayslipRequestMutation,
  useRejectPayslipRequestMutation,
} = payslipRequestApi;

