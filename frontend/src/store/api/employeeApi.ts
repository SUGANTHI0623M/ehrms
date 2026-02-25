import { apiSlice } from './apiSlice';

export interface EmployeeDashboard {
  staff: {
    name: string;
    employeeId: string;
    designation: string;
    department: string;
  };
  stats: {
    pendingLeaves: number;
    approvedLeavesThisMonth: number;
    pendingLoans: number;
    activeLoans: number;
    attendanceToday: {
      status: string;
      punchIn?: string;
      punchOut?: string;
    } | null;
    attendanceSummary: {
      totalDays: number;
      presentDays: number;
      absentDays: number;
    };
    currentMonthSalary: number;
    payrollStatus: string;
  };
  recentLeaves: Array<{
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
    createdAt: string;
  }>;
  upcomingTasks: any[];
}

export interface EmployeeProfile {
  profile: {
    name: string;
    email: string;
    phone: string;
  };
  staffData: {
    _id: string;
    employeeId: string;
    name: string;
    email: string;
    phone: string;
    designation: string;
    department: string;
    staffType: 'Full Time' | 'Part Time' | 'Contract' | 'Intern';
    role?: 'Intern' | 'Employee';
    status: 'Active' | 'On Leave' | 'Deactivated' | 'Onboarding';
    joiningDate: string;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    dob?: string;
    maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
    bloodGroup?: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      accountHolderName?: string;
      upiId?: string;
    };
    uan?: string;
    pan?: string;
    aadhaar?: string;
    pfNumber?: string;
    esiNumber?: string;
    avatar?: string;
    salary?: {
      gross: number;
      net: number;
      components: Array<{
        name: string;
        amount: number;
        type: 'earning' | 'deduction';
      }>;
    };
    candidateId?: any;
    jobOpeningId?: any;
    managerId?: any;
    teamLeaderId?: any;
    leaveTemplateId?: string | {
      _id: string;
      name: string;
      description?: string;
    };
    attendanceTemplateId?: string | {
      _id: string;
      name: string;
      description?: string;
    };
    holidayTemplateId?: string | {
      _id: string;
      name: string;
      description?: string;
    };
  } | null;
}

export const employeeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEmployeeDashboard: builder.query<
      { success: boolean; data: EmployeeDashboard },
      void
    >({
      query: () => '/dashboard/employee',
      providesTags: ['Employee'],
    }),
    getEmployeeProfile: builder.query<
      { success: boolean; data: EmployeeProfile },
      void
    >({
      query: () => '/dashboard/employee/profile',
      providesTags: ['Employee'],
    }),
    updateEmployeeProfile: builder.mutation<
      { success: boolean; data: { staff: EmployeeProfile['staffData'] } },
      Partial<EmployeeProfile['staffData']>
    >({
      query: (data) => ({
        url: '/dashboard/employee/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result) => {
        const staffId = result?.data?.staff?._id;
        return [
          'Employee',
          'Staff',
          ...(staffId ? [{ type: 'Staff' as const, id: staffId }] : [])
        ];
      },
    }),
    uploadEmployeeAvatar: builder.mutation<
      { success: boolean; message: string; data: { staffId: string; avatar: string } },
      { staffId: string; file: File }
    >({
      query: ({ staffId, file }) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return {
          url: `/staff/${staffId}/avatar`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { staffId }) => [
        'Employee',
        { type: 'Staff', id: staffId },
        'Staff',
      ],
    }),
  }),
});

export const {
  useGetEmployeeDashboardQuery,
  useGetEmployeeProfileQuery,
  useUpdateEmployeeProfileMutation,
  useUploadEmployeeAvatarMutation,
} = employeeApi;


