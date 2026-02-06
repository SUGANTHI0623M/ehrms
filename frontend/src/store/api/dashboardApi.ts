import { apiSlice } from './apiSlice';

export interface DashboardStats {
  totalEmployees: number;
  hiredThisMonth: number;
  avgPerformance: number;
  totalPayroll: number;
}

export interface RecentActivity {
  type: string;
  candidate: string;
  position: string;
  time: string;
}

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<
      {
        success: boolean;
        data: {
          stats: DashboardStats;
          recentActivity: RecentActivity[];
        };
      },
      void
    >({
      query: () => '/dashboard/stats',
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;

