import { apiSlice } from './apiSlice';

export interface Leave {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    employeeId: string;
    designation: string;
  };
  leaveType: string; // Validated against template, can be any name from template
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
}

export const leaveApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLeaves: builder.query<
      {
        success: boolean;
        data: {
          leaves: Leave[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { employeeId?: string; status?: string; leaveType?: string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/leaves',
        params,
      }),
      providesTags: ['Attendance'],
    }),
    createLeave: builder.mutation<
      { success: boolean; data: { leave: Leave } },
      Partial<Leave>
    >({
      query: (leaveData) => ({
        url: '/leaves',
        method: 'POST',
        body: leaveData,
      }),
      invalidatesTags: ['Attendance'],
    }),
    approveLeave: builder.mutation<
      { success: boolean; data: { leave: Leave } },
      string
    >({
      query: (id) => ({
        url: `/leaves/${id}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Attendance'],
    }),
    rejectLeave: builder.mutation<
      { success: boolean; data: { leave: Leave } },
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `/leaves/${id}/reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: ['Attendance'],
    }),
  }),
});

export const {
  useGetLeavesQuery,
  useCreateLeaveMutation,
  useApproveLeaveMutation,
  useRejectLeaveMutation,
} = leaveApi;

