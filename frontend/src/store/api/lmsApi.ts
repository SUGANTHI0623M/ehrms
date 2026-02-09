import { apiSlice } from './apiSlice';
import { LearningEngineData } from '@/types/lmsEngine';

export interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  language?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  duration?: number;
  status: 'Draft' | 'Published' | 'Archived';
  isMandatory?: boolean;
  assignmentType?: 'DEPARTMENT' | 'INDIVIDUAL' | 'ALL';
  departments?: string[];
  assignedEmployees?: string[];
  qualificationScore?: number;
  isLiveAssessment?: boolean;
  assessmentQuestions?: Array<{
    lessonTitle: string;
    questions: Array<{
      id: string;
      type: 'MCQ' | 'Multiple Correct' | 'True / False' | 'Short Answer';
      questionText: string;
      options?: string[];
      correctAnswers: string[];
      marks: number;
    }>;
  }>;
  completionDuration?: {
    value: number;
    unit: 'Days' | 'Weeks' | 'Months';
  };
  materials?: Array<{
    title: string;
    lessonTitle?: string;
    type: 'YOUTUBE' | 'PDF' | 'VIDEO' | 'DRIVE' | 'URL';
    url?: string;
    filePath?: string;
    originalFileName?: string;
  }>;
  slug?: string;
  instructor?: string;
  tags?: string[];
  enrolledUsers?: string[];
  completionRate?: number;
  rating?: number;
  totalRatings?: number;
  createdAt?: string;
  updatedAt?: string;
  contents?: CourseContentItem[];
}

export interface CourseContentItem {
  _id: string;
  contentType: 'YouTube' | 'ExternalLink' | 'PDF' | 'PPT' | 'Image' | 'Video';
  title: string;
  description?: string;
  order: number;
  youtubeUrl?: string;
  externalUrl?: string;
  fileUrl?: string;
  duration?: number;
}

export interface CourseProgress {
  _id: string;
  courseId: string;
  employeeId: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Failed';
  completionPercentage: number;
  contentProgress: Array<{
    contentId: string;
    viewed: boolean;
    viewedAt?: string;
  }>;
  assessmentStatus?: 'Not Started' | 'In Progress' | 'Passed' | 'Failed';
  assessmentScore?: number;
  assessmentAttempts?: number;
  lastAssessmentDate?: string;
  createdAt: string;
}

export interface Quiz {
  _id: string;
  courseId?: string;
  title: string;
  description?: string;
  questions: Array<{
    question: string;
    type: 'multiple-choice' | 'true-false' | 'short-answer';
    options?: string[];
    correctAnswer: string | number;
    points: number;
  }>;
  totalPoints: number;
  passingScore: number;
  timeLimit?: number;
}


export interface CourseAnalytics {
  totalEnrolled: number;
  completionRate: number;
  inProgressRate: number;
  notStartedRate: number;
  breakdown: { [key: string]: number };
}

export interface Learner {
  id: string;
  name: string;
  department: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
  lastAccessed?: string;
}

export interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
  };
}

