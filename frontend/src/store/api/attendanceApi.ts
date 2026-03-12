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
  status: 'Present' | 'Absent' | 'Half Day' | 'On Leave' | 'Not Marked' | 'Pending' | 'Approved' | 'Rejected';
  leaveType?: 'Casual Leave' | 'Paid Holiday' | 'Comp Off' | 'Week Off';
  halfDaySession?: 'First Half Day' | 'Second Half Day';
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  approvedAt?: string | null;
  remarks?: string;
  workHours?: number;
  overtime?: number;
  fineHours?: number; // in minutes
  lateMinutes?: number;
  earlyMinutes?: number;
  fineAmount?: number;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  } | null;
  ipAddress?: string | null;
  punchInIpAddress?: string | null;
  punchOutIpAddress?: string | null;
  logs?: AttendanceLog[];
}

export interface AttendanceLog {
  _id: string;
  attendanceId: string;
  action: 'PUNCH_IN' | 'PUNCH_OUT' | 'CREATED' | 'UPDATED' | 'APPROVED' | 'REJECTED' | 'STATUS_CHANGED' | 'FINE_CALCULATED' | 'FINE_ADJUSTED' | 'LEAVE_MARKED' | 'NOTES_ADDED';
  performedBy: {
    _id: string;
    name: string;
    email: string;
  } | string;
  performedByName?: string;
  performedByEmail?: string;
  oldValue?: any;
  newValue?: any;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  selfieUrl?: string;
  punchInDateTime?: string;
  punchOutDateTime?: string;
  punchInAddress?: string;
  punchOutAddress?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
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
      { date?: string; employeeId?: string; status?: string; page?: number; limit?: number; includeAllEmployees?: boolean; search?: string }
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
      providesTags: (result, error, { employeeId }) => [
        { type: 'Attendance', id: employeeId },
        'Attendance' // Also provide general tag so it refetches when any attendance is updated
      ],
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
    canMarkAttendance: builder.query<
      {
        success: boolean;
        data: {
          canPunchIn: boolean;
          canPunchOut: boolean;
          reason: string | null;
          hasApprovedLeave: boolean;
          leaveType: string | null;
          halfDayType: 'First Half Day' | 'Second Half Day' | null;
          shiftHalfDayInfo: {
            firstHalfEndTime?: string;
            secondHalfStartTime?: string;
            midpointTime?: string;
          } | null;
          existingAttendance: {
            status: string;
            punchIn?: string | null;
            punchOut?: string | null;
            halfDaySession?: 'First Half Day' | 'Second Half Day';
          } | null;
        };
      },
      { date?: string }
    >({
      query: (params) => ({
        url: '/attendance/can-mark',
        params,
      }),
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
    processFaceMatching: builder.mutation<
      { success: boolean; message: string; data: { attendance: { _id: string; punchInFaceMatch?: number; punchOutFaceMatch?: number } } },
      { attendanceId: string }
    >({
      query: ({ attendanceId }) => ({
        url: `/attendance/${attendanceId}/process-face-matching`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { attendanceId }) => [
        { type: 'Attendance', id: attendanceId },
        'Attendance',
      ],
    }),
  }),
});

export const {
  useGetAttendanceQuery,
  useGetAttendanceStatsQuery,
  useGetEmployeeAttendanceQuery,
  useGetAttendanceByIdQuery,
  useGetTodayAttendanceQuery,
  useCanMarkAttendanceQuery,
  useMarkAttendanceMutation,
  useApproveAttendanceMutation,
  useUpdateAttendanceMutation,
  useProcessFaceMatchingMutation,
} = attendanceApi;

