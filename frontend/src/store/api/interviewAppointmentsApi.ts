import { apiSlice } from './apiSlice';
import { Interview } from './interviewApi';

export interface InterviewAppointmentsStats {
  total: number;
  today: number;
  upcoming: number;
  completed: number;
}

export const interviewAppointmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInterviewAppointmentsStats: builder.query<
      { success: boolean; data: { stats: InterviewAppointmentsStats } },
      void
    >({
      query: () => '/interview-appointments/stats',
      providesTags: ['InterviewAppointments'],
    }),

    getInterviewAppointments: builder.query<
      {
        success: boolean;
        data: {
          interviews: Interview[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      {
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        interviewerId?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: '/interview-appointments',
        params,
      }),
      providesTags: ['InterviewAppointments'],
    }),

    getInterviewCalendar: builder.query<
      {
        success: boolean;
        data: {
          calendar: Record<string, Interview[]>;
          interviews: Interview[];
        };
      },
      { month?: number; year?: number }
    >({
      query: (params) => ({
        url: '/interview-appointments/calendar',
        params,
      }),
      providesTags: ['InterviewAppointments'],
    }),
  }),
});

export const {
  useGetInterviewAppointmentsStatsQuery,
  useGetInterviewAppointmentsQuery,
  useGetInterviewCalendarQuery,
} = interviewAppointmentsApi;