export const lmsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCourses: builder.query<
      {
        success: boolean;
        data: {
          courses: Course[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { category?: string; status?: string; search?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/lms/courses',
        params,
      }),
      providesTags: ['LMS'],
    }),
    getCourseById: builder.query<{ success: boolean; data: { course: Course; progress?: CourseProgress } }, string>({
      query: (id) => `/lms/courses/${id}`,
      providesTags: (result, error, id) => [{ type: 'LMS', id }],
    }),
    createCourse: builder.mutation<
      { success: boolean; data: { course: Course } },
      Partial<Course>
    >({
      query: (courseData) => ({
        url: '/lms/courses',
        method: 'POST',
        body: courseData,
      }),
      invalidatesTags: ['LMS'],
    }),
    updateCourse: builder.mutation<
      { success: boolean; data: { course: Course } },
      { id: string; data: Partial<Course> }
    >({
      query: ({ id, data }) => ({
        url: `/lms/courses/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'LMS', id }, 'LMS'],
    }),
    enrollInCourse: builder.mutation<
      { success: boolean; data: { course: Course } },
      { id: string; userId?: string }
    >({
      query: ({ id, userId }) => ({
        url: `/lms/courses/${id}/enroll`,
        method: 'POST',
        body: { userId },
      }),
    }),

    getQuizzes: builder.query<
      {
        success: boolean;
        data: {
          quizzes: Quiz[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        };
      },
      { courseId?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/lms/quizzes',
        params,
      }),
      providesTags: ['LMS'],
    }),
    getQuizById: builder.query<{ success: boolean; data: { quiz: Quiz } }, string>({
      query: (id) => `/lms/quizzes/${id}`,
      providesTags: (result, error, id) => [{ type: 'LMS', id }],
    }),
    createQuiz: builder.mutation<
      { success: boolean; data: { quiz: Quiz } },
      Partial<Quiz>
    >({
      query: (quizData) => ({
        url: '/lms/quizzes',
        method: 'POST',
        body: quizData,
      }),
      invalidatesTags: ['LMS'],
    }),
    submitQuiz: builder.mutation<
      { success: boolean; data: { score: number; passed: boolean; totalPoints: number; earnedPoints: number } },
      { id: string; answers: Array<{ questionId: number; answer: string | number }> }
    >({
      query: ({ id, answers }) => ({
        url: `/lms/quizzes/${id}/submit`,
        method: 'POST',
        body: { answers },
      }),
      invalidatesTags: ['LMS'],
    }),

    // --- Expanded Endpoints for CourseDetail & Wizard ---
    getCourseDetails: builder.query<{ success: boolean; data: { course: Course } }, string>({
      query: (id) => `/lms/courses/${id}/details`,
      providesTags: (result, error, id) => [{ type: 'LMS', id }],
    }),

    getCourseAnalytics: builder.query<{ success: boolean; data: { analytics: CourseAnalytics; learners: Learner[] } }, string>({
      query: (id) => `/lms/courses/${id}/analytics`,
      providesTags: (result, error, id) => [{ type: 'LMS', id }],
    }),

    updateCourseStatus: builder.mutation<{ success: boolean }, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/lms/courses/${id}/status`,
        method: 'PATCH',
        body: { status }
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'LMS', id }, 'LMS']
    }),

    deleteCourse: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/lms/courses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['LMS']
    }),

    uploadMaterial: builder.mutation<UploadResponse, FormData>({
      query: (body) => ({
        url: '/lms/upload',
        method: 'POST',
        body,
      }),
    }),

    // Org Data for Wizard
    getDepartments: builder.query<{ success: boolean; data: { departments: any[] } }, void>({
      query: () => '/job-openings/departments/list',
    }),

    getEmployees: builder.query<{ success: boolean; data: { staff: any[] } }, void>({
      query: () => ({
        url: '/staff',
        params: { limit: 1000, status: 'Active' }
      }),
    }),

    getEmployeeCourses: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/lms/my-courses',
      providesTags: ['LMS']
    }),

    updateCourseProgress: builder.mutation<{ success: boolean; data: any }, { courseId: string; contentId: string; completed: boolean; watchTime?: number }>({
      query: ({ courseId, ...body }) => ({
        url: `/lms/courses/${courseId}/progress`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['LMS']
    }),

    // Assessment Management Endpoints
    getAssessmentRequests: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/lms/assessment-requests',
      providesTags: ['LMS_ASSESSMENT_REQUESTS' as any],
    }),

    updateAssessmentRequest: builder.mutation<any, {
      id: string; status?: string; rejectionReason?: string; scheduledAt?: Date | string;
      assessorId?: string; isPassed?: boolean; score?: number;
      liveSessionId?: string; sessionNotes?: string; sessionSummary?: string; sessionRating?: number;
    }>({
      query: ({ id, ...body }) => ({
        url: `/lms/assessment-requests/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['LMS_ASSESSMENT_REQUESTS' as any],
    }),

    createAssessmentRequest: builder.mutation<any, { courseId: string; type: 'Live Assessment' | 'Re-Assessment' }>({
      query: (body) => ({
        url: '/lms/assessment-requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['LMS_ASSESSMENT_REQUESTS' as any],
    }),

    getStandardAssessmentResults: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/lms/assessment/results',
      providesTags: ['LMS_ASSESSMENT_RESULTS' as any],
    }),

    submitCourseAssessment: builder.mutation<
        { success: boolean; data: { score: number; passed: boolean; totalPoints: number; earnedPoints: number; questionResults?: Array<{ questionId: string; correctAnswer: string | string[]; userAnswer: string | string[]; isCorrect: boolean; marksAwarded: number; marksTotal: number }> } },
        { courseId: string; answers: Array<{ questionId: string; answers: string[] }> }
    >({
      query: ({ courseId, answers }) => ({
        url: `/lms/courses/${courseId}/assessment/submit`,
        method: 'POST',
        body: { answers }
      }),
      invalidatesTags: ['LMS']
    }),

    resetCourseAssessment: builder.mutation<{ success: boolean }, { courseId: string; employeeId: string }>({
      query: ({ courseId, employeeId }) => ({
        url: `/lms/courses/${courseId}/progress/${employeeId}/reset`,
        method: 'POST',
      }),
      invalidatesTags: ['LMS', 'LMS_ASSESSMENT_RESULTS' as any],
    }),


    generateAIQuiz: builder.mutation<{ success: boolean; data: any }, { courseId: string; lessonTitles: string[]; questionCount: number; difficulty: string }>({
      query: (body) => ({
        url: '/lms/ai-quiz/generate',
        method: 'POST',
        body
      }),
      invalidatesTags: ['LMS']
    }),
    getAIQuizById: builder.query<{ success: boolean; data: any }, string>({
      query: (id) => `/lms/ai-quiz/${id}`,
      providesTags: (result, error, id) => [{ type: 'LMS', id }],
    }),
    submitAIQuiz: builder.mutation<{ success: boolean; data: any }, { quizId: string; responses: Array<{ questionIndex: number; answer: string }>; completionTime: number }>({
      query: ({ quizId, ...body }) => ({
        url: `/lms/ai-quiz/${quizId}/submit`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['LMS']
    }),

    getCourseCategories: builder.query<{ success: boolean; data: string[] }, void>({
      query: () => '/lms/categories',
      providesTags: ['LMS']
    }),

    // Progress Insights Endpoints
    getEmployeeProgress: builder.query<{ success: boolean; data: any }, void>({
      query: () => '/lms/employee/progress',
      providesTags: ['LMS']
    }),

    getEmployeeActivity: builder.query<{ success: boolean; data: any[] }, number>({
      query: (year) => ({
        url: '/lms/employee/activity',
        params: { year }
      }),
      providesTags: ['LMS']
    }),

    getEmployeeSkills: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/lms/employee/skills',
      providesTags: ['LMS']
    }),

    getEmployeeAchievements: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/lms/employee/achievements',
      providesTags: ['LMS']
    }),

    getEmployeeLeaderboard: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/lms/employee/leaderboard',
      providesTags: ['LMS']
    }),

    getEmployeeRecentActivity: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/lms/employee/recent-activity',
      providesTags: ['LMS']
    }),

    getEmployeeDeadlines: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/lms/employee/deadlines',
      providesTags: ['LMS']
    }),

    // Learning Engine Hooks
    getLearningEngineDashboard: builder.query<LearningEngineData, void>({
      query: () => '/lms/learning-engine',
      providesTags: ['LMS']
    }),
    logLearningActivity: builder.mutation<void, any>({
      query: (body) => ({
        url: '/lms/learning-engine/activity',
        method: 'POST',
        body
      }),
      invalidatesTags: ['LMS']
    }),
  }),
});

export const {
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useEnrollInCourseMutation,
  useGetQuizzesQuery,
  useGetQuizByIdQuery,
  useCreateQuizMutation,
  useSubmitQuizMutation,
  // New hooks
  useGetCourseDetailsQuery,
  useGetCourseAnalyticsQuery,
  useUpdateCourseStatusMutation,
  useDeleteCourseMutation,
  useUploadMaterialMutation,
  useGetDepartmentsQuery,
  useGetEmployeesQuery,
  useGetEmployeeCoursesQuery,
  useUpdateCourseProgressMutation,
  useGetAssessmentRequestsQuery,
  useUpdateAssessmentRequestMutation,
  useCreateAssessmentRequestMutation,
  useGetStandardAssessmentResultsQuery,
  useSubmitCourseAssessmentMutation,
  useResetCourseAssessmentMutation,

  useGenerateAIQuizMutation,
  useGetAIQuizByIdQuery,
  useSubmitAIQuizMutation,
  useGetCourseCategoriesQuery,

  // Progress Insights hooks
  useGetEmployeeProgressQuery,
  useGetEmployeeActivityQuery,
  useGetEmployeeSkillsQuery,
  useGetEmployeeAchievementsQuery,
  useGetEmployeeLeaderboardQuery,
  useGetEmployeeRecentActivityQuery,
  useGetEmployeeDeadlinesQuery,

  // Learning Engine Hooks
  useGetLearningEngineDashboardQuery,
  useLogLearningActivityMutation,
} = lmsApi;
