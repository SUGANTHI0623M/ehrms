import React, { useState, useEffect } from 'react';
import {
    Typography, Button, Tag, Space,
    Modal, Form, Radio, Select, InputNumber, message, Empty
} from 'antd';
import {
    RobotOutlined, ThunderboltOutlined, CheckCircleOutlined,
    TrophyOutlined, CheckOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCreateAssessmentRequestMutation } from '@/store/api/lmsApi';
import { LmsPageLayout, LmsSectionHeader } from '@/components/lms/SharedComponents';
import CourseCurriculumSection from '@/components/lms/CourseCurriculumSection';
import { Lesson, Material } from '@/components/lms/LmsCourseSidebar';
import { getFileUrl } from '@/utils/url';

const { Title, Text } = Typography;

interface LMSCoursePlayerProps {
    course: any;
    progress: any;
    isAdmin?: boolean;
    onUpdateProgress: (materialId: string, completed: boolean) => Promise<void>;
    onMarkLessonComplete?: (lessonTitle: string) => Promise<void>;
    onRefresh: () => Promise<void>;
    onGenerateQuiz: (values: any) => Promise<void>;
}

const LMSCoursePlayer: React.FC<LMSCoursePlayerProps> = ({
    course,
    progress,
    isAdmin = false,
    onUpdateProgress,
    onMarkLessonComplete,
    onRefresh,
    onGenerateQuiz
}) => {
    const navigate = useNavigate();
    const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0);
    const [activeLesson, setActiveLesson] = useState<string | null>(null);
    const [targetQuizLesson, setTargetQuizLesson] = useState<string | null>(null);
    const [quizModalVisible, setQuizModalVisible] = useState<'lesson' | 'global' | false>(false);
    const [generatingQuiz, setGeneratingQuiz] = useState(false);
    const [createAssessmentRequest, { isLoading: isRequestingAssessment }] = useCreateAssessmentRequestMutation();

    // Support both: API returning course.materials (flattened) or course.lessons[].materials
    const materialsFromLessons: Material[] = (course.lessons || []).flatMap((l: any) =>
        (l.materials || []).map((m: any) => ({
            ...m,
            lessonTitle: l.title,
            type: (m.type && String(m.type).toUpperCase()) || 'URL',
            url: m.url ?? m.filePath ?? m.link ?? m.externalUrl ?? '',
            title: m.title ?? ''
        }))
    );
    const allMaterials: Material[] = [
        ...(course.materials && course.materials.length > 0 ? course.materials : materialsFromLessons),
        ...(course.contents || [])
    ].map((m: any) => ({
        ...m,
        type: (m.type && String(m.type).toUpperCase()) as Material['type'] || 'URL',
        url: m.url ?? m.filePath ?? m.link ?? m.externalUrl ?? ''
    }));

    useEffect(() => {
        if (progress?.contentProgress) {
            const firstUncompleted = allMaterials.findIndex(material => {
                const prog = progress.contentProgress.find((p: any) => p.contentId?.toString() === (material._id || material.id)?.toString());
                return !prog?.viewed;
            });

            if (firstUncompleted !== -1) {
                setCurrentMaterialIndex(firstUncompleted);
                const material = allMaterials[firstUncompleted];
                setActiveLesson(material.lessonTitle || 'Course Materials');
            } else if (allMaterials.length > 0) {
                setActiveLesson(allMaterials[0].lessonTitle || 'Course Materials');
            }
        }
    }, [progress]);

    const groupMaterialsByLesson = (materials: Material[]): Lesson[] => {
        const grouped = materials.reduce((acc, material) => {
            const lessonTitle = material.lessonTitle || 'Course Materials';
            if (!acc[lessonTitle]) {
                acc[lessonTitle] = [];
            }
            acc[lessonTitle].push(material);
            return acc;
        }, {} as Record<string, Material[]>);

        return Object.entries(grouped).map(([title, materials], index) => ({
            id: `lesson-${index}`,
            title,
            materials
        }));
    };

    const lessons = groupMaterialsByLesson(allMaterials);

    const isLessonCompleted = (lessonTitle: string): boolean => {
        const lesson = lessons.find(l => l.title === lessonTitle);
        if (!lesson) return false;
        return lesson.materials.every(material => {
            const matId = (material._id || material.id)?.toString();
            return progress?.contentProgress?.find((p: any) => p.contentId?.toString() === matId)?.viewed;
        });
    };

    const isLessonLocked = (lessonIndex: number): boolean => {
        if (lessonIndex === 0 || isAdmin) return false;
        return !isLessonCompleted(lessons[lessonIndex - 1].title);
    };

    const currentMaterial = allMaterials[currentMaterialIndex];
    const isCompleted = progress?.contentProgress?.find((p: any) => p.contentId?.toString() === (currentMaterial?._id || currentMaterial?.id)?.toString())?.viewed;

    const completedLessonOptions = lessons
        .filter(l => isLessonCompleted(l.title))
        .map(l => ({
            label: (
                <div className="flex flex-col">
                    <Text strong>{l.title}</Text>
                    <Text type="secondary" className="text-xs">{course.title}</Text>
                </div>
            ),
            value: l.title
        }));

    const handleGenerateQuiz = async (values: any) => {
        setGeneratingQuiz(true);
        try {
            await onGenerateQuiz({
                ...values,
                materialId: currentMaterial?._id || currentMaterial?.id,
                materialTitle: currentMaterial?.title,
                lessonTitles: values.selectedLessons || (quizModalVisible === 'lesson' && targetQuizLesson ? [targetQuizLesson] : (activeLesson ? [activeLesson] : []))
            });
            setQuizModalVisible(false);
            setTargetQuizLesson(null);
        } catch (err: any) {
            console.error("Quiz generation error:", err);
            const msg = err.response?.data?.message || err.message || 'Failed to generate quiz.';
            message.error(msg);
        } finally {
            setGeneratingQuiz(false);
        }
    };

    const handleAssessmentBtnClick = async () => {
        if (course.isLiveAssessment) {
            try {
                const res = await createAssessmentRequest({
                    courseId: course._id,
                    type: 'Live Assessment'
                }).unwrap();
                if (res.success) message.success('Assessment request sent!');
            } catch (err) {
                message.error('Failed to send assessment request');
            }
        } else {
            navigate(`/lms/assessment/${course._id}`);
        }
    };

    const renderActionButtons = () => {
        const allLessonsCompleted = lessons.every(l => isLessonCompleted(l.title));
        if (isAdmin) return null;
        if (allLessonsCompleted) return null;

        return (
            <Button
                type="primary"
                size="large"
                icon={<RobotOutlined />}
                onClick={() => setQuizModalVisible('global')}
                className="bg-primary hover:bg-primary/90 border-transparent shadow-md font-semibold px-6 h-10 rounded-lg"
            >
                Practice Quiz
            </Button>
        );
    };

    const renderIframePlayer = () => {
        const containerStyle: React.CSSProperties = {
            position: 'relative',
            paddingBottom: '56.25%',
            height: 0,
            overflow: 'hidden',
            borderRadius: '12px',
            backgroundColor: '#000',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        };
        const iframeStyle: React.CSSProperties = {
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0
        };

        const isValidUrl = (u: string) => {
            const s = (u || '').trim();
            if (!s || s === '/' || s.startsWith('javascript:')) return false;
            try {
                // Allow any http/https URL (embedded external links)
                if (/^https?:\/\//i.test(s)) return true;
                const parsed = new URL(s, 'http://localhost');
                if (parsed.pathname === '/' && !s.startsWith('http')) return false;
            } catch {
                // invalid
            }
            return true;
        };

        if (!currentMaterial) {
            const noContentMessage = allMaterials.length === 0
                ? 'No learning material available for this lesson.'
                : 'Select content to view';
            return (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
                    <Empty description={noContentMessage} />
                </div>
            );
        }

        const materialType = (currentMaterial.type && String(currentMaterial.type).toUpperCase()) || 'URL';
        const materialUrl = currentMaterial.url || currentMaterial.filePath || (currentMaterial as any).link || (currentMaterial as any).externalUrl;
        const rawUrl = materialUrl ? String(materialUrl).trim() : '';
        // For http/https URLs use as-is; for relative paths use getFileUrl
        const resolvedUrl = rawUrl && (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) ? rawUrl : getFileUrl(rawUrl);

        if (materialType === 'YOUTUBE') {
            const url = (currentMaterial.url || '').trim();
            const videoId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
            if (!videoId || !isValidUrl(url)) {
                return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
                        <Text type="secondary">No learning material available for this lesson.</Text>
                    </div>
                );
            }
            return (
                <div style={containerStyle}>
                    <iframe style={iframeStyle} src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`} allowFullScreen title="YouTube" />
                </div>
            );
        }
        if (materialType === 'VIDEO') {
            if (!resolvedUrl || !isValidUrl(resolvedUrl)) {
                return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
                        <Text type="secondary">No learning material available for this lesson.</Text>
                    </div>
                );
            }
            const subtitleUrl = currentMaterial.subtitleUrl;
            const subtitleResolved = subtitleUrl ? getFileUrl(subtitleUrl) : '';
            return (
                <div style={containerStyle}>
                    <video
                        key={resolvedUrl}
                        style={iframeStyle}
                        controls
                        controlsList="nodownload"
                        crossOrigin="anonymous"
                        playsInline
                        src={resolvedUrl}
                    >
                        {subtitleResolved && <track kind="subtitles" src={subtitleResolved} default />}
                    </video>
                </div>
            );
        }
        if (currentMaterial.type === 'PDF') {
            if (!isValidUrl(resolvedUrl)) {
                return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
                        <Text type="secondary">No learning material available for this lesson.</Text>
                    </div>
                );
            }
            // Same PDF player as admin; larger height for employee (nothing below player)
            const pdfHeightClass = isAdmin ? 'h-[600px]' : 'min-h-[600px] h-[75vh]';
            return (
                <div className="w-full rounded-xl overflow-hidden bg-gray-100">
                    <iframe
                        key={resolvedUrl}
                        src={`${resolvedUrl}#toolbar=1&view=FitH`}
                        className={`w-full border-none bg-gray-100 ${pdfHeightClass}`}
                        title="PDF Preview"
                    />
                </div>
            );
        }
        if (materialType === 'URL') {
            if (!resolvedUrl || !isValidUrl(resolvedUrl)) {
                return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
                        <Text type="secondary">No learning material available for this lesson.</Text>
                    </div>
                );
            }
            return (
                <div style={{ ...containerStyle, paddingBottom: '75%', backgroundColor: '#f9fafb' }}>
                    <iframe
                        key={resolvedUrl}
                        style={iframeStyle}
                        src={resolvedUrl}
                        title={currentMaterial.title || 'External content'}
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                </div>
            );
        }
        return <Empty description="Content type not supported" />;
    };

    // Sidebar Extra Actions for Employee
    const renderSidebarActions = (lesson: Lesson) => {
        if (isAdmin) return null;
        const completed = isLessonCompleted(lesson.title);
        return (
            <div className="space-y-3">
                <Button
                    type="default"
                    block
                    icon={<ThunderboltOutlined />}
                    onClick={(e) => {
                        e.stopPropagation();
                        setTargetQuizLesson(lesson.title);
                        setQuizModalVisible('lesson');
                    }}
                    className="h-8 rounded text-primary border-primary/20 hover:border-primary/40 hover:bg-primary/10 text-xs font-semibold"
                >
                    AI Quiz
                </Button>
                {!completed && onMarkLessonComplete && (
                    <Button
                        type="primary"
                        block
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkLessonComplete(lesson.title);
                        }}
                        icon={<CheckCircleOutlined />}
                        className="h-8 rounded bg-primary border-primary hover:bg-primary/90 font-bold text-xs"
                    >
                        Mark Done
                    </Button>
                )}
            </div>
        );
    };

    const renderSidebarFooter = () => {
        if (isAdmin) return null;
        const allLessonsCompleted = lessons.every(l => isLessonCompleted(l.title));
        const assessmentRequested = progress?.assessmentStatus === 'Requested' || progress?.assessmentStatus === 'In Progress';

        if (!allLessonsCompleted) return null;

        return (
            <Button
                type="primary"
                block
                size="large"
                onClick={handleAssessmentBtnClick}
                className={`h-12 rounded-xl font-bold shadow-lg transition-all ${assessmentRequested ? 'bg-gray-400 border-gray-400' : 'bg-indigo-600 hover:bg-indigo-500 border-none'}`}
                icon={<TrophyOutlined />}
                disabled={assessmentRequested || isRequestingAssessment}
                loading={isRequestingAssessment}
            >
                {course.isLiveAssessment
                    ? (assessmentRequested ? 'Assessment Request Sent' : 'Request Final Assessment')
                    : 'Start Final Assessment'}
            </Button>
        );
    };

    const curriculumSidebar = (
        <div className="h-full overflow-y-auto">
            <CourseCurriculumSection
                lessons={lessons}
                allMaterials={allMaterials}
                activeLessonKey={activeLesson}
                setActiveLessonKey={setActiveLesson}
                selectedMaterialId={currentMaterial?._id || currentMaterial?.id}
                onMaterialClick={(material, globalIndex) => setCurrentMaterialIndex(globalIndex)}
                isAdmin={isAdmin}
                progressPercentage={progress?.completionPercentage || 0}
                completedMaterials={progress?.contentProgress?.filter((p: any) => p.viewed).map((p: any) => p.contentId) || []}
                isLessonLocked={isLessonLocked}
                isLessonCompleted={isLessonCompleted}
                renderExtraLessonActions={renderSidebarActions}
                sectionFooter={renderSidebarFooter()}
                courseTitle={course?.title}
                variant="sidebar"
            />
        </div>
    );

    return (
        <>
            <LmsPageLayout
                header={
                    isAdmin ? (
                        <LmsSectionHeader
                            title={
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <span>{currentMaterial?.title}</span>
                                    <div className="flex items-center gap-2">
                                        <Tag color="cyan" className="m-0 rounded border-none font-semibold text-xs tracking-wide">
                                            {currentMaterial?.type}
                                        </Tag>
                                        <Text type="secondary" className="text-xs font-medium uppercase tracking-widest opacity-60">
                                            {currentMaterialIndex + 1} of {allMaterials.length} Materials
                                        </Text>
                                    </div>
                                </div>
                            }
                        />
                    ) : (
                        <div className="flex items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-3 min-w-0">
                                <Button
                                    type="text"
                                    icon={<ArrowLeftOutlined />}
                                    onClick={() => navigate('/lms/employee/dashboard')}
                                    className="flex items-center justify-center shrink-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                                    aria-label="Back to My Learning"
                                />
                                <Title level={4} className="!mb-0 !mt-0 truncate font-semibold text-gray-800">
                                    {course?.title}
                                </Title>
                            </div>
                            {renderActionButtons()}
                        </div>
                    )
                }
                rightSidebar={curriculumSidebar}
            >
                <div className="flex flex-col gap-6">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                        {renderIframePlayer()}
                    </div>
                    {/* Mobile: course content below player (sidebar hidden on small screens) */}
                    <div className="lg:hidden">
                        <CourseCurriculumSection
                            lessons={lessons}
                            allMaterials={allMaterials}
                            activeLessonKey={activeLesson}
                            setActiveLessonKey={setActiveLesson}
                            selectedMaterialId={currentMaterial?._id || currentMaterial?.id}
                            onMaterialClick={(material, globalIndex) => setCurrentMaterialIndex(globalIndex)}
                            isAdmin={isAdmin}
                            progressPercentage={progress?.completionPercentage || 0}
                            completedMaterials={progress?.contentProgress?.filter((p: any) => p.viewed).map((p: any) => p.contentId) || []}
                            isLessonLocked={isLessonLocked}
                            isLessonCompleted={isLessonCompleted}
                            renderExtraLessonActions={renderSidebarActions}
                            sectionFooter={renderSidebarFooter()}
                            courseTitle={course?.title}
                        />
                    </div>
                </div>
            </LmsPageLayout>

            {/* Quiz Modal Logic retained */}
            <Modal
                title={
                    <div className="flex items-center gap-3 py-2">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <RobotOutlined className="text-primary text-xl" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-gray-800">
                            {quizModalVisible === 'global' ? 'Global AI Practice Quiz' : `Practice Quiz: ${targetQuizLesson || activeLesson}`}
                        </span>
                    </div>
                }
                open={!!quizModalVisible}
                onCancel={() => {
                    setQuizModalVisible(false);
                    setTargetQuizLesson(null);
                }}
                footer={null}
                width={500}
                centered
            >
                <Form
                    layout="vertical"
                    initialValues={{ difficulty: 'Medium', questionCount: 5 }}
                    onFinish={handleGenerateQuiz}
                    className="space-y-4 pt-4"
                >
                    {quizModalVisible === 'global' && (
                        <Form.Item
                            name="selectedLessons"
                            label="Select Lessons"
                            rules={[{ required: true, message: 'Select at least one lesson' }]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Choose completed lessons"
                                options={completedLessonOptions}
                                disabled={completedLessonOptions.length === 0}
                            />
                        </Form.Item>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="difficulty" label="Difficulty">
                            <Select options={['Easy', 'Medium', 'Hard'].map(v => ({ label: v, value: v }))} />
                        </Form.Item>
                        <Form.Item name="questionCount" label="Questions">
                            <InputNumber min={1} max={50} className="w-full" />
                        </Form.Item>
                    </div>
                    <Button type="primary" htmlType="submit" block size="large" loading={generatingQuiz} className="bg-indigo-600 hover:bg-indigo-500">
                        Generate Quiz
                    </Button>
                </Form>
            </Modal>
        </>
    );
};

export default LMSCoursePlayer;
