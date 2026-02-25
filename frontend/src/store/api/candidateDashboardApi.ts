import { apiSlice } from './apiSlice';

export interface CandidateDashboardData {
  profile: {
    name: string;
    email: string;
    phone?: string;
  };
  activeJobOpenings: number;
  applicationStats: {
    total: number;
    applied: number;
    screening: number;
    shortlisted: number;
    interview: number;
    offer: number;
    hired: number;
    rejected: number;
  };
  recentApplications: Array<{
    id: string;
    position: string;
    status: string;
    appliedDate: string;
    updatedDate: string;
  }>;
  allApplications: Array<{
    id: string;
    position: string;
    status: string;
    primarySkill: string;
    appliedDate: string;
    updatedDate: string;
  }>;
}

export interface JobVacancy {
  _id: string;
  position: string;
  department: string;
  description: string;
  requirements: string[];
  skills: string[];
  location?: string;
  employmentType: 'Full-time' | 'Contract' | 'Internship';
  openPositions: number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  latestUpdate: string;
  createdAt: string;
  // Application status for this candidate
  hasApplied: boolean;
  applicationStatus: string | null;
  canReapply: boolean;
}

export interface Application {
  id: string;
  position: string;
  status: string;
  primarySkill: string;
  appliedDate: string;
  lastUpdated: string;
  expectedJoining?: string;
}

export interface CandidateProfile {
  profile: {
    name: string;
    email: string;
    phone?: string;
    countryCode?: string;
    profilePicture?: string;
  };
  candidateData: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryCode?: string;
    dateOfBirth?: string;
    gender?: string;
    currentCity?: string;
    preferredJobLocation?: string;
    position: string;
    primarySkill: string;
    skills: string[];
    location?: string;
    education: Array<{
      qualification: string;
      courseName: string;
      institution: string;
      university: string;
      yearOfPassing: string;
      percentage?: string;
      cgpa?: string;
    }>;
    experience: Array<{
      company: string;
      role: string;
      designation: string;
      durationFrom: string;
      durationTo?: string;
      reasonForLeaving?: string;
    }>;
    documents: Array<{
      type: string;
      url: string;
      name: string;
    }>;
    resume?: {
      url: string;
      name: string;
      uploadedAt: string;
    };
    status: string;
  } | null;
}

export const candidateDashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get candidate dashboard
    getCandidateDashboard: builder.query<
      { success: boolean; data: CandidateDashboardData },
      void
    >({
      query: () => '/candidate/dashboard',
      providesTags: ['Dashboard'],
    }),

    // Get job openings (renamed from job vacancies)
    getJobVacancies: builder.query<
      { success: boolean; data: { jobVacancies: JobVacancy[] } },
      void
    >({
      query: () => '/candidate/job-vacancies',
      providesTags: ['Dashboard', 'JobOpening'],
    }),

    // Apply or reapply for a job opening
    applyForJob: builder.mutation<
      { success: boolean; data: { candidate: any; isReapplication: boolean }; message: string },
      { jobId: string; formData?: any; skipValidation?: boolean }
    >({
      query: (data) => ({
        url: '/candidate/apply',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Dashboard', 'JobOpening'],
    }),

    // Get application status
    getApplicationStatus: builder.query<
      { success: boolean; data: { applications: Application[] } },
      void
    >({
      query: () => '/candidate/applications',
      providesTags: ['Dashboard'],
    }),

    // Get candidate profile
    getCandidateProfile: builder.query<
      { success: boolean; data: CandidateProfile },
      void
    >({
      query: () => '/candidate/profile',
      providesTags: ['User'],
    }),

    // Update candidate profile
    updateCandidateProfile: builder.mutation<
      { success: boolean; data: { candidate: any }; message?: string },
      any
    >({
      query: (data) => ({
        url: '/candidate/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User', 'Dashboard'],
    }),

    // Change password
    changePassword: builder.mutation<
      { success: boolean; message: string },
      { currentPassword: string; newPassword: string; confirmPassword: string }
    >({
      query: (data) => ({
        url: '/candidate/change-password',
        method: 'POST',
        body: data,
      }),
    }),

    // Upload profile picture
    uploadProfilePicture: builder.mutation<
      { success: boolean; data: { profilePicture: string }; message: string },
      FormData
    >({
      query: (formData) => ({
        url: '/candidate/profile-picture',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User', 'Dashboard'],
    }),

    // Upload resume
    uploadResume: builder.mutation<
      { success: boolean; data: { resume: { url: string; name: string; uploadedAt: string } }; message: string },
      FormData
    >({
      query: (formData) => ({
        url: '/candidate/resume',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User', 'Dashboard'],
    }),
  }),
});

export const {
  useGetCandidateDashboardQuery,
  useGetJobVacanciesQuery,
  useGetApplicationStatusQuery,
  useGetCandidateProfileQuery,
  useUpdateCandidateProfileMutation,
  useApplyForJobMutation,
  useChangePasswordMutation,
  useUploadProfilePictureMutation,
  useUploadResumeMutation,
} = candidateDashboardApi;

