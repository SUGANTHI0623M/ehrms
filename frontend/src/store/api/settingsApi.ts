import { apiSlice } from './apiSlice';

export interface Business {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  registeredAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  logo?: string;
  settings: {
    attendance: {
      geofence: {
        enabled: boolean;
        latitude?: number;
        longitude?: number;
        radius?: number;
      };
      shifts: Array<{
        name: string;
        startTime: string;
        endTime: string;
      }>;
      automationRules?: {
        autoMarkAbsent?: boolean;
        autoMarkHalfDay?: boolean;
        allowAttendanceOnWeeklyOff?: boolean;
      };
    };
    business?: {
      weeklyHolidays?: Array<{
        day: number;
        name?: string;
      }>;
      weeklyOffPattern?: 'standard' | 'oddEvenSaturday';
      allowAttendanceOnWeeklyOff?: boolean;
    };
    payroll: {
      calculationLogic: string;
      payslipCustomization: any;
    };
  };
}

export interface HolidayTemplate {
  _id: string;
  name: string;
  description?: string;
  holidays: Array<{
    name: string;
    date: string;
    type: 'National' | 'Regional' | 'Company';
  }>;
  businessId: string;
  assignedStaff?: Array<{
    _id: string;
    name: string;
    employeeId: string;
  }>;
  assignedStaffCount?: number;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveTemplate {
  _id: string;
  name: string;
  description?: string;
  leaveTypes: Array<{
    type: string;
    days: number;
    carryForward: boolean;
    maxCarryForward?: number;
  }>;
  businessId: string;
  assignedStaff?: Array<{
    _id: string;
    name: string;
    employeeId: string;
  }>;
  assignedStaffCount?: number;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceTemplate {
  _id: string;
  name: string;
  description?: string;
  businessId: string;
  settings: {
    requireGeolocation: boolean;
    requireSelfie: boolean;
    allowAttendanceOnHolidays: boolean;
    allowAttendanceOnWeeklyOff: boolean;
    lateEntryAllowed: boolean;
    earlyExitAllowed: boolean;
    overtimeAllowed: boolean;
  };
  assignedStaff?: Array<{
    _id: string;
    name: string;
    employeeId: string;
  }>;
  assignedStaffCount?: number;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CelebrationSettings {
  _id: string;
  businessId: string;
  birthdays: {
    setReminder: boolean;
    sendWishesToEmployees: boolean;
    remindersOnLens: boolean;
  };
  anniversaries: {
    sendWishesToEmployees: boolean;
    remindersOnLens: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BusinessFunction {
  _id: string;
  name: string;
  type: 'Department' | 'Function' | 'Team';
  businessId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  businessId: string;
  permissions: {
    [module: string]: {
      [action: string]: boolean;
    };
  };
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffCustomField {
  _id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'dropdown' | 'textarea' | 'boolean';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  businessId: string;
  category: 'Profile Information' | 'General Information' | 'Personal Information' | 'Employment Information' | 'Bank Details' | 'Custom';
  order: number;
  isActive: boolean;
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

export interface TaskCustomField {
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

export interface BusinessUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
}

export const settingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBusiness: builder.query<{ success: boolean; data: { business: Business } }, void>({
      query: () => '/settings/business',
      providesTags: ['Settings'],
    }),
    updateBusiness: builder.mutation<
      { success: boolean; data: { business: Business } },
      Partial<Business>
    >({
      query: (businessData) => ({
        url: '/settings/business',
        method: 'PUT',
        body: businessData,
      }),
      invalidatesTags: ['Settings'],
    }),
    getHolidayTemplates: builder.query<
      { success: boolean; data: { templates: HolidayTemplate[] } },
      void
    >({
      query: () => '/settings/holiday-templates',
      providesTags: ['HolidayTemplates'],
    }),
    getHolidayTemplateById: builder.query<
      { success: boolean; data: { template: HolidayTemplate } },
      string
    >({
      query: (id) => `/settings/holiday-templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'HolidayTemplates', id }],
    }),
    createHolidayTemplate: builder.mutation<
      { success: boolean; data: { template: HolidayTemplate } },
      Partial<HolidayTemplate>
    >({
      query: (templateData) => ({
        url: '/settings/holiday-templates',
        method: 'POST',
        body: templateData,
      }),
      invalidatesTags: ['HolidayTemplates', 'Settings'],
    }),
    updateHolidayTemplate: builder.mutation<
      { success: boolean; data: { template: HolidayTemplate } },
      { id: string; data: Partial<HolidayTemplate> }
    >({
      query: ({ id, data }) => ({
        url: `/settings/holiday-templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'HolidayTemplates', id }, 'HolidayTemplates', 'Settings'],
    }),
    deleteHolidayTemplate: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/settings/holiday-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['HolidayTemplates', 'Settings'],
    }),
    assignStaffToHolidayTemplate: builder.mutation<
      { success: boolean; data: { template: HolidayTemplate } },
      { id: string; staffIds: string[] }
    >({
      query: ({ id, staffIds }) => ({
        url: `/settings/holiday-templates/${id}/assign-staff`,
        method: 'POST',
        body: { staffIds },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'HolidayTemplates', id }, 'HolidayTemplates'],
    }),
    getLeaveTemplates: builder.query<
      { success: boolean; data: { templates: LeaveTemplate[] } },
      void
    >({
      query: () => '/settings/leave-templates',
      providesTags: ['LeaveTemplates'],
    }),
    getLeaveTemplateById: builder.query<
      { success: boolean; data: { template: LeaveTemplate } },
      string
    >({
      query: (id) => `/settings/leave-templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'LeaveTemplates', id }],
    }),
    createLeaveTemplate: builder.mutation<
      { success: boolean; data: { template: LeaveTemplate } },
      Partial<LeaveTemplate>
    >({
      query: (templateData) => ({
        url: '/settings/leave-templates',
        method: 'POST',
        body: templateData,
      }),
      invalidatesTags: ['LeaveTemplates', 'Settings'],
    }),
    updateLeaveTemplate: builder.mutation<
      { success: boolean; data: { template: LeaveTemplate } },
      { id: string; data: Partial<LeaveTemplate> }
    >({
      query: ({ id, data }) => ({
        url: `/settings/leave-templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'LeaveTemplates', id }, 'LeaveTemplates', 'Settings'],
    }),
    deleteLeaveTemplate: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/settings/leave-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['LeaveTemplates', 'Settings'],
    }),
    assignStaffToLeaveTemplate: builder.mutation<
      { success: boolean; data: { template: LeaveTemplate } },
      { id: string; staffIds: string[] }
    >({
      query: ({ id, staffIds }) => ({
        url: `/settings/leave-templates/${id}/assign-staff`,
        method: 'POST',
        body: { staffIds },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'LeaveTemplates', id }, 'LeaveTemplates'],
    }),
    // Attendance Settings
    updateAttendanceSettings: builder.mutation<
      { success: boolean; data: { settings: Business['settings']['attendance'] } },
      { geofence?: Partial<Business['settings']['attendance']['geofence']>; shifts?: Business['settings']['attendance']['shifts']; automationRules?: Partial<Business['settings']['attendance']['automationRules']> }
    >({
      query: (settingsData) => ({
        url: '/settings/attendance',
        method: 'PUT',
        body: settingsData,
      }),
      invalidatesTags: ['Settings'],
    }),
    // Weekly Holidays
    updateWeeklyHolidays: builder.mutation<
      { success: boolean; data: { weeklyHolidays: Array<{ day: number; name?: string }>; weeklyOffPattern?: 'standard' | 'oddEvenSaturday'; allowAttendanceOnWeeklyOff: boolean } },
      { weeklyHolidays?: Array<{ day: number; name?: string }>; weeklyOffPattern?: 'standard' | 'oddEvenSaturday'; allowAttendanceOnWeeklyOff?: boolean }
    >({
      query: (data) => ({
        url: '/settings/business/weekly-holidays',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),
    // Attendance Templates
    getAttendanceTemplates: builder.query<
      { success: boolean; data: { templates: AttendanceTemplate[] } },
      void
    >({
      query: () => '/settings/attendance-templates',
      providesTags: ['AttendanceTemplates'],
    }),
    createAttendanceTemplate: builder.mutation<
      { success: boolean; data: { template: AttendanceTemplate } },
      Partial<AttendanceTemplate>
    >({
      query: (templateData) => ({
        url: '/settings/attendance-templates',
        method: 'POST',
        body: templateData,
      }),
      invalidatesTags: ['AttendanceTemplates', 'Settings'],
    }),
    updateAttendanceTemplate: builder.mutation<
      { success: boolean; data: { template: AttendanceTemplate } },
      { id: string; data: Partial<AttendanceTemplate> }
    >({
      query: ({ id, data }) => ({
        url: `/settings/attendance-templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['AttendanceTemplates', 'Settings'],
    }),
    deleteAttendanceTemplate: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/settings/attendance-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AttendanceTemplates', 'Settings'],
    }),
    getAttendanceSettings: builder.query<{ success: boolean; data: { settings: Business['settings']['attendance'] } }, void>({
      query: () => '/settings/attendance',
      providesTags: ['Settings'],
    }),
    // Celebration Settings
    getCelebrationSettings: builder.query<
      { success: boolean; data: { settings: CelebrationSettings } },
      void
    >({
      query: () => '/settings/celebrations',
      providesTags: ['Settings'],
    }),
    updateCelebrationSettings: builder.mutation<
      { success: boolean; data: { settings: CelebrationSettings } },
      Partial<CelebrationSettings>
    >({
      query: (settingsData) => ({
        url: '/settings/celebrations',
        method: 'PUT',
        body: settingsData,
      }),
      invalidatesTags: ['Settings'],
    }),
    // Business Functions
    getBusinessFunctions: builder.query<
      { success: boolean; data: { functions: BusinessFunction[] } },
      void
    >({
      query: () => '/settings/business-functions',
      providesTags: ['BusinessFunctions'],
    }),
    createBusinessFunction: builder.mutation<
      { success: boolean; data: { function: BusinessFunction } },
      Partial<BusinessFunction>
    >({
      query: (functionData) => ({
        url: '/settings/business-functions',
        method: 'POST',
        body: functionData,
      }),
      invalidatesTags: ['BusinessFunctions'],
    }),
    updateBusinessFunction: builder.mutation<
      { success: boolean; data: { function: BusinessFunction } },
      { id: string; data: Partial<BusinessFunction> }
    >({
      query: ({ id, data }) => ({
        url: `/settings/business-functions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['BusinessFunctions'],
    }),
    deleteBusinessFunction: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/settings/business-functions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BusinessFunctions'],
    }),
    // Roles & Permissions
    getRoles: builder.query<
      { success: boolean; data: { roles: Role[] } },
      void
    >({
      query: () => '/settings/roles',
      providesTags: ['Roles'],
    }),
    createRole: builder.mutation<
      { success: boolean; data: { role: Role } },
      Partial<Role>
    >({
      query: (roleData) => ({
        url: '/settings/roles',
        method: 'POST',
        body: roleData,
      }),
      invalidatesTags: ['Roles'],
    }),
    updateRole: builder.mutation<
      { success: boolean; data: { role: Role } },
      { id: string; data: Partial<Role> }
    >({
      query: ({ id, data }) => ({
        url: `/settings/roles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Roles'],
    }),
    deleteRole: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/settings/roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Roles'],
    }),
    // Staff Custom Fields
    getStaffCustomFields: builder.query<
      { success: boolean; data: { fields: StaffCustomField[]; groupedFields: Record<string, StaffCustomField[]> } },
      void
    >({
      query: () => '/settings/staff-custom-fields',
      providesTags: ['StaffCustomFields'],
    }),
    createStaffCustomField: builder.mutation<
      { success: boolean; data: { field: StaffCustomField } },
      Partial<StaffCustomField>
    >({
      query: (fieldData) => ({
        url: '/settings/staff-custom-fields',
        method: 'POST',
        body: fieldData,
      }),
      invalidatesTags: ['StaffCustomFields'],
    }),
    updateStaffCustomField: builder.mutation<
      { success: boolean; data: { field: StaffCustomField } },
      { id: string; data: Partial<StaffCustomField> }
    >({
      query: ({ id, data }) => ({
        url: `/settings/staff-custom-fields/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['StaffCustomFields'],
    }),
    deleteStaffCustomField: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/settings/staff-custom-fields/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['StaffCustomFields'],
    }),
    // Customer Data Fields
    getCustomerDataFields: builder.query<
      { success: boolean; data: { fields: CustomerDataField[] } },
      void
    >({
      query: () => '/settings/customer-data-fields',
      providesTags: ['CustomerDataFields'],
    }),
    createCustomerDataField: builder.mutation<
      { success: boolean; data: { field: CustomerDataField } },
      Partial<CustomerDataField>
    >({
      query: (fieldData) => ({
        url: '/settings/customer-data-fields',
        method: 'POST',
        body: fieldData,
      }),
      invalidatesTags: ['CustomerDataFields'],
    }),
    updateCustomerDataField: builder.mutation<
      { success: boolean; data: { field: CustomerDataField } },
      { id: string; data: Partial<CustomerDataField> }
    >({
      query: ({ id, data }) => ({
        url: `/settings/customer-data-fields/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['CustomerDataFields'],
    }),
    deleteCustomerDataField: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/settings/customer-data-fields/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CustomerDataFields'],
    }),
    // Task Custom Fields
    getTaskCustomFields: builder.query<
      { success: boolean; data: { fields: TaskCustomField[] } },
      void
    >({
      query: () => '/settings/task-custom-fields',
      providesTags: ['TaskCustomFields'],
    }),
    createTaskCustomField: builder.mutation<
      { success: boolean; data: { field: TaskCustomField } },
      Partial<TaskCustomField>
    >({
      query: (fieldData) => ({
        url: '/settings/task-custom-fields',
        method: 'POST',
        body: fieldData,
      }),
      invalidatesTags: ['TaskCustomFields'],
    }),
    updateTaskCustomField: builder.mutation<
      { success: boolean; data: { field: TaskCustomField } },
      { id: string; data: Partial<TaskCustomField> }
    >({
      query: ({ id, data }) => ({
        url: `/settings/task-custom-fields/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['TaskCustomFields'],
    }),
    deleteTaskCustomField: builder.mutation<
      { success: boolean; data: { message: string } },
      string
    >({
      query: (id) => ({
        url: `/settings/task-custom-fields/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TaskCustomFields'],
    }),
    // Manage Users
    getBusinessUsers: builder.query<
      { success: boolean; data: { users: BusinessUser[] } },
      { roleType?: string; search?: string }
    >({
      query: (params) => ({
        url: '/settings/business-users',
        params,
      }),
      providesTags: ['BusinessUsers'],
    }),

    // Task Settings
    getTaskSettings: builder.query<
      { success: boolean; data: { settings: { autoApprove: boolean; requireApprovalOnComplete: boolean; enableOtpVerification: boolean; staffWhoCanSchedule: string[] } } },
      void
    >({
      query: () => '/settings/task-settings',
      providesTags: ['TaskSettings'],
    }),

    updateTaskSettings: builder.mutation<
      { success: boolean; data: { settings: any } },
      { autoApprove?: boolean; requireApprovalOnComplete?: boolean; enableOtpVerification?: boolean; staffWhoCanSchedule?: string[] }
    >({
      query: (data) => ({
        url: '/settings/task-settings',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['TaskSettings'],
    }),

    // Geo Settings
    getGeoSettings: builder.query<
      { success: boolean; data: { enabled: boolean } },
      void
    >({
      query: () => '/settings/geo-settings',
      providesTags: ['GeoSettings'],
    }),

    updateGeoSettings: builder.mutation<
      { success: boolean; data: { enabled: boolean } },
      { enabled: boolean }
    >({
      query: (data) => ({
        url: '/settings/geo-settings',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['GeoSettings'],
    }),
  }),
});

export const {
  useGetBusinessQuery,
  useUpdateBusinessMutation,
  useGetHolidayTemplatesQuery,
  useGetHolidayTemplateByIdQuery,
  useCreateHolidayTemplateMutation,
  useUpdateHolidayTemplateMutation,
  useDeleteHolidayTemplateMutation,
  useAssignStaffToHolidayTemplateMutation,
  useGetLeaveTemplatesQuery,
  useGetLeaveTemplateByIdQuery,
  useCreateLeaveTemplateMutation,
  useUpdateLeaveTemplateMutation,
  useDeleteLeaveTemplateMutation,
  useAssignStaffToLeaveTemplateMutation,
  useUpdateAttendanceSettingsMutation,
  useUpdateWeeklyHolidaysMutation,
  useGetAttendanceTemplatesQuery,
  useCreateAttendanceTemplateMutation,
  useUpdateAttendanceTemplateMutation,
  useDeleteAttendanceTemplateMutation,
  useGetAttendanceSettingsQuery,
  useGetCelebrationSettingsQuery,
  useUpdateCelebrationSettingsMutation,
  useGetBusinessFunctionsQuery,
  useCreateBusinessFunctionMutation,
  useUpdateBusinessFunctionMutation,
  useDeleteBusinessFunctionMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetStaffCustomFieldsQuery,
  useCreateStaffCustomFieldMutation,
  useUpdateStaffCustomFieldMutation,
  useDeleteStaffCustomFieldMutation,
  useGetCustomerDataFieldsQuery,
  useCreateCustomerDataFieldMutation,
  useUpdateCustomerDataFieldMutation,
  useDeleteCustomerDataFieldMutation,
  useGetTaskCustomFieldsQuery,
  useCreateTaskCustomFieldMutation,
  useUpdateTaskCustomFieldMutation,
  useDeleteTaskCustomFieldMutation,
  useGetBusinessUsersQuery,
  useGetTaskSettingsQuery,
  useUpdateTaskSettingsMutation,
  useGetGeoSettingsQuery,
  useUpdateGeoSettingsMutation,
} = settingsApi;

