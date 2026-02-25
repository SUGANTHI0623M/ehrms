import axios from 'axios';
// Configure base API URL
const getApiUrl = () => {
    // Check if we're in browser environment and running locally
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0';

        if (isLocal) {
            return 'http://localhost:9000/api';
        }
    }

    // Fallback to env var or default
    return import.meta.env.VITE_API_URL || 'http://localhost:9000/api';
};

const API_URL = getApiUrl();

// Create axios instance with auth interceptor
const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const lmsService = {
    // --- Courses ---
    getCourses: async () => {
        const response = await api.get('/lms/my-courses');
        return response.data;
    },

    getAllCourses: async (params?: any) => {
        const response = await api.get('/lms/courses', { params });
        return response.data;
    },

    getCourseCategories: async () => {
        const response = await api.get('/lms/categories');
        return response.data;
    },

    getMetaOptions: async (type: 'CATEGORY' | 'LANGUAGE') => {
        const response = await api.get('/lms/meta-options', { params: { type } });
        return response.data;
    },

    createMetaOption: async (type: 'CATEGORY' | 'LANGUAGE', value: string) => {
        const response = await api.post('/lms/meta-options', { type, value });
        return response.data;
    },

    deleteMetaOption: async (id: string) => {
        const response = await api.delete(`/lms/meta-options/${id}`);
        return response.data;
    },

    updateCourseStatus: async (courseId: string, status: string) => {
        const response = await api.patch(`/lms/courses/${courseId}/status`, { status });
        return response.data;
    },

    getCourseDetails: async (courseId: string) => {
        const response = await api.get(`/lms/courses/${courseId}/details`);
        return response.data;
    },

    getCourseAnalytics: async (courseId: string, params?: any) => {
        const response = await api.get(`/lms/courses/${courseId}/analytics`, { params });
        return response.data;
    },

    getCourseById: async (courseId: string) => {
        return lmsService.getCourseDetails(courseId);
    },

    getMyProgress: async (courseId: string) => {
        const response = await api.get(`/lms/courses/${courseId}/my-progress`);
        return response.data;
    },

    markLessonComplete: async (courseId: string, lessonId: string) => {
        const response = await api.post(`/lms/courses/${courseId}/lessons/${lessonId}/complete`);
        return response.data;
    },

    getLearnerProgress: async (courseId: string) => {
        const response = await api.get(`/lms/courses/${courseId}/my-progress`);
        return response.data;
    },

    completeLessonProgress: async (courseId: string, lessonId: string) => {
        const response = await api.post(`/lms/courses/${courseId}/complete-lesson`, { lessonId });
        return response.data;
    },

    toggleCourseAccess: async (progressId: string, isAccessBlocked: boolean) => {
        const response = await api.patch(`/lms/enrollment/${progressId}/access`, { isAccessBlocked });
        return response.data;
    },

    unenrollLearner: async (progressId: string) => {
        const response = await api.delete(`/lms/enrollment/${progressId}`);
        return response.data;
    },

    resetLearnerProgress: async (courseId: string, employeeId: string) => {
        const response = await api.post(`/lms/courses/${courseId}/learners/${employeeId}/reset`);
        return response.data;
    },

    extendEnrollmentDeadline: async (courseId: string, employeeId: string, body: { dueDate?: string; extendByDays?: number }) => {
        const response = await api.patch(`/lms/courses/${courseId}/learners/${employeeId}/deadline`, body);
        return response.data;
    },

    createCourse: async (courseData: any) => {
        // When sending FormData, do NOT set Content-Type so axios/browser sets
        // multipart/form-data with the correct boundary (required for server to parse files).
        const isFormData = courseData instanceof FormData;
        const response = await api.post('/lms/courses', courseData, {
            headers: isFormData ? {} : {},
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 900000, // 15 min for large video uploads during course creation
        });
        return response.data;
    },

    updateCourse: async (courseId: string, data: any) => {
        // When sending FormData, do NOT set Content-Type so axios/browser sets
        // multipart/form-data with the correct boundary (required for server to parse files).
        const isFormData = data instanceof FormData;
        const response = await api.put(`/lms/courses/${courseId}`, data, {
            headers: isFormData ? {} : {},
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 900000, // 15 min for large video uploads during course update
        });
        return response.data;
    },

    addContent: async (courseId: string, contentData: any) => {
        const response = await api.post(`/lms/courses/${courseId}/content`, contentData);
        return response.data;
    },

    /** Fetch material title from YouTube (oEmbed) or from a normal URL (page <title>). */
    getMaterialTitle: async (url: string): Promise<string | null> => {
        const response = await api.get<{ success: boolean; title?: string }>('/lms/material-title', {
            params: { url: url.trim() }
        });
        return response.data?.title ?? null;
    },

    uploadMaterial: async (file: File | Blob, type: string = 'IMAGE', onProgress?: (percent: number) => void) => {
        if (!file || !(file instanceof File || file instanceof Blob)) {
            throw new Error('Invalid file: must be a File or Blob');
        }
        const formData = new FormData();
        // Append as File so server receives correct name and type (Blob can be appended too)
        formData.append('file', file instanceof File ? file : new File([file], 'video', { type: file.type || 'video/mp4' }));
        formData.append('type', type);
        const response = await api.post('/lms/upload', formData, {
            headers: {
                // Do not set Content-Type so axios sets multipart/form-data with boundary
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 600000, // 10 min for large videos
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            }
        });
        return response.data;
    },

    deleteContent: async (contentId: string) => {
        const response = await api.delete(`/lms/content/${contentId}`);
        return response.data;
    },

    deleteCourse: async (courseId: string) => {
        const response = await api.delete(`/lms/courses/${courseId}`);
        return response.data;
    },

    assignCourse: async (courseId: string, assignmentData: any) => {
        const response = await api.post(`/lms/courses/${courseId}/assign`, assignmentData);
        return response.data;
    },

    updateProgress: async (courseId: string, contentId: string, data: any) => {
        const response = await api.post(`/lms/courses/${courseId}/progress`, { contentId, ...data });
        return response.data;
    },

    // --- Analytics & Learners ---
    getLMSAnalytics: async () => {
        const response = await api.get('/lms/analytics/dashboard');
        return response.data;
    },

    getSystemAnalytics: async (params?: { months?: number }) => {
        const response = await api.get('/lms/analytics/system', { params: params || {} });
        return response.data;
    },

    getCourseLevelAnalytics: async () => {
        const response = await api.get('/lms/analytics/courses');
        return response.data;
    },

    /** Course assignment & completion analytics (percentage-based 0–100). Filters: courseId, department, period, months. */
    getCourseAssignmentCompletionAnalytics: async (params?: {
        courseId?: string;
        department?: string;
        period?: 'daily' | 'weekly' | 'monthly';
        months?: number | string;
    }) => {
        const response = await api.get('/lms/analytics/course-assignment-completion', { params: params || {} });
        return response.data;
    },

    getDepartmentAnalytics: async () => {
        const response = await api.get('/lms/analytics/departments');
        return response.data;
    },

    getMyScoresAnalytics: async () => {
        const response = await api.get('/lms/analytics/my-scores');
        return response.data;
    },

    exportAnalytics: async (type: 'learners' | 'courses', params?: { months?: number }) => {
        const response = await api.get('/lms/analytics/export', {
            params: { type, ...params },
            responseType: 'blob'
        });
        return response;
    },

    getLearnersList: async (params?: any) => {
        const response = await api.get('/lms/analytics/learners', { params });
        return response.data;
    },

    getLearnerDetails: async (learnerId: string) => {
        const response = await api.get(`/lms/analytics/learners/${learnerId}`);
        return response.data;
    },

    /** Toggle LMS access for a learner (only hides My Learning in employee portal; does not deactivate account). */
    updateLearnerLmsAccess: async (learnerId: string, enabled: boolean) => {
        const response = await api.patch(`/lms/analytics/learners/${learnerId}/lms-access`, { enabled });
        return response.data;
    },

    /** Get current user's LMS access (for employee portal to show/hide My Learning). */
    getMyLmsAccess: async () => {
        const response = await api.get('/lms/me/access');
        return response.data;
    },

    // --- Live Sessions ---
    getLiveSessions: async (params?: any) => {
        const response = await api.get('/lms/sessions', { params });
        return response.data;
    },

    getMyLiveSessions: async (params?: any) => {
        const response = await api.get('/lms/my-sessions', { params });
        return response.data;
    },

    joinSession: async (sessionId: string) => {
        const response = await api.post(`/lms/my-sessions/${sessionId}/join`);
        return response.data;
    },

    leaveSession: async (sessionId: string, payload: { feedbackSummary: string; issues?: string }) => {
        const response = await api.post(`/lms/my-sessions/${sessionId}/leave`, payload);
        return response.data;
    },

    getParticipantRemarks: async (sessionId: string) => {
        const response = await api.get(`/lms/sessions/${sessionId}/participant-remarks`);
        return response.data;
    },

    scheduleSession: async (sessionData: any) => {
        const response = await api.post('/lms/sessions', sessionData);
        return response.data;
    },

    deleteSession: async (sessionId: string) => {
        const response = await api.delete(`/lms/sessions/${sessionId}`);
        return response.data;
    },

    updateSessionStatus: async (sessionId: string, data: any) => {
        const response = await api.put(`/lms/sessions/${sessionId}`, data);
        return response.data;
    },

    // Aliases for consistency
    createLiveSession: async (data: any) => {
        const response = await api.post('/lms/sessions', data);
        return response.data;
    },
    updateLiveSession: async (id: string, data: any) => {
        const response = await api.put(`/lms/sessions/${id}`, data);
        return response.data;
    },

    /** Auto-complete a live session when scheduled duration has expired */
    autoCompleteSession: async (sessionId: string) => {
        const response = await api.put(`/lms/sessions/${sessionId}/auto-complete`);
        return response.data;
    },
    deleteLiveSession: async (id: string) => {
        const response = await api.delete(`/lms/sessions/${id}`);
        return response.data;
    },

    // Legacy/Other
    getReadiness: async (filters?: any) => {
        const response = await api.get('/lms/analytics/readiness', { params: filters });
        return response.data;
    },

    // --- Corporate LMS / Organization Data ---
    getDepartments: async () => {
        // Fetch from existing HRMS department endpoint used in JobOpeningForm
        const response = await api.get('/job-openings/departments/list');
        return response.data;
    },

    getEmployees: async () => {
        // Fetch from existing Staff endpoint used in Staff Overview
        // forLmsAssignment=1 lets employee portal get full staff list for session participant selection
        const response = await api.get('/staff', { params: { limit: 50, status: 'Active', forLmsAssignment: 1, page: 1 } });
        return response.data;
    },

    generateAIQuiz: async (data: any) => {
        const response = await api.post('/lms/ai-quiz/generate', data);
        return response.data;
    },

    // --- Assessment Requests ---
    getAssessmentRequests: async () => {
        const response = await api.get('/lms/assessment-requests');
        return response.data;
    },

    updateAssessmentRequest: async (id: string, data: any) => {
        const response = await api.patch(`/lms/assessment-requests/${id}`, data);
        return response.data;
    }
};
