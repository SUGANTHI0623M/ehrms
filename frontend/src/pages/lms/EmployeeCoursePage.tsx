import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import {
    Layout, Typography, Progress, Button, Tag, Space,
    Card, Tabs, Divider, List, Avatar, Spin, Result,
    message, Empty, Form, Modal, Radio, Collapse, Table, Input, Select, Tooltip, Badge
} from 'antd';
import {
    CheckCircleOutlined,
    LockOutlined,
    FilePdfOutlined,
    ArrowLeftOutlined,
    DownloadOutlined,
    MessageOutlined,
    InfoCircleOutlined,
    TrophyOutlined,
    FormOutlined,
    ThunderboltOutlined,
    YoutubeOutlined,
    GlobalOutlined,
    SearchOutlined,
    FilterOutlined,
    ClockCircleOutlined,
    PlayCircleOutlined,
    FileTextOutlined,
    RobotOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { lmsService } from '@/services/lmsService';

import dayjs from 'dayjs';
import LessonSidebar from './components/LessonSidebar';
import LMSCoursePlayer from './components/LMSCoursePlayer';

interface CourseProgress {
    _id: string;
    status: 'Not Started' | 'In Progress' | 'Completed' | 'Failed';
    completionPercentage: number;
    isAccessBlocked: boolean;
    contentProgress: Array<{
        contentId: string;
        viewed: boolean;
        viewedAt?: string;
    }>;
    completedLessons: string[]; // Array of completed lesson titles
    assessmentStatus: 'Not Started' | 'In Progress' | 'Passed' | 'Failed';
    assessmentScore?: number;
    assessmentAttempts: number;
}

const EmployeeCoursePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [course, setCourse] = useState<any>(null);
    const [progress, setProgress] = useState<CourseProgress | null>(null);

    useEffect(() => {
        fetchCourseData();
    }, [id]);

    const fetchCourseData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await lmsService.getCourseDetails(id);
            if (res.success) {
                console.log('[Employee] Course data received:', {
                    title: res.data.course?.title,
                    materialsCount: res.data.course?.materials?.length || 0,
                    contentsCount: res.data.course?.contents?.length || 0,
                    totalMaterials: (res.data.course?.materials?.length || 0) + (res.data.course?.contents?.length || 0)
                });
                setCourse(res.data.course);
                setProgress(res.data.progress);
            }
        } catch (error: any) {
            console.error('Failed to fetch course details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProgress = async (materialId: string, completed: boolean) => {
        if (!id) return;
        try {
            const res = await lmsService.updateProgress(id, materialId, { completed });
            if (res.success) {
                setProgress(res.data);
            }
        } catch (error) {
            throw error;
        }
    };

    const handleMarkLessonComplete = async (lessonTitle: string) => {
        if (!id || !course) return;
        try {
            const res = await lmsService.completeLessonProgress(id, lessonTitle);
            if (res.success) {
                message.success('Lesson marked as complete!');
                // Update local progress with returned data
                setProgress(res.data);
            }
        } catch (error: any) {
            console.error('Failed to mark lesson as complete:', error);
            message.error(error.response?.data?.message || 'Failed to mark lesson as complete');
        }
    };

    const handleGenerateQuiz = async (values: any) => {
        if (!id || !course) return;

        // Ensure lessonTitles is a valid array, otherwise fail fast
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
            // Let the child component handle the UI error display
            throw error;
        }
    };

    if (loading) return (
        <MainLayout>
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-[#f8f9fa]">
                <Spin size="large" tip="Entering classroom..." />
            </div>
        </MainLayout>
    );

    if (!course) return (
        <MainLayout>
            <div className="bg-white min-h-[calc(100vh-64px)] flex items-center justify-center">
                <Result
                    status="403"
                    title="Access Restricted"
                    subTitle="This course is no longer available or your access has been paused."
                    extra={<Button type="primary" size="large" onClick={() => navigate('/lms/employee/dashboard')}>Back to Library</Button>}
                />
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            <LMSCoursePlayer
                course={course}
                progress={progress}
                onUpdateProgress={handleUpdateProgress}
                onMarkLessonComplete={handleMarkLessonComplete}
                onRefresh={fetchCourseData}
                onGenerateQuiz={handleGenerateQuiz}
            />
        </MainLayout>
    );
};

export default EmployeeCoursePage;
