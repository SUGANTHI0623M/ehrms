import { apiSlice } from './apiSlice';

export interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  videoUrl?: string;
  duration?: number;
  status: 'draft' | 'published' | 'archived';
  instructor?: string;
  tags: string[];
  enrolledUsers: string[];
  completionRate?: number;
  rating?: number;
  totalRatings?: number;
  createdAt?: string;
  updatedAt?: string;
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
    getCourseById: builder.query<{ success: boolean; data: { course: Course } }, string>({
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
      invalidatesTags: (result, error, { id }) => [{ type: 'LMS', id }, 'LMS'],
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
} = lmsApi;

