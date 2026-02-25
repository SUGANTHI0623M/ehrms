import { apiSlice } from './apiSlice';

export interface Payroll {
  _id: string;
  employeeId: string;
  month: number;
  year: number;
  grossSalary: number;
  deductions: number;
  netPay: number;
  components: Array<{
    name: string;
    amount: number;
    type: 'earning' | 'deduction';
  }>;
  status: 'Pending' | 'Processed' | 'Paid';
  processedAt?: string;
  paidAt?: string;
  payslipUrl?: string;
}

export interface PayrollStats {
  totalEmployees: number;
  totalPayroll: number;
  totalDeductions: number;
  netPayable: number;
  processed: number;
  pending: number;
}

export interface CreatePayrollRequest {
  employeeId: string;
  month: number;
  year: number;
  grossSalary: number;
  components: Payroll['components'];
}

export const payrollApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPayrolls: builder.query<
      {
        success: boolean;
        data: {
          payrolls: Payroll[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { month?: number; year?: number; employeeId?: string; status?: string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/payroll',
        params,
      }),
      providesTags: ['Payroll'],
    }),
    getPayrollStats: builder.query<
      { success: boolean; data: { stats: PayrollStats } },
      { month?: number; year?: number }
    >({
      query: (params) => ({
        url: '/payroll/stats',
        params,
      }),
      providesTags: ['Payroll'],
    }),
    getPayrollById: builder.query<{ success: boolean; data: { payroll: Payroll } }, string>({
      query: (id) => `/payroll/${id}`,
      providesTags: (result, error, id) => [{ type: 'Payroll', id }],
    }),
    createPayroll: builder.mutation<
      { success: boolean; data: { payroll: Payroll } },
      CreatePayrollRequest
    >({
      query: (payrollData) => ({
        url: '/payroll',
        method: 'POST',
        body: payrollData,
      }),
      invalidatesTags: ['Payroll'],
    }),
    updatePayroll: builder.mutation<
      { success: boolean; data: { payroll: Payroll } },
      { id: string; data: Partial<CreatePayrollRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/payroll/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Payroll', id }, 'Payroll'],
    }),
    processPayroll: builder.mutation<
      { success: boolean; data: { message: string; count: number } },
      { month: number; year: number }
    >({
      query: (data) => ({
        url: '/payroll/process',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Payroll'],
    }),
    previewPayroll: builder.mutation<
      { 
        success: boolean; 
        data: { 
          preview: {
            employee: { _id: string; name: string; employeeId: string; designation?: string; department?: string };
            month: number;
            year: number;
            grossSalary: number;
            deductions: number;
            netPay: number;
            components: Payroll['components'];
            attendance: { workingDays: number; presentDays: number; attendancePercentage: number };
          }
        } 
      },
      { employeeId: string; month: number; year: number }
    >({
      query: (data) => ({
        url: '/payroll/preview',
        method: 'POST',
        body: data,
      }),
    }),
    previewBulkPayroll: builder.mutation<
      { 
        success: boolean; 
        data: { 
          preview: {
            month: number;
            year: number;
            previews: Array<{
              employee: { _id: string; name: string; employeeId: string; designation?: string; department?: string };
              month: number;
              year: number;
              grossSalary: number;
              deductions: number;
              netPay: number;
              components: Payroll['components'];
              attendance: { workingDays: number; presentDays: number; attendancePercentage: number };
            }>;
            summary: {
              totalEmployees: number;
              totalGross: number;
              totalDeductions: number;
              totalNetPay: number;
            };
            errors: string[];
          }
        } 
      },
      { month: number; year: number; employeeIds?: string[] }
    >({
      query: (data) => ({
        url: '/payroll/bulk-preview',
        method: 'POST',
        body: data,
      }),
    }),
    generatePayroll: builder.mutation<
      { success: boolean; data: { payroll: Payroll; attendance: { workingDays: number; presentDays: number; attendancePercentage: number } } },
      { employeeId: string; month: number; year: number }
    >({
      query: (data) => ({
        url: '/payroll/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Payroll'],
    }),
    bulkGeneratePayroll: builder.mutation<
      { success: boolean; data: { message: string; results: { success: number; failed: number; skipped: number; errors: string[] } } },
      { month: number; year: number; employeeIds?: string[] }
    >({
      query: (data) => ({
        url: '/payroll/bulk-generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Payroll'],
    }),
    markPayrollAsPaid: builder.mutation<
      { success: boolean; data: { payroll: Payroll } },
      string
    >({
      query: (id) => ({
        url: `/payroll/${id}/mark-paid`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Payroll', id }, 'Payroll'],
    }),
    generatePayslip: builder.mutation<
      { success: boolean; data: { payslipUrl: string; payroll: Payroll } },
      string
    >({
      query: (id) => ({
        url: `/payroll/${id}/payslip`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Payroll', id }, 'Payroll'],
    }),
    viewPayslip: builder.query<Blob, string>({
      query: (id) => ({
        url: `/payroll/${id}/payslip/view`,
        responseHandler: (response) => response.blob(),
      }),
    }),
    downloadPayslip: builder.query<Blob, string>({
      query: (id) => ({
        url: `/payroll/${id}/payslip/download`,
        responseHandler: (response) => response.blob(),
      }),
    }),
    exportPayroll: builder.query<Blob, { month?: number; year?: number; status?: string }>({
      query: (params) => ({
        url: '/payroll/export',
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetPayrollsQuery,
  useGetPayrollStatsQuery,
  useGetPayrollByIdQuery,
  useCreatePayrollMutation,
  useUpdatePayrollMutation,
  useProcessPayrollMutation,
  usePreviewPayrollMutation,
  usePreviewBulkPayrollMutation,
  useGeneratePayrollMutation,
  useBulkGeneratePayrollMutation,
  useMarkPayrollAsPaidMutation,
  useGeneratePayslipMutation,
  useLazyViewPayslipQuery,
  useLazyDownloadPayslipQuery,
  useLazyExportPayrollQuery,
} = payrollApi;

