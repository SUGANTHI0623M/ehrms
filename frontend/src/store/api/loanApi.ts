import { apiSlice } from './apiSlice';

export interface Loan {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    employeeId: string;
    designation: string;
  };
  loanType: 'Personal' | 'Advance' | 'Emergency';
  amount: number;
  purpose: string;
  interestRate?: number;
  tenure: number;
  emi: number;
  status: 'Pending' | 'Approved' | 'Active' | 'Completed' | 'Rejected';
  approvedBy?: {
    _id: string;
    name: string;
    employeeId: string;
  };
  approvedAt?: string;
  startDate?: string;
  endDate?: string;
  remainingAmount: number;
  installments: Array<{
    dueDate: string;
    amount: number;
    paid: boolean;
    paidAt?: string;
  }>;
}

export const loanApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLoans: builder.query<
      {
        success: boolean;
        data: {
          loans: Loan[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { employeeId?: string; status?: string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/loans',
        params,
      }),
      providesTags: ['Payroll'],
    }),
    getLoanById: builder.query<{ success: boolean; data: { loan: Loan } }, string>({
      query: (id) => `/loans/${id}`,
      providesTags: (result, error, id) => [{ type: 'Payroll', id }],
    }),
    createLoan: builder.mutation<
      { success: boolean; data: { loan: Loan } },
      Partial<Loan>
    >({
      query: (loanData) => ({
        url: '/loans',
        method: 'POST',
        body: loanData,
      }),
      invalidatesTags: ['Payroll'],
    }),
    approveLoan: builder.mutation<
      { success: boolean; data: { loan: Loan } },
      string
    >({
      query: (id) => ({
        url: `/loans/${id}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Payroll', id }, 'Payroll'],
    }),
  }),
});

export const {
  useGetLoansQuery,
  useGetLoanByIdQuery,
  useCreateLoanMutation,
  useApproveLoanMutation,
} = loanApi;

