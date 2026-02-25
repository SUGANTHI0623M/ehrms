import { apiSlice } from './apiSlice';

export type CelebrationType = 'birthday' | 'work_anniversary';

export interface CelebrationTemplate {
  _id: string;
  name: string;
  type: string;
  messageBody: string;
  sendTime: string;
  autoSend: boolean;
  assignAllStaff: boolean;
  assignedDepartmentIds?: string[];
  assignedDepartmentNames?: string[];
  assignedStaffIds?: string[];
  assignedStaffCount?: number;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingBirthday {
  staff: { _id: string; name: string; email?: string; department: string; dob?: string; joiningDate: string };
  date: string;
  isToday: boolean;
  templateAutoSend?: boolean;
  templateId?: string | null;
}

export interface UpcomingAnniversary {
  staff: { _id: string; name: string; email?: string; department: string; joiningDate: string };
  date: string;
  isToday: boolean;
  yearsOfService: number;
  templateAutoSend?: boolean;
  templateId?: string | null;
}

export interface MyCelebrationToday {
  hasCelebration: boolean;
  type?: 'birthday' | 'work_anniversary';
  greeting?: string;
  messageBody?: string;
  companyName?: string;
  yearsOfService?: number;
}

export const celebrationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTemplates: builder.query<{ success: boolean; data: CelebrationTemplate[] }, void>({
      query: () => '/celebration/templates',
      providesTags: ['CelebrationTemplates'],
    }),
    getTemplateById: builder.query<
      { success: boolean; data: CelebrationTemplate & { assignedStaffIds?: string[] } },
      string
    >({
      query: (id) => `/celebration/templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'CelebrationTemplates', id }],
    }),
    createTemplate: builder.mutation<
      { success: boolean; data: CelebrationTemplate },
      Partial<CelebrationTemplate> & { name: string; type: string }
    >({
      query: (body) => ({
        url: '/celebration/templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CelebrationTemplates'],
    }),
    updateTemplate: builder.mutation<
      { success: boolean; data: CelebrationTemplate },
      { id: string; data: Partial<CelebrationTemplate> }
    >({
      query: ({ id, data }) => ({
        url: `/celebration/templates/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'CelebrationTemplates', id }, 'CelebrationTemplates'],
    }),
    deleteTemplate: builder.mutation<{ success: boolean; data: { message: string } }, string>({
      query: (id) => ({
        url: `/celebration/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CelebrationTemplates'],
    }),
    getUpcoming: builder.query<
      {
        success: boolean;
        data: { birthdays: UpcomingBirthday[]; anniversaries: UpcomingAnniversary[] };
      },
      { year?: number; month?: number }
    >({
      query: (params) => {
        const search = new URLSearchParams();
        if (params?.year != null) search.set('year', String(params.year));
        if (params?.month != null) search.set('month', String(params.month));
        return `/celebration/upcoming?${search.toString()}`;
      },
      providesTags: ['CelebrationTemplates'],
    }),
    sendWishNow: builder.mutation<{ success: boolean; data: { message: string } }, { templateId: string; staffId: string }>({
      query: (body) => ({
        url: '/celebration/send-wish-now',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CelebrationTemplates'],
    }),
    getMyCelebrationToday: builder.query<{ success: boolean; data: MyCelebrationToday | null }, void>({
      query: () => '/celebration/my-celebration-today',
      providesTags: ['CelebrationTemplates'],
    }),
    generateCelebrationMessage: builder.mutation<
      { success: boolean; data: { message: string } },
      { type: CelebrationType; tonePreset?: string; toneDescription?: string }
    >({
      query: (body) => ({
        url: '/celebration/generate-message',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetTemplateByIdQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useGetUpcomingQuery,
  useSendWishNowMutation,
  useGetMyCelebrationTodayQuery,
  useGenerateCelebrationMessageMutation,
} = celebrationApi;
