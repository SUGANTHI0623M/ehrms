import { apiSlice } from './apiSlice';

export type AnnouncementStatus = 'draft' | 'published' | 'expired';
export type AudienceType = 'all' | 'specific';

export interface AnnouncementAttachment {
  name: string;
  path: string;
  mimeType?: string;
  size?: number;
}

export interface AnnouncementSubsection {
  title: string;
  image?: string;
  content: string;
}

export interface Announcement {
  _id: string;
  title: string;
  subject?: string;
  fromName?: string;
  coverImage?: string;
  description: string;
  audienceType: AudienceType;
  targetStaffIds?: { _id: string; name?: string; employeeId?: string }[];
  status: AnnouncementStatus;
  publishDate?: string;
  expiryDate?: string;
  attachments: AnnouncementAttachment[];
  subsections?: AnnouncementSubsection[];
  businessId: string;
  createdBy?: { _id: string; name?: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementsResponse {
  success: boolean;
  data: {
    announcements: Announcement[];
    pagination: { page: number; limit: number; total: number; pages: number };
  };
}

export interface AnnouncementResponse {
  success: boolean;
  data: { announcement: Announcement };
}

export const announcementApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAnnouncements: builder.query<AnnouncementsResponse, { status?: string; page?: number; limit?: number }>({
      query: (params) => ({ url: '/announcements', params }),
      providesTags: (result) =>
        result
          ? [
              ...(result.data.announcements?.map((a) => ({ type: 'Announcements' as const, id: a._id })) ?? []),
              { type: 'Announcements', id: 'LIST' },
            ]
          : [{ type: 'Announcements', id: 'LIST' }],
    }),
    getAnnouncementById: builder.query<AnnouncementResponse, string>({
      query: (id) => `/announcements/${id}`,
      providesTags: (result, _err, id) => (result ? [{ type: 'Announcements', id }] : [{ type: 'Announcements', id }]),
    }),
    createAnnouncement: builder.mutation<AnnouncementResponse, FormData>({
      query: (body) => ({
        url: '/announcements',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Announcements', id: 'LIST' }],
    }),
    updateAnnouncement: builder.mutation<
      AnnouncementResponse,
      { id: string; body: FormData }
    >({
      query: ({ id, body }) => ({
        url: `/announcements/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Announcements', id },
        { type: 'Announcements', id: 'LIST' },
      ],
    }),
    publishAnnouncement: builder.mutation<AnnouncementResponse, string>({
      query: (id) => ({
        url: `/announcements/${id}/publish`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Announcements', id },
        { type: 'Announcements', id: 'LIST' },
      ],
    }),
    deleteAnnouncement: builder.mutation<{ success: boolean; data: { message: string } }, string>({
      query: (id) => ({
        url: `/announcements/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Announcements', id: 'LIST' }],
    }),
    generateAIDescription: builder.mutation<
      { success: boolean; data: { description: string } },
      { title: string; lines?: number; attachments?: File[] }
    >({
      query: (arg) => {
        const hasFiles = arg.attachments && arg.attachments.length > 0;
        const lines = arg.lines != null ? String(arg.lines) : undefined;
        if (hasFiles) {
          const formData = new FormData();
          formData.append('title', arg.title);
          if (lines) formData.append('lines', lines);
          arg.attachments!.forEach((f) => formData.append('attachments', f));
          return {
            url: '/announcements/generate-ai-description',
            method: 'POST',
            body: formData,
          };
        }
        return {
          url: '/announcements/generate-ai-description',
          method: 'POST',
          body: { title: arg.title, ...(arg.lines != null && { lines: arg.lines }) },
        };
      },
    }),
    getEmployeeAnnouncements: builder.query<
      AnnouncementsResponse,
      { page?: number; limit?: number }
    >({
      query: (params) => ({ url: '/announcements/employee', params }),
      providesTags: (result) =>
        result
          ? [
              ...(result.data.announcements?.map((a) => ({ type: 'Announcements' as const, id: `emp-${a._id}` })) ?? []),
              { type: 'Announcements', id: 'EMPLOYEE_LIST' },
            ]
          : [{ type: 'Announcements', id: 'EMPLOYEE_LIST' }],
    }),
    getEmployeeAnnouncementById: builder.query<AnnouncementResponse, string>({
      query: (id) => `/announcements/employee/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Announcements', id: `emp-${id}` }],
    }),
  }),
});

export const {
  useGetAnnouncementsQuery,
  useGetAnnouncementByIdQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  usePublishAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useGenerateAIDescriptionMutation,
  useGetEmployeeAnnouncementsQuery,
  useGetEmployeeAnnouncementByIdQuery,
} = announcementApi;
