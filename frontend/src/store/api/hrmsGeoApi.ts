import { apiSlice } from './apiSlice';

export interface HRMSGeoDashboardData {
  summary: {
    totalEmployees: number;
    activeEmployees: number;
    totalTasks: number;
    completedTasks: number;
    totalDistance: number;
    customersAddedToday: number;
    customersServedToday: number;
  };
  employeeStatus: {
    totalEmployees: number;
    notStarted: number;
    punchedIn: number;
    punchedOut: number;
  };
  tasks: {
    totalTasks: number;
    pendingTasks: number;
    notYetStarted: number;
    inProgress: number;
    waitingForApproval: number;
    completedTasks: number;
    exitOnArrival: number;
    exited: number;
    reopened: number;
    rejected: number;
    hold: number;
    delayedTasks: number;
  };
  customers: {
    customersAddedToday: number;
    customersServedToday: number;
  };
  distanceData: Array<{
    date: string;
    distance: number;
  }>;
  businessOverview: Array<{
    name: string;
    email?: string;
    staffId: string;
    punchedInAt: string;
    punchedOutAt: string;
    totalTasksCompleted: number;
    totalFormsAdded: number;
    average: string;
  }>;
  businessOverviewPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  dateRange: {
    start: string;
    end: string;
  } | null;
}

export const hrmsGeoApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getHRMSGeoDashboard: builder.query<
      { success: boolean; data: HRMSGeoDashboardData },
      { startDate?: string; endDate?: string; staffId?: string; page?: number; limit?: number; search?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.staffId) queryParams.append('staffId', params.staffId);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        const queryString = queryParams.toString();
        return `/hrms-geo/dashboard${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['HRMSGeoDashboard'],
    }),
  }),
});

export const { useGetHRMSGeoDashboardQuery, useLazyGetHRMSGeoDashboardQuery } = hrmsGeoApi;

