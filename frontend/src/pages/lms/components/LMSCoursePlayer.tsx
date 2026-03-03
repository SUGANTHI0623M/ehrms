import React, { useState, useEffect } from 'react';
import {
    Typography, Button, Tag, Space, Card,
    Modal, Form, Radio, Select, InputNumber, message, Empty
} from 'antd';
import {
    RobotOutlined, ThunderboltOutlined, CheckCircleOutlined,
    TrophyOutlined, CheckOutlined, ArrowLeftOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useCreateAssessmentRequestMutation, useGetAssessmentRequestsQuery, useUpdateAssessmentRequestMutation } from '@/store/api/lmsApi';
import { LmsPageLayout, LmsSectionHeader } from '@/components/lms/SharedComponents';
import CourseCurriculumSection from '@/components/lms/CourseCurriculumSection';
import { Lesson, Material } from '@/components/lms/LmsCourseSidebar';
import { getFileUrl } from '@/utils/url';
import { useBreakpoint } from '@/hooks/useBreakpoint';

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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { isDesktop } = useBreakpoint();
    const [createAssessmentRequest, { isLoading: isRequestingAssessment }] = useCreateAssessmentRequestMutation();
    const [updateAssessmentRequest, { isLoading: isCancellingAssessment }] = useUpdateAssessmentRequestMutation();
    const { data: assessmentRequestsData } = useGetAssessmentRequestsQuery(undefined, { skip: isAdmin });

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
        const assessmentPassed = progress?.assessmentStatus === 'Passed';
        if (isAdmin) return null;
        if (assessmentPassed) return null;

        return (
            <Button
                size="large"
                icon={<RobotOutlined />}
                onClick={() => setQuizModalVisible('global')}
                className="!text-black hover:!border-[#efaa1f] hover:!text-[#efaa1f] [&_.anticon]:hover:!text-[#efaa1f] min-w-[120px] sm:min-w-[140px]"
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
        if (progress?.assessmentStatus === 'Passed') return null;
        const completed = isLessonCompleted(lesson.title);
        return (
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    type="default"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    onClick={(e) => {
                        e.stopPropagation();
                        setTargetQuizLesson(lesson.title);
                        setQuizModalVisible('lesson');
                    }}
                    className="min-h-[40px] rounded text-primary border-primary/20 hover:border-primary/40 hover:bg-primary/10 text-sm font-semibold shrink-0"
                >
                    AI Quiz
                </Button>
                {!completed && onMarkLessonComplete && (
                    <Button
                        type="primary"
                        size="large"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkLessonComplete(lesson.title);
                        }}
                        icon={<CheckCircleOutlined />}
                        className="min-h-[40px] rounded bg-primary border-primary hover:bg-primary/90 font-semibold text-sm shrink-0"
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
        const courseIdStr = course?._id?.toString?.() ?? course?.id;
        const requests = assessmentRequestsData?.data ?? [];
        const hasPendingRequest = requests.some(
            (r: any) => (r.courseId?._id?.toString?.() ?? r.courseId?.toString?.()) === courseIdStr && ['Requested', 'Scheduled'].includes(r.status)
        );
        const assessmentRequested = hasPendingRequest || progress?.assessmentStatus === 'Requested' || progress?.assessmentStatus === 'In Progress';
        const assessmentPassed = progress?.assessmentStatus === 'Passed';
        const score = progress?.assessmentScore;
        // Both live and standardized: show assessment section only when all lessons are completed.
        if (!allLessonsCompleted) return null;

        const assessmentFailed = progress?.assessmentStatus === 'Failed';
        const completedScore = progress?.assessmentScore;

        if (assessmentPassed && score != null) {
            return (
                <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#d97706] font-semibold">
                        <TrophyOutlined />
                        <span>Assessment Passed</span>
                    </div>
                    <div className="text-2xl font-bold text-[#d97706] mt-1">{score}%</div>
                </div>
            );
        }

        const hasReAssessmentPending = requests.some(
            (r: any) => (r.courseId?._id?.toString?.() ?? r.courseId?.toString?.()) === courseIdStr
                && r.type === 'Re-Assessment'
                && ['Requested', 'Scheduled'].includes(r.status)
        );
        if (course.isLiveAssessment && assessmentFailed) {
            return (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center space-y-3">
                    <div className="text-sm font-semibold text-gray-700">Total score</div>
                    <div className="text-2xl font-bold text-gray-900">{completedScore != null ? `${completedScore}%` : '—'}</div>
                    <p className="text-xs text-gray-600">You can request the admin to reset the assessment for another attempt.</p>
                    <Button
                        block
                        size="middle"
                        type="default"
                        icon={<TrophyOutlined />}
                        onClick={async () => {
                            try {
                                const res = await createAssessmentRequest({
                                    courseId: course._id,
                                    type: 'Re-Assessment'
                                }).unwrap();
                                if (res.success) message.success('Re-assessment request sent. Admin will schedule it again.');
                            } catch (err) {
                                message.error('Failed to send re-assessment request');
                            }
                        }}
                        disabled={isRequestingAssessment || hasReAssessmentPending}
                        loading={isRequestingAssessment}
                        className="!border-gray-300 !text-gray-700 hover:!border-[#efaa1f] hover:!text-[#efaa1f]"
                    >
                        {hasReAssessmentPending ? 'Re-assessment requested' : 'Request re-assessment'}
                    </Button>
                </div>
            );
        }

        const isStandardized = !course.isLiveAssessment;
        const hasLiveAssessmentPending = requests.some(
            (r: any) => (r.courseId?._id?.toString?.() ?? r.courseId?.toString?.()) === courseIdStr
                && r.type === 'Live Assessment'
                && ['Requested', 'Scheduled'].includes(r.status)
        );
        if (isStandardized && assessmentFailed) {
            return (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center space-y-3">
                    <div className="text-sm font-semibold text-gray-700">Total score</div>
                    <div className="text-2xl font-bold text-gray-900">{completedScore != null ? `${completedScore}%` : '—'}</div>
                    <p className="text-xs text-gray-600">You can request the admin to schedule a live assessment for another attempt.</p>
                    <Button
                        block
                        size="middle"
                        type="default"
                        icon={<TrophyOutlined />}
                        onClick={async () => {
                            try {
                                const res = await createAssessmentRequest({
                                    courseId: course._id,
                                    type: 'Live Assessment'
                                }).unwrap();
                                if (res.success) message.success('Request sent. Admin will schedule a live assessment for you.');
                            } catch (err) {
                                message.error('Failed to send request');
                            }
                        }}
                        disabled={isRequestingAssessment || hasLiveAssessmentPending}
                        loading={isRequestingAssessment}
                        className="!border-gray-300 !text-gray-700 hover:!border-[#efaa1f] hover:!text-[#efaa1f]"
                    >
                        {hasLiveAssessmentPending ? 'Live assessment requested' : 'Request live assessment'}
                    </Button>
                </div>
            );
        }

        // For live assessment: disable if request already sent. For standardized: no "request" flow — only disable while loading.
        const buttonDisabled = course.isLiveAssessment
            ? (assessmentRequested || isRequestingAssessment)
            : isRequestingAssessment;

        // Scheduled live assessment: learner can cancel before start; host will be notified and assessment moves to Completed (Cancelled).
        const scheduledRequest = course.isLiveAssessment
            ? requests.find(
                (r: any) => (r.courseId?._id?.toString?.() ?? r.courseId?.toString?.()) === courseIdStr
                    && (r.type === 'Live Assessment' || r.type === 'Re-Assessment')
                    && r.status === 'Scheduled'
            )
            : null;

        if (scheduledRequest && course.isLiveAssessment) {
            const scheduledStr = scheduledRequest.scheduledAt
                ? new Date(scheduledRequest.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                : '';
            return (
                <div className="space-y-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                        <div className="text-sm font-semibold text-amber-800">Assessment scheduled</div>
                        {scheduledStr && <div className="text-xs text-amber-700 mt-1">{scheduledStr}</div>}
                        <p className="text-xs text-amber-600 mt-2">You can cancel before it starts. The host will be notified and no action is required from admin.</p>
                    </div>
                    <Button
                        block
                        size="middle"
                        type="default"
                        danger
                        icon={<CloseCircleOutlined />}
                        loading={isCancellingAssessment}
                        onClick={() => {
                            Modal.confirm({
                                title: 'Cancel assessment?',
                                content: 'Your scheduled assessment will be cancelled. The host will receive a notification. You can request the assessment again later.',
                                okText: 'Yes, cancel',
                                cancelText: 'Keep it',
                                okButtonProps: { danger: true },
                                onOk: async () => {
                                    try {
                                        await updateAssessmentRequest({ id: scheduledRequest._id, status: 'Cancelled' }).unwrap();
                                        message.success('Assessment cancelled. You can request it again when ready.');
                                        onRefresh();
                                    } catch (err: any) {
                                        message.error(err?.data?.message || 'Failed to cancel assessment');
                                    }
                                },
                            });
                        }}
                        className="!border-amber-400 !text-amber-700 hover:!border-red-500 hover:!text-red-600"
                    >
                        Cancel assessment
                    </Button>
                </div>
            );
        }

        return (
            <Button
                block
                size="large"
                icon={<TrophyOutlined />}
                onClick={handleAssessmentBtnClick}
                disabled={buttonDisabled}
                loading={isRequestingAssessment}
                className="!text-black hover:!border-[#efaa1f] hover:!text-[#efaa1f] [&_.anticon]:hover:!text-[#efaa1f] disabled:!text-gray-400 disabled:hover:!border-gray-200 disabled:[&_.anticon]:!text-gray-400"
            >
                {course.isLiveAssessment
                    ? (assessmentRequested ? 'Request sent' : 'Request Final Assessment')
                    : 'Start Final Assessment'}
            </Button>
        );
    };

    // Resolve due date only from real data: API dueDate or enrollment date + course completion duration
    const resolvedDueDate = (() => {
        if (progress?.dueDate) {
            const s = typeof progress.dueDate === 'string' ? progress.dueDate : (progress.dueDate as Date)?.toISOString?.();
            if (s && !Number.isNaN(new Date(s).getTime())) return s;
        }
        const start = progress?.createdAt;
        const duration = course?.completionDuration;
        if (!start || !duration?.value || duration.value < 1) return undefined;
        const d = new Date(start);
        if (Number.isNaN(d.getTime())) return undefined;
        const unit = duration.unit === 'Weeks' ? 'Weeks' : duration.unit === 'Months' ? 'Months' : 'Days';
        if (unit === 'Days') d.setDate(d.getDate() + duration.value);
        else if (unit === 'Weeks') d.setDate(d.getDate() + duration.value * 7);
        else if (unit === 'Months') d.setMonth(d.getMonth() + duration.value);
        return d.toISOString();
    })();

    const curriculumSidebar = (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto w-full min-w-0 p-0">
            <CourseCurriculumSection
                lessons={lessons}
                allMaterials={allMaterials}
                assessmentPassed={progress?.assessmentStatus === 'Passed'}
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
                courseDescription={course?.description}
                courseCategory={course?.category ?? (Array.isArray(course?.categories) ? course.categories[0] : undefined)}
                variant="sidebar"
                dueDate={resolvedDueDate}
                enrolledDate={progress?.createdAt ?? undefined}
                renderHeaderLeft={
                    <Button
                        type="text"
                        size="small"
                        icon={<MenuFoldOutlined />}
                        onClick={() => setSidebarCollapsed(true)}
                        title="Collapse course content"
                        className="border-0 text-[hsl(var(--muted-foreground))] hover:!text-[hsl(var(--foreground))] hover:!bg-[hsl(var(--muted))]"
                    />
                }
                renderHeaderRight={
                    <Button
                        type="text"
                        size="small"
                        icon={<MenuFoldOutlined />}
                        onClick={() => setSidebarCollapsed(true)}
                        title="Collapse course content"
                        className="border-0 text-[hsl(var(--muted-foreground))] hover:!text-[hsl(var(--foreground))] hover:!bg-[hsl(var(--muted))]"
                    />
                }
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
                                <Title level={4} className="!mb-0 !mt-0 truncate font-bold text-gray-800">
                                    {course?.title}
                                </Title>
                            </div>
                            {renderActionButtons()}
                        </div>
                    )
                }
                rightSidebar={curriculumSidebar}
                rightSidebarCollapsed={sidebarCollapsed}
                onRightSidebarToggle={() => setSidebarCollapsed((c) => !c)}
                hideRightSidebarOnDesktop={isDesktop}
            >
                <div className={`flex flex-col gap-6 ${isDesktop && !sidebarCollapsed ? 'flex-1 min-h-0' : ''}`}>
                    <div className={`relative ${isDesktop && !sidebarCollapsed ? 'flex-1 min-h-0 h-full flex overflow-hidden' : ''}`}>
                        <div className={`flex flex-col min-h-0 ${isDesktop && !sidebarCollapsed ? 'flex-1 min-w-0 mr-[396px] xl:mr-[416px] h-full' : isDesktop ? 'flex-1 min-w-0' : 'w-full'}`}>
                            {(currentMaterial?.title || activeLesson) && (
                                <div className="mb-2 shrink-0">
                                    {currentMaterial?.title && <div className="text-base font-semibold text-gray-800">{currentMaterial.title}</div>}
                                    {activeLesson && <div className="text-xs text-gray-500 mt-0.5">Section: {activeLesson}</div>}
                                </div>
                            )}
                            <div className="bg-white p-2 rounded-xl shadow-sm border-2 border-[#efaa1f] flex-1 min-h-0 flex flex-col">
                                {renderIframePlayer()}
                            </div>
                        </div>
                        {isDesktop && (
                            <>
                                <Card
                                    bordered
                                    size="small"
                                    className={`lms-course-sidebar-card absolute right-0 top-0 bottom-0 w-[380px] min-w-[320px] xl:w-[400px] xl:min-w-[360px] overflow-hidden transition-transform duration-300 ease-out ${sidebarCollapsed ? 'translate-x-full' : 'translate-x-0'}`}
                                    style={{
                                        borderColor: '#efaa1f',
                                        borderRadius: 8,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        maxHeight: '100%',
                                        ...(sidebarCollapsed ? { pointerEvents: 'none' } : {}),
                                    }}
                                    styles={{ body: { flex: 1, minHeight: 0, overflow: 'auto', padding: 12 } }}
                                >
                                    {/* Break out of Card body padding so "Course content" green bar touches the green border */}
                                    <div className="min-h-0 h-full overflow-y-auto" style={{ margin: '0 -12px' }}>
                                        <CourseCurriculumSection
                                            lessons={lessons}
                                            allMaterials={allMaterials}
                                            assessmentPassed={progress?.assessmentStatus === 'Passed'}
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
                                            courseDescription={course?.description}
                                            courseCategory={course?.category ?? (Array.isArray(course?.categories) ? course.categories[0] : undefined)}
                                            variant="sidebar"
                                            dueDate={resolvedDueDate}
                                            enrolledDate={progress?.createdAt ?? undefined}
                                            renderHeaderLeft={
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<MenuFoldOutlined />}
                                                    onClick={() => setSidebarCollapsed(true)}
                                                    title="Collapse course content"
                                                    className="text-gray-500 hover:text-gray-700"
                                                />
                                            }
                                        />
                                    </div>
                                </Card>
                                {sidebarCollapsed && (
                                    <Button
                                        type="text"
                                        icon={<MenuUnfoldOutlined />}
                                        onClick={() => setSidebarCollapsed(false)}
                                        title="Expand course content"
                                        aria-label="Expand course content"
                                        className="!absolute right-0 top-[18%] -translate-y-1/2 z-10 !w-10 !h-14 !rounded-l-lg !border !border-r-0 !border-gray-200 !bg-white !shadow-md !flex !items-center !justify-center"
                                    />
                                )}
                            </>
                        )}
                    </div>
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
                            courseDescription={course?.description}
                            courseCategory={course?.category ?? (Array.isArray(course?.categories) ? course.categories[0] : undefined)}
                            dueDate={resolvedDueDate}
                            enrolledDate={progress?.createdAt ?? undefined}
                            assessmentPassed={progress?.assessmentStatus === 'Passed'}
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
