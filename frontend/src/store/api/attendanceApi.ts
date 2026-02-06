import { apiSlice } from './apiSlice';

export interface Attendance {
  _id: string | null;
  employeeId: {
    _id: string;
    name: string;
    employeeId: string;
    designation: string;
    department: string;
    joiningDate?: string;
  };
  date: string;
  punchIn?: string | null;
  punchOut?: string | null;
  status: 'Present' | 'Absent' | 'Half Day' | 'On Leave' | 'Not Marked' | 'Pending';
  leaveType?: 'Sick Leave' | 'Casual Leave' | 'Earned Leave' | 'Unpaid Leave' | 'Maternity Leave' | 'Paternity Leave' | 'Other Leave';
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  remarks?: string;
  workHours?: number;
  overtime?: number;
  fineHours?: number;
  lateMinutes?: number;
  fineAmount?: number;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  ipAddress?: string | null;
  punchInIpAddress?: string | null;
  punchOutIpAddress?: string | null;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  notMarked: number;
  pending?: number;
  punchedIn: number;
  punchedOut: number;
}

export interface MarkAttendanceRequest {
  employeeId?: string; // Optional - backend resolves it for Employee role
  date: string;
  punchIn?: string;
  punchOut?: string;
  status?: Attendance['status'];
  location?: Attendance['location'];
}

export const attendanceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAttendance: builder.query<
      {
        success: boolean;
        data: {
          attendance: Attendance[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { date?: string; employeeId?: string; status?: string; page?: number; limit?: number; includeAllEmployees?: boolean }
    >({
      query: (params) => ({
        url: '/attendance',
        params: {
          ...params,
          includeAllEmployees: params.includeAllEmployees ? 'true' : undefined,
        },
      }),
      providesTags: ['Attendance'],
    }),
    getAttendanceStats: builder.query<
      { success: boolean; data: { stats: AttendanceStats } },
      { date?: string }
    >({
      query: (params) => ({
        url: '/attendance/stats',
        params,
      }),
      providesTags: ['Attendance'],
    }),
    getEmployeeAttendance: builder.query<
      {
        success: boolean;
        data: {
          attendance: Attendance[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { employeeId: string; startDate?: string; endDate?: string; status?: string; page?: number; limit?: number }
    >({
      query: ({ employeeId, ...params }) => ({
        url: `/attendance/employee/${employeeId}`,
        params,
      }),
      providesTags: (result, error, { employeeId }) => [{ type: 'Attendance', id: employeeId }],
    }),
    getAttendanceById: builder.query<
      { success: boolean; data: { attendance: Attendance } },
      string
    >({
      query: (id) => `/attendance/${id}`,
      providesTags: (result, error, id) => [{ type: 'Attendance', id }],
    }),
    getTodayAttendance: builder.query<
      { success: boolean; data: { attendance: Attendance | null } },
      void
    >({
      query: () => '/attendance/today',
      providesTags: ['Attendance'],
    }),
    markAttendance: builder.mutation<
      { success: boolean; data: { attendance: Attendance } },
      MarkAttendanceRequest
    >({
      query: (attendanceData) => ({
        url: '/attendance',
        method: 'POST',
        body: attendanceData,
      }),
      invalidatesTags: ['Attendance'],
    }),
    approveAttendance: builder.mutation<
      { success: boolean; data: { attendance: Attendance; message: string } },
      { id: string; status?: string; remarks?: string }
    >({
      query: ({ id, status, remarks }) => ({
        url: `/attendance/${id}/approve`,
        method: 'PATCH',
        body: { status, remarks },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Attendance', id }, 'Attendance'],
    }),
    updateAttendance: builder.mutation<
      { success: boolean; data: { attendance: Attendance } },
      { id: string; data: Partial<MarkAttendanceRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/attendance/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Attendance', id }, 'Attendance'],
    }),
  }),
});

export const {
  useGetAttendanceQuery,
  useGetAttendanceStatsQuery,
  useGetEmployeeAttendanceQuery,
  useGetAttendanceByIdQuery,
  useGetTodayAttendanceQuery,
  useMarkAttendanceMutation,
  useApproveAttendanceMutation,
  useUpdateAttendanceMutation,
} = attendanceApi;

