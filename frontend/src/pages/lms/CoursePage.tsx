import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from "@/components/MainLayout";
import { LmsDetailPageSkeleton } from "@/components/lms/SharedComponents";
import { Button, Empty, message } from "antd";
import { lmsService } from '@/services/lmsService';
import LMSCoursePlayer from './components/LMSCoursePlayer';

const CoursePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);

    useEffect(() => {
        fetchCourseData();
    }, [id]);

    const fetchCourseData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // For admin, we use getCourseDetails which returns course data
            const res = await lmsService.getCourseDetails(id);
            if (res.success && res.data) {
                const courseData = res.data.course || res.data;
                console.log('[Admin CoursePage] Course data received:', {
                    title: courseData?.title,
                    materialsCount: courseData?.materials?.length || 0,
                    contentsCount: courseData?.contents?.length || 0,
                    lessonsCount: courseData?.lessons?.length || 0
                });
                setCourse(courseData);
            } else {
                message.error('Failed to load course data');
            }
        } catch (error: any) {
            console.error('Failed to fetch course details:', error);
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load course';
            message.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProgress = async (materialId: string, completed: boolean) => {
        // Admin doesn't track progress, but we need to implement this for the component
        console.log('[Admin] Material progress update (not saved):', { materialId, completed });
    };

    const handleMarkLessonComplete = async (lessonTitle: string) => {
        // Admin doesn't track lesson completion
        console.log('[Admin] Lesson complete (not saved):', lessonTitle);
    };

    const handleGenerateQuiz = async (values: any) => {
        if (!id || !course) return;
        const lessons = values.lessonTitles && values.lessonTitles.length > 0 ? values.lessonTitles : [];
        if (lessons.length === 0) {
            throw new Error("No lessons selected for quiz generation");
        }
        const payload = {
            courseId: id,
            lessonTitles: lessons,
            questionCount: values.questionCount,
            difficulty: values.difficulty,
            materialId: values.materialId
        };
        try {
            const res = await lmsService.generateAIQuiz(payload);
            if (res.success) {
                message.success('Quiz generated successfully!');
                navigate(`/lms/ai-quiz/attempt/${res.data._id}`);
            }
        } catch (error) {
            throw error;
        }
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="p-4 sm:p-6 max-w-6xl mx-auto min-h-[calc(100vh-64px)] bg-[#f8f9fa]">
                    <LmsDetailPageSkeleton />
                </div>
            </MainLayout>
        );
    }

    if (!course) {
        return (
            <MainLayout>
                <div className="bg-white min-h-[calc(100vh-64px)] flex items-center justify-center">
                    <Empty description="Course not found" />
                    <Button type="primary" className="mt-4" onClick={() => navigate('/admin/lms/course-library')}>
                        Back to Library
                    </Button>
                </div>
            </MainLayout>
        );
    }
    // Create a mock progress object for admin view (no actual progress tracking)
    const mockProgress = {
        _id: '',
        status: 'Not Started' as const,
        completionPercentage: 0,
        isAccessBlocked: false,
        contentProgress: [],
        completedLessons: [],
        assessmentStatus: 'Not Started' as const,
        assessmentAttempts: 0
    };

    return (
        <MainLayout>
            <LMSCoursePlayer
                course={course}
                progress={mockProgress}
                isAdmin={true}
                onUpdateProgress={handleUpdateProgress}
                onMarkLessonComplete={handleMarkLessonComplete}
                onRefresh={fetchCourseData}
                onGenerateQuiz={handleGenerateQuiz}
            />
        </MainLayout>
    );
};

export default CoursePage;
