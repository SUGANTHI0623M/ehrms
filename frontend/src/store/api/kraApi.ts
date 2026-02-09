import { apiSlice } from './apiSlice';

export interface KRA {
  _id: string;
  employeeId?: {
    _id: string;
    name: string;
    employeeId: string;
  };
  title: string;
  description?: string;
  kpi: string;
  target: string;
  currentValue?: string;
  status: 'Pending' | 'At risk' | 'Needs attention' | 'On track' | 'Closed';
  timeframe: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  startDate: string;
  endDate: string;
  overallPercent: number;
  milestones: Array<{
    name: string;
    target: string;
    achieved: boolean;
    achievedAt?: string;
  }>;
}

export const kraApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getKRAs: builder.query<
      {
        success: boolean;
        data: {
          kras: KRA[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { employeeId?: string; status?: string; timeframe?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/performance/kra',
        params,
      }),
      providesTags: ['Performance'],
    }),
    createKRA: builder.mutation<
      { success: boolean; data: { kra: KRA } },
      Partial<KRA>
    >({
      query: (kraData) => ({
        url: '/performance/kra',
        method: 'POST',
        body: kraData,
      }),
      invalidatesTags: ['Performance'],
    }),
    updateKRA: builder.mutation<
      { success: boolean; data: { kra: KRA } },
      { id: string; data: Partial<KRA> }
    >({
      query: ({ id, data }) => ({
        url: `/performance/kra/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Performance', id }, 'Performance'],
    }),
  }),
});

export const {
  useGetKRAsQuery,
  useCreateKRAMutation,
  useUpdateKRAMutation,
} = kraApi;

