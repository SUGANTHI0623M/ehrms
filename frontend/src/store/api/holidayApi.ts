import { apiSlice } from './apiSlice';

export interface Holiday {
  name: string;
  date: string;
  type: 'National' | 'Regional' | 'Company';
}

export const holidayApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEmployeeHolidays: builder.query<
      {
        success: boolean;
        data: {
          holidays: Holiday[];
          upcomingHolidays: Holiday[];
          totalHolidays: number;
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { year?: number; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/holidays/employee',
        params,
      }),
      providesTags: ['Holiday'],
    }),
  }),
});

export const {
  useGetEmployeeHolidaysQuery,
} = holidayApi;


