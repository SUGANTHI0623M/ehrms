import { apiSlice } from './apiSlice';
import { Candidate } from './candidateApi';
import { Offer } from './offerApi';

export interface HiringCandidate extends Candidate {
  offer?: Offer;
}

export interface ConvertToEmployeeRequest {
  employeeId: string;
  designation: string;
  department: string;
  staffType?: 'Full Time' | 'Part Time' | 'Contract' | 'Intern';
  managerId?: string;
  teamLeaderId?: string;
  hierarchyLevel?: number;
  role?: string;
  permissions?: string[];
  password?: string;
}

export const hiringApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getHiringCandidates: builder.query<
      {
        success: boolean;
        data: {
          candidates: HiringCandidate[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/hiring/candidates',
        params,
      }),
      providesTags: ['Hiring', 'Candidate', 'Offer'],
    }),

    convertCandidateToEmployee: builder.mutation<
      {
        success: boolean;
        data: {
          staff: any;
          defaultPassword?: string;
        };
        message: string;
      },
      { candidateId: string; data: ConvertToEmployeeRequest }
    >({
      query: ({ candidateId, data }) => ({
        url: `/hiring/convert/${candidateId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Hiring', 'Candidate', 'Staff'],
    }),
  }),
});

export const {
  useGetHiringCandidatesQuery,
  useConvertCandidateToEmployeeMutation,
} = hiringApi;

