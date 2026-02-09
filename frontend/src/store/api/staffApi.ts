import { apiSlice } from './apiSlice';

export interface Staff {
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
  userId?: string | {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  jobOpeningId?: string | {
    _id: string;
    title: string;
    department: string;
  };
  candidateId?: string | {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    position: string;
    jobId?: string | {
      _id: string;
      title: string;
      department: string;
    };
    education?: Array<{
      qualification: string;
      courseName: string;
      institution: string;
      university: string;
      yearOfPassing: string;
      percentage?: string;
      cgpa?: string;
    }>;
    experience?: Array<{
      company: string;
      role: string;
      designation: string;
      durationFrom: string;
      durationTo?: string;
      keyResponsibilities?: string;
      reasonForLeaving?: string;
    }>;
    totalYearsOfExperience?: number;
    skills?: string[];
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    dateOfBirth?: string;
    gender?: string;
    source?: string;
    referrerId?: string | {
      _id: string;
      name: string;
      email: string;
    };
    referralMetadata?: {
      relationship?: string;
      knownPeriod?: string;
      notes?: string;
    };
  };
  managerId?: string;
  branchId?: string | {
    _id: string;
    branchName: string;
    branchCode: string;
  };

  // Policy & Template Assignments
  shiftName?: string;
  attendanceTemplateId?: string | {
    _id: string;
    name: string;
    description?: string;
  };
  leaveTemplateId?: string | {
    _id: string;
    name: string;
    description?: string;
  };
  holidayTemplateId?: string | {
    _id: string;
    name: string;
    description?: string;
  };

  // Personal Info
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dob?: string;
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  bloodGroup?: string;

  // Address
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Bank Details
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    upiId?: string;
  };

  // Employment IDs
  uan?: string;
  pan?: string;
  aadhaar?: string;
  pfNumber?: string;
  esiNumber?: string;

  salary?: {
    gross: number;
    grossMonthly?: number;
    grossYearly?: number;
    net: number;
    netMonthly?: number;
    netYearly?: number;
    ctcYearly?: number;
    components: Array<{
      name: string;
      amount: number;
      amountMonthly?: number;
      amountYearly?: number;
      type: 'earning' | 'deduction';
      section?: 'Fixed' | 'Variables' | 'Benefits' | 'Allowances' | 'Deductions';
      percentage?: string;
    }>;
  };
  offerLetterUrl?: string;
  offerLetterParsedAt?: string;
}

export interface StaffStats {
  total: number;
  active: number;
  onLeave: number;
  deactivated: number;
}

export interface CreateStaffRequest {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  staffType: 'Full Time' | 'Part Time' | 'Contract' | 'Intern';
  status?: 'Active' | 'On Leave' | 'Deactivated';
  branchId?: string;
  password?: string; // Optional password for user account creation
  shiftName?: string;
  attendanceTemplateId?: string;
  leaveTemplateId?: string;
  holidayTemplateId?: string;
  salary?: {
    gross: number;
    grossMonthly?: number;
    grossYearly?: number;
    net: number;
    netMonthly?: number;
    netYearly?: number;
    ctcYearly?: number;
    components: Array<{
      name: string;
      amount: number;
      amountMonthly?: number;
      amountYearly?: number;
      type: 'earning' | 'deduction';
      section?: 'Fixed' | 'Variables' | 'Benefits' | 'Allowances' | 'Deductions';
      percentage?: string;
    }>;
  };
}

export const staffApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStaff: builder.query<
      {
        success: boolean;
        data: {
          staff: Staff[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { search?: string; status?: string; department?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/staff',
        params,
      }),
      providesTags: ['Staff'],
    }),
    getStaffStats: builder.query<{ success: boolean; data: { stats: StaffStats } }, void>({
      query: () => '/staff/stats',
      providesTags: ['Staff'],
    }),
    getStaffById: builder.query<{ success: boolean; data: { staff: Staff } }, string>({
      query: (id) => `/staff/${id}`,
      providesTags: (result, error, id) => [{ type: 'Staff', id }],
    }),
    createStaff: builder.mutation<
      { success: boolean; data: { staff: Staff } },
      CreateStaffRequest
    >({
      query: (staffData) => ({
        url: '/staff',
        method: 'POST',
        body: staffData,
      }),
      invalidatesTags: ['Staff'],
    }),
    updateStaff: builder.mutation<
      { success: boolean; data: { staff: Staff } },
      { id: string; data: Partial<Staff> }
    >({
      query: ({ id, data }) => ({
        url: `/staff/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Staff', id }, 'Staff'],
    }),
    deleteStaff: builder.mutation<{ success: boolean; data: { message: string } }, string>({
      query: (id) => ({
        url: `/staff/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Staff'],
    }),
    getAvailableShifts: builder.query<
      { success: boolean; data: { shifts: Array<{ name: string; startTime: string; endTime: string }> } },
      void
    >({
      query: () => '/staff/available-shifts',
      providesTags: ['Settings'],
    }),
    getAvailableTemplates: builder.query<
      {
        success: boolean;
        data: {
          attendanceTemplates: Array<{ _id: string; name: string; description?: string }>;
          leaveTemplates: Array<{ _id: string; name: string; description?: string }>;
          holidayTemplates: Array<{ _id: string; name: string; description?: string }>;
        };
      },
      void
    >({
      query: () => '/staff/available-templates',
      providesTags: ['Settings'],
    }),
    uploadOfferLetter: builder.mutation<
      {
        success: boolean;
        data: {
          staff: Staff;
          parsedSalary: {
            gross: number;
            net: number;
            components: Array<{
              name: string;
              amount: number;
              type: 'earning' | 'deduction';
            }>;
            currency?: string;
            frequency?: 'Monthly' | 'Annual' | 'Hourly';
          };
          message: string;
        };
      },
      { staffId: string; file: File }
    >({
      query: ({ staffId, file }) => {
        const formData = new FormData();
        formData.append('offerLetter', file);
        return {
          url: `/staff/${staffId}/offer-letter`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { staffId }) => [
        { type: 'Staff', id: staffId },
        'Staff',
      ],
    }),
    updateSalaryStructure: builder.mutation<
      { success: boolean; data: { staff: Staff } },
      { staffId: string; salary: Staff['salary'] }
    >({
      query: ({ staffId, salary }) => ({
        url: `/staff/${staffId}/salary`,
        method: 'PATCH',
        body: { salary },
      }),
      invalidatesTags: (result, error, { staffId }) => [
        { type: 'Staff', id: staffId },
        'Staff',
      ],
    }),
  }),
});

export const {
  useGetStaffQuery,
  useGetStaffStatsQuery,
  useGetStaffByIdQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useGetAvailableShiftsQuery,
  useGetAvailableTemplatesQuery,
  useUploadOfferLetterMutation,
  useUpdateSalaryStructureMutation,
} = staffApi;

