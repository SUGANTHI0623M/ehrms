import axios from 'axios';

// Configure base API URL
// Configure base API URL
const getApiUrl = () => {
    // Check if we're in browser environment and running locally
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isLocal = hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0';

        if (isLocal) {
            return 'http://localhost:8000/api';
        }
    }

    // Fallback to env var or default
    return import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
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

    completeLessonProgress: async (courseId: string, lessonTitle: string) => {
        const response = await api.post(`/lms/courses/${courseId}/complete-lesson`, { lessonTitle });
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

    createCourse: async (courseData: any) => {
        // When sending FormData, do NOT set Content-Type so axios/browser sets
        // multipart/form-data with the correct boundary (required for server to parse files).
        const isFormData = courseData instanceof FormData;
        const response = await api.post('/lms/courses', courseData, {
            headers: isFormData ? {} : {}
        });
        return response.data;
    },

    updateCourse: async (courseId: string, data: any) => {
        // When sending FormData, do NOT set Content-Type so axios/browser sets
        // multipart/form-data with the correct boundary (required for server to parse files).
        const isFormData = data instanceof FormData;
        const response = await api.put(`/lms/courses/${courseId}`, data, {
            headers: isFormData ? {} : {}
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

    leaveSession: async (sessionId: string, payload: { feedbackSummary: string; issues?: string; rating?: number }) => {
        const response = await api.post(`/lms/my-sessions/${sessionId}/leave`, payload);
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
        // Fetching with high limit to get all active staff for assignment
        const response = await api.get('/staff', { params: { limit: 1000, status: 'Active' } });
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
