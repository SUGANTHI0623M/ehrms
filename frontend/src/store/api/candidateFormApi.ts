import { apiSlice } from './apiSlice';

export interface CandidateFormData {
  // Personal Details
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternativePhone?: string;
  countryCode?: string;
  dateOfBirth?: string;
  gender?: string;
  currentCity?: string;
  preferredJobLocation?: string;
  resume?: {
    url: string;
    name: string;
    file?: File | any; // Store the actual file for upload
  };

  // Educational Details
  education: Array<{
    qualification: string;
    courseName: string;
    institution: string;
    university: string;
    yearOfPassing: string;
    percentage?: string;
    cgpa?: string;
  }>;

  // Work Experience
  totalYearsOfExperience?: number;
  currentCompany?: string;
  currentJobTitle?: string;
  employmentType?: 'Full-time' | 'Contract' | 'Internship';
  experience: Array<{
    company: string;
    role: string;
    designation: string;
    durationFrom: string;
    durationTo?: string;
    keyResponsibilities?: string;
    reasonForLeaving?: string;
  }>;
  // Courses and Internships (for freshers)
  courses?: Array<{
    courseName: string;
    institution: string;
    startDate?: string;
    completionDate?: string;
    duration?: string;
    description?: string;
    certificateUrl?: string;
  }>;
  internships?: Array<{
    company: string;
    role: string;
    durationFrom: string;
    durationTo?: string;
    keyResponsibilities?: string;
    skillsLearned?: string;
    mentorName?: string;
  }>;

  // Additional
  position?: string;
  primarySkill?: string;
  skills?: string[];
  jobOpeningId?: string;
  interviewId?: string;
}

export interface FormLink {
  _id: string;
  token: string;
  position?: string;
  jobOpeningId?: string;
  expiresAt?: string;
  maxSubmissions?: number;
  submissionCount: number;
  isActive: boolean;
  publicUrl: string;
  createdAt: string;
}

export interface GenerateLinkRequest {
  jobOpeningId?: string;
  position?: string;
  expiresInDays?: number;
  maxSubmissions?: number;
}

export const candidateFormApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Generate form link
    generateFormLink: builder.mutation<
      { success: boolean; data: { link: FormLink; publicUrl: string; token: string } },
      GenerateLinkRequest
    >({
      query: (data) => ({
        url: '/candidate-form/generate-link',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),

    // Get form link by token (public)
    getFormLinkByToken: builder.query<
      {
        success: boolean;
        data: {
          link: {
            position?: string;
            jobOpeningId?: string;
            availableJobOpenings?: Array<{ _id: string; title: string; department?: string }>;
          }
        }
      },
      string
    >({
      query: (token) => `/candidate-form/public/${token}`,
    }),

    // Submit public form
    submitPublicForm: builder.mutation<
      { success: boolean; data: { candidate: any; userAccount: any; message: string } },
      { token: string; formData: CandidateFormData }
    >({
      query: ({ token, formData }) => ({
        url: `/candidate-form/public/${token}/submit`,
        method: 'POST',
        body: formData,
      }),
    }),

    // Create candidate manually
    createCandidateManual: builder.mutation<
      { success: boolean; data: { candidate: any; userAccount?: any }; message: string },
      CandidateFormData
    >({
      query: (formData) => ({
        url: '/candidate-form/manual',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['User'],
    }),

    // Get all form links
    getFormLinks: builder.query<
      { success: boolean; data: { links: FormLink[] } },
      void
    >({
      query: () => '/candidate-form/links',
      providesTags: ['Settings'],
    }),

    // Deactivate form link
    deactivateFormLink: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/candidate-form/links/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Settings'],
    }),

    // Upload resume (public, no auth required)
    uploadPublicResume: builder.mutation<
      { success: boolean; data: { resume: { url: string; name: string } }; message: string },
      File
    >({
      query: (file) => {
        const formData = new FormData();
        formData.append('resume', file);
        return {
          url: '/candidate-form/public/upload-resume',
          method: 'POST',
          body: formData,
        };
      },
    }),

    // Parse resume using Gemini AI (public, no auth required)
    parseResume: builder.mutation<
      { 
        success: boolean; 
        data: { 
          parsedData: any; 
          fileName: string;
        }; 
        message: string 
      },
      File
    >({
      query: (file) => {
        const formData = new FormData();
        formData.append('resume', file);
        return {
          url: '/candidate-form/public/parse-resume',
          method: 'POST',
          body: formData,
        };
      },
    }),

    // Check if candidate with email or phone already exists
    checkCandidateDuplicate: builder.query<
      { success: boolean; data: { exists: boolean; duplicateFields?: string[]; message?: string } },
      { email?: string; phone?: string }
    >({
      query: ({ email, phone }) => {
        const params = new URLSearchParams();
        if (email) params.append('email', email);
        if (phone) params.append('phone', phone);
        return `/candidate-form/check-duplicate?${params.toString()}`;
      },
    }),
    // Mutation version for on-demand checking (better for production)
    checkCandidateDuplicateMutation: builder.mutation<
      { success: boolean; data: { exists: boolean; duplicateFields?: string[]; message?: string } },
      { email?: string; phone?: string }
    >({
      query: ({ email, phone }) => {
        const params = new URLSearchParams();
        if (email) params.append('email', email);
        if (phone) params.append('phone', phone);
        return {
          url: `/candidate-form/check-duplicate?${params.toString()}`,
          method: 'GET',
        };
      },
    }),
    // Send candidate credentials email and/or WhatsApp on demand
    sendCandidateCredentials: builder.mutation<
      { 
        success: boolean; 
        message: string; 
        data: { 
          email: string; 
          candidateName: string;
          channels?: string[];
          emailSent?: boolean;
          whatsappSent?: boolean;
        } 
      },
      string
    >({
      query: (candidateId) => ({
        url: `/candidate-form/${candidateId}/send-credentials`,
        method: 'POST',
      }),
      invalidatesTags: ['Candidate'],
    }),
  }),
});

export const {
  useGenerateFormLinkMutation,
  useGetFormLinkByTokenQuery,
  useSubmitPublicFormMutation,
  useCreateCandidateManualMutation,
  useGetFormLinksQuery,
  useDeactivateFormLinkMutation,
  useUploadPublicResumeMutation,
  useParseResumeMutation,
  useCheckCandidateDuplicateQuery,
  useCheckCandidateDuplicateMutationMutation: useCheckCandidateDuplicateMutation,
  useSendCandidateCredentialsMutation,
} = candidateFormApi;

