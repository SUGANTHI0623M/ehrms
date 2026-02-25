import React, { useState } from 'react';
import MainLayout from "@/components/MainLayout";
import type { ColumnsType } from 'antd/es/table';
import {
    Card,
    Table,
    Button,
    Tag,
    Progress,
    Tabs,
    Descriptions,
    Image,
    List,
    Empty,
    Form,
    Input,
    Select,
    Switch,
    InputNumber,
    Modal,
    Drawer,
    Row,
    Col,
    Space,
    Typography,
    Statistic,
    message,
    Badge,
    Upload,
    DatePicker,
    Radio,
    Popconfirm,
    Divider,
    Breadcrumb,
    Avatar
} from 'antd';
import {
    ArrowLeftOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    FileTextOutlined,
    VideoCameraOutlined,
    LinkOutlined,
    DownloadOutlined,
    MoreOutlined,
    UserOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    PlusOutlined,
    SendOutlined,
    FileExcelOutlined,
    CopyOutlined,
    EyeOutlined,
    YoutubeOutlined,
    FilePdfOutlined,
    UploadOutlined,
    GlobalOutlined,
    DragOutlined,
    HomeOutlined,
    UnorderedListOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CourseCurriculumSection from '@/components/lms/CourseCurriculumSection';
import { LmsDetailPageSkeleton } from '@/components/lms/SharedComponents';
import LMSCoursePlayer from './components/LMSCoursePlayer';
import { lmsService } from '@/services/lmsService';
import { getFileUrl } from '@/utils/url';
import CourseFormWizard from './components/CourseFormWizard';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// Types
interface Material {
    _id: string;
    type: 'YOUTUBE' | 'PDF' | 'VIDEO' | 'DRIVE' | 'URL';
    title: string;
    url: string;
    lessonTitle?: string;
    filePath?: string;
    originalFileName?: string;
    order: number;
}

interface Course {
    _id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    isMandatory: boolean;
    isLiveAssessment?: boolean;
    status: 'draft' | 'published';
    completionDuration: {
        value: number;
        unit: 'Days' | 'Weeks' | 'Months';
    };
    assignmentType: 'DEPARTMENT' | 'INDIVIDUAL' | 'ALL' | 'NONE';
    departments: string[];
    assignedEmployees: string[];
    materials: Material[];
    lessons: {
        _id: string;
        title: string;
        materials: Material[];
        questions: any[];
    }[];
    createdAt: string;
    updatedAt: string;
    instructor?: string;
}

interface LearnerProgress {
    _id: string;
    userId: {
        _id: string;
        name: string;
        employeeId: string;
        department: string;
        email: string;
    };
    courseId: string;
    completedLessons: string[];
    progress: number;
    status: 'not-started' | 'in-progress' | 'completed';
    lastAccessedAt: string;
    completedAt?: string;
    enrolledAt?: string;
    score?: number;
    timeSpent?: number;
}

interface Assessment {
    _id: string;
    courseId: string;
    passingScore: number;
    timeLimit?: number;
    totalQuestions: number;
}

const AdminCourseDetailPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();

    // State
    const [activeTab, setActiveTab] = useState('about');
    const [selectedLearner, setSelectedLearner] = useState<LearnerProgress | null>(null);
    const [learnerDrawerVisible, setLearnerDrawerVisible] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [courseContentDrawerOpen, setCourseContentDrawerOpen] = useState(false);

    // Fetch course details
    const { data: courseData, isLoading: courseLoading } = useQuery({
        queryKey: ['course', courseId],
        queryFn: async () => {
            const res = await lmsService.getCourseById(courseId!);
            return res.data;
        },
    });

    // Fetch assigned learners and their progress (analytics API returns real completion data)
    const { data: analyticsData, isLoading: learnersLoading } = useQuery({
        queryKey: ['course-learners', courseId],
        queryFn: async () => {
            const res = await lmsService.getCourseAnalytics(courseId!, { limit: 200, page: 1 });
            return res?.data ?? res;
        },
    });

    // Fetch assessment
    const { data: assessmentData } = useQuery({
        queryKey: ['assessment', courseId],
        queryFn: async () => {
            const response = await fetch(`/api/lms/courses/${courseId}/assessment`);
            if (!response.ok) return null;
            return response.json();
        },
    });

    // Update course mutation
    const updateCourseMutation = useMutation({
        mutationFn: async (values: any) => {
            const response = await fetch(`/api/lms/courses/${courseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!response.ok) throw new Error('Failed to update course');
            return response.json();
        },
        onSuccess: () => {
            message.success('Course updated successfully');
            queryClient.invalidateQueries({ queryKey: ['course', courseId] });
        },
        onError: () => {
            message.error('Failed to update course');
        },
    });

    // Delete course mutation
    const deleteCourseMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/lms/courses/${courseId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete course');
            return response.json();
        },
        onSuccess: () => {
            message.success('Course deleted successfully');
            navigate('/lms/courses');
        },
        onError: () => {
            message.error('Failed to delete course');
        },
    });

    // Publish/Unpublish mutation
    const togglePublishMutation = useMutation({
        mutationFn: async (publish: boolean) => {
            const response = await fetch(`/api/lms/courses/${courseId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: publish ? 'Published' : 'Archived' }),
            });
            if (!response.ok) throw new Error('Failed to update status');
            return response.json();
        },
        onSuccess: (_, publish) => {
            message.success(`Course ${publish ? 'published' : 'archived'} successfully`);
            queryClient.invalidateQueries({ queryKey: ['course', courseId] });
        },
    });

    // Reset learner progress (course starts from the beginning)
    const resetLearnerProgressMutation = useMutation({
        mutationFn: async (employeeId: string) => {
            await lmsService.resetLearnerProgress(courseId!, employeeId);
        },
        onSuccess: () => {
            message.success('Course reset successfully. Learner can start from the beginning.');
            queryClient.invalidateQueries({ queryKey: ['course-learners', courseId] });
        },
        onError: () => {
            message.error('Failed to reset learner progress.');
        },
    });

    if (courseLoading) {
        return (
            <MainLayout>
                <div className="min-h-[60vh] p-4 md:p-8">
                    <LmsDetailPageSkeleton />
                </div>
            </MainLayout>
        );
    }

    // API returns { data: { course, progress } }; ensure we use the course object for display and edit wizard
    const course: Course = courseData?.data?.course ?? courseData?.data ?? courseData;
    const assessment: Assessment | null = assessmentData?.data || assessmentData;

    // Map analytics response to table shape and normalize status for display
    const rawAnalytics = analyticsData?.data ?? analyticsData;
    const rawLearners = rawAnalytics?.learners ?? [];
    const rawStats = rawAnalytics?.analytics ?? {};
    const normalizeStatus = (s: string): LearnerProgress['status'] => {
        const v = (s || '').toLowerCase().replace(/\s+/g, '-');
        if (v === 'completed') return 'completed';
        if (v === 'in-progress') return 'in-progress';
        if (v === 'not-started') return 'not-started';
        return 'in-progress';
    };
    const learners: LearnerProgress[] = rawLearners.map((p: any) => ({
        _id: p.progressId ?? p._id,
        userId: {
            _id: p._id,
            name: p.name ?? 'Unknown',
            employeeId: p.employeeId ?? '',
            department: p.department ?? '',
            email: p.email ?? ''
        },
        courseId: courseId!,
        completedLessons: [],
        progress: typeof p.progress === 'number' ? p.progress : 0,
        status: normalizeStatus(p.status),
        lastAccessedAt: p.lastActive ?? p.lastAccessedAt ?? '',
        score: p.score,
        timeSpent: p.timeSpent
    }));

    // Use analytics KPIs when available so progress reflects backend
    const totalEnrolled = rawStats.totalEnrolled ?? learners.length;
    const completionRate = typeof rawStats.completionRate === 'number' ? rawStats.completionRate : (totalEnrolled > 0 ? (learners.filter((l) => l.status === 'completed').length / totalEnrolled) * 100 : 0);
    const avgScore = typeof rawStats.avgScore === 'number' ? rawStats.avgScore : (learners.filter((l) => l.score != null).reduce((acc, l) => acc + (l.score || 0), 0) / (learners.filter((l) => l.score != null).length || 1));

    const groupMaterialsByLesson = (materials: Material[]): any[] => {
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
            materials,
            order: index + 1
        }));
    };

    const lessons = course?.lessons && course.lessons.length > 0
        ? course.lessons
        : groupMaterialsByLesson(course?.materials || []);
    // Move useState hooks to top level, but for now this is fine as they were in original
    // Just ensuring we don't break rules of hooks if re-arranging.

    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
    const [activeLessonKey, setActiveLessonKey] = useState<string | null>(null);

    // Learner table columns
    const learnerColumns: ColumnsType<LearnerProgress> = [
        {
            title: 'Name',
            dataIndex: ['userId', 'name'],
            key: 'name',
            sorter: (a, b) => a.userId.name.localeCompare(b.userId.name),
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Department',
            dataIndex: ['userId', 'department'],
            key: 'department',
            render: (text) => <Tag>{text}</Tag>
        },
        {
            title: 'Progress',
            dataIndex: 'progress',
            key: 'progress',
            render: (progress: number) => <Progress percent={Math.round(progress)} size="small" strokeColor="#10b981" />,
            sorter: (a, b) => a.progress - b.progress,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors = {
                    'not-started': 'default',
                    'in-progress': 'processing',
                    completed: 'success',
                };
                return <Tag color={colors[status as keyof typeof colors]}>{status.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Last Accessed',
            dataIndex: 'lastAccessedAt',
            key: 'lastAccessedAt',
            render: (date: string) => (date ? dayjs(date).format('MMM DD, YYYY') : 'Never'),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                const employeeId = (record as any).userId?._id ?? (record as any)._id;
                return (
                    <Space size="small">
                        <Button
                            type="link"
                            size="small"
                            onClick={() => {
                                setSelectedLearner(record);
                                setLearnerDrawerVisible(true);
                            }}
                        >
                            Details
                        </Button>
                        <Popconfirm
                            title="Reset course progress"
                            description="This will reset the learner's progress so they start the course from the beginning. Continue?"
                            onConfirm={() => resetLearnerProgressMutation.mutate(employeeId)}
                            okText="Reset"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                        >
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<ReloadOutlined />}
                                loading={resetLearnerProgressMutation.isPending}
                                title="Reset course for this learner"
                            />
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const handleDeleteCourse = () => {
        // Handled via Popconfirm usually, but if called directly:
        deleteCourseMutation.mutate();
    };

    return (
        <MainLayout>
            <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#f8f9fa]">
                {/* Header + KPIs: scrolls with page */}
                <div className="shrink-0 p-6 pb-4 space-y-6">
                    <div className="flex flex-col gap-4">
                        <Breadcrumb items={[
                            { title: <a href="/lms/dashboard"><HomeOutlined /> LMS</a> },
                            { title: <a href="/lms/courses">Courses</a> },
                            { title: course.title }
                        ]} />

                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-4">
                                <Button
                                    icon={<ArrowLeftOutlined />}
                                    onClick={() => navigate('/lms/courses')}
                                    className="mt-1 border-gray-200"
                                />
                                {course.thumbnailUrl && (
                                    <div className="hidden md:block">
                                        <Image
                                            width={120}
                                            height={80}
                                            className="rounded-lg object-cover border"
                                            src={getFileUrl(course.thumbnailUrl)}
                                            fallback="https://placehold.co/120x80/f3f4f6/9ca3af?text=No+Preview"
                                        />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Tag color={course.status === 'published' ? 'success' : 'orange'}>
                                            {course.status?.toUpperCase() || 'DRAFT'}
                                        </Tag>
                                        {course.isMandatory && <Tag color="red">MANDATORY</Tag>}
                                    </div>
                                    <Title level={2} className="!m-0">{course.title}</Title>
                                </div>
                            </div>

                            <Space>
                                <Button
                                    type="primary"
                                    icon={<EditOutlined />}
                                    onClick={() => setIsEditModalOpen(true)}
                                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                                >
                                    Edit Course
                                </Button>
                                {totalEnrolled === 0 && (
                                    <Popconfirm
                                        title="Delete Course"
                                        description="Are you sure you want to delete this course? This action cannot be undone."
                                        onConfirm={() => deleteCourseMutation.mutate()}
                                        okText="Yes"
                                        cancelText="No"
                                        okType="danger"
                                    >
                                        <Button danger icon={<DeleteOutlined />}>Delete</Button>
                                    </Popconfirm>
                                )}
                            </Space>
                        </div>
                    </div>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card className="shadow-sm border-gray-100 h-full">
                                <Statistic
                                    title={<Text type="secondary">Total Enrolled</Text>}
                                    value={totalEnrolled}
                                    prefix={<UserOutlined className="text-emerald-500" />}
                                    valueStyle={{ fontWeight: 'bold' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card className="shadow-sm border-gray-100 h-full">
                                <Statistic
                                    title={<Text type="secondary">Completion Rate</Text>}
                                    value={completionRate}
                                    precision={1}
                                    suffix="%"
                                    prefix={<CheckCircleOutlined className="text-blue-500" />}
                                    valueStyle={{ fontWeight: 'bold' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card className="shadow-sm border-gray-100 h-full">
                                <Statistic
                                    title={<Text type="secondary">Avg Assessment Score</Text>}
                                    value={avgScore}
                                    precision={1}
                                    suffix="%"
                                    prefix={<TrophyOutlined className="text-amber-500" />}
                                    valueStyle={{ fontWeight: 'bold' }}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <Card className="shadow-sm border-gray-100 h-full">
                                <Statistic
                                    title={<Text type="secondary">Total Lessons</Text>}
                                    value={course.materials.length}
                                    prefix={<FileTextOutlined className="text-purple-500" />}
                                    valueStyle={{ fontWeight: 'bold' }}
                                />
                            </Card>
                        </Col>
                    </Row>
                </div>

                {/* Mobile: button to open course content in drawer (sidebar hidden below lg) */}
                <div className="lg:hidden px-6 pb-2">
                    <Button
                        type="default"
                        icon={<UnorderedListOutlined />}
                        onClick={() => setCourseContentDrawerOpen(true)}
                        className="w-full sm:w-auto"
                    >
                        Course content ({course?.materials?.length ?? 0} items)
                    </Button>
                </div>

                {/* Main content row: main scrolls; fixed sidebar on lg+ */}
                <div className="flex flex-1 gap-6 px-6 items-stretch">
                    {/* Course details area – scrolls with page; reserve right margin for fixed sidebar on lg+ */}
                    <div className="flex-1 min-w-0 pb-6 lg:mr-[380px] xl:mr-[400px]">
                        <Card
                            className="shadow-sm border-gray-100 min-h-[400px]"
                            bodyStyle={{ padding: '0px' }}
                        >
                            <Tabs
                                activeKey={activeTab}
                                onChange={setActiveTab}
                                size="large"
                                tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
                                items={[
                                    {
                                        key: 'about',
                                        label: 'About',
                                        children: (
                                            <div className="p-6">
                                                <Title level={4}>Course Description</Title>
                                                <Paragraph className="text-gray-600 leading-relaxed max-w-3xl">
                                                    {course.description}
                                                </Paragraph>

                                                <Divider />

                                                <Descriptions title="Course Information" bordered column={{ xxl: 2, xl: 2, lg: 1, md: 2, sm: 1, xs: 1 }}>
                                                    <Descriptions.Item label="Duration">{course.completionDuration?.value} {course.completionDuration?.unit}</Descriptions.Item>
                                                    <Descriptions.Item label="Materials">{course.materials?.length || 0} Items</Descriptions.Item>
                                                    <Descriptions.Item label="Assignment Type"><Tag>{course.assignmentType === 'NONE' ? 'Not assigned' : course.assignmentType}</Tag></Descriptions.Item>
                                                    <Descriptions.Item label="Created">{dayjs(course.createdAt).format('MMM DD, YYYY')}</Descriptions.Item>
                                                    <Descriptions.Item label="Departments">
                                                        {course.departments?.length > 0 ? (
                                                            <Space wrap>{course.departments.map(d => <Tag key={String(d)} color="blue">{String(d)}</Tag>)}</Space>
                                                        ) : <Text type="secondary">N/A</Text>}
                                                    </Descriptions.Item>
                                                </Descriptions>
                                            </div>
                                        )
                                    },
                                    {
                                        key: 'learners',
                                        label: 'Learner Progress',
                                        children: (
                                            <div className="p-0">
                                                <Table
                                                    columns={learnerColumns}
                                                    dataSource={learners}
                                                    rowKey="_id"
                                                    pagination={{ pageSize: 10 }}
                                                    className="w-full"
                                                />
                                            </div>
                                        )
                                    },
                                    {
                                        key: 'assessment',
                                        label: 'Assessment',
                                        children: (
                                            <div className="p-6">
                                                {assessment ? (
                                                    <Space direction="vertical" className="w-full" size="middle">
                                                        <Card type="inner" title="Assessment Configuration" className="bg-gray-50 border-gray-100">
                                                            <Descriptions column={2}>
                                                                <Descriptions.Item label="Passing Score">{assessment.passingScore}%</Descriptions.Item>
                                                                <Descriptions.Item label="Total Questions">{assessment.totalQuestions}</Descriptions.Item>
                                                                <Descriptions.Item label="Time Limit">{assessment.timeLimit ? `${assessment.timeLimit} mins` : 'No Limit'}</Descriptions.Item>
                                                            </Descriptions>
                                                        </Card>
                                                        <Space>
                                                            <Button icon={<EditOutlined />}>Edit Assessment</Button>
                                                            <Button danger icon={<DeleteOutlined />}>Delete</Button>
                                                        </Space>
                                                    </Space>
                                                ) : (
                                                    <Empty description="No assessment configured" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                                                        <Button type="primary" icon={<PlusOutlined />}>Create Assessment</Button>
                                                    </Empty>
                                                )}
                                            </div>
                                        )
                                    },
                                    {
                                        key: 'preview',
                                        label: 'Preview',
                                        children: (
                                            <div className="bg-gray-900 rounded-b-lg overflow-hidden">
                                                <LMSCoursePlayer
                                                    course={course}
                                                    progress={null}
                                                    isAdmin={true}
                                                    onUpdateProgress={async () => { }}
                                                    onMarkLessonComplete={async () => { }}
                                                    onRefresh={async () => { }}
                                                    onGenerateQuiz={async () => { }}
                                                />
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </Card>
                    </div>

                    {/* Right sidebar: sticky below header (64px), full height – see .course-content-sidebar in index.css */}
                    <div className="course-content-sidebar hidden lg:flex w-[380px] xl:w-[400px] flex-shrink-0 border-l border-gray-200 bg-white shadow-lg flex flex-col z-10">
                        {/* Quick Actions: compact strip so course content is primary like employee */}
                        <div className="shrink-0 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                            <Text strong className="text-sm text-gray-700 block mb-3">Quick Actions</Text>
                            <Space direction="vertical" className="w-full" size="small">
                                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100">
                                    <Text className="text-sm">Status</Text>
                                    <Switch
                                        checked={course.status === 'published'}
                                        onChange={(checked) => togglePublishMutation.mutate(checked)}
                                        checkedChildren="Live"
                                        unCheckedChildren="Draft"
                                        loading={togglePublishMutation.isPending}
                                    />
                                </div>
                                <Button icon={<SendOutlined />} block size="small">Notify Employees</Button>
                                <Button icon={<DownloadOutlined />} block size="small">Export Report</Button>
                            </Space>
                        </div>

                        {/* Course content: independently scrollable (full height to viewport bottom) */}
                        <div className="course-content-sidebar-inner flex flex-col">
                            <CourseCurriculumSection
                                lessons={lessons}
                                allMaterials={course.materials}
                                activeLessonKey={activeLessonKey}
                                setActiveLessonKey={setActiveLessonKey}
                                selectedMaterialId={selectedMaterialId}
                                onMaterialClick={(material, globalIndex) => {
                                    setSelectedMaterialId(material._id);
                                    setActiveLessonKey(material.lessonTitle || lessons[0]?.title || null);
                                }}
                                isAdmin={true}
                                progressPercentage={0}
                                completedMaterials={[]}
                                isLessonLocked={() => false}
                                isLessonCompleted={() => false}
                                courseTitle={course.title}
                                courseCategory={course?.category}
                                variant="sidebar"
                            />
                        </div>
                    </div>
                </div>

                {/* Edit Modal */}
                <CourseFormWizard
                    open={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    initialData={course}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['course', courseId] });
                    }}
                />
            </div>

            {/* Mobile: Course content drawer (full list when sidebar is hidden) */}
            <Drawer
                title="Course content"
                placement="right"
                onClose={() => setCourseContentDrawerOpen(false)}
                open={courseContentDrawerOpen}
                width="min(100%, 400px)"
                bodyStyle={{ padding: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
            >
                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    <CourseCurriculumSection
                        lessons={lessons}
                        allMaterials={course.materials}
                        activeLessonKey={activeLessonKey}
                        setActiveLessonKey={setActiveLessonKey}
                        selectedMaterialId={selectedMaterialId}
                        onMaterialClick={(material, globalIndex) => {
                            setSelectedMaterialId(material._id);
                            setActiveLessonKey(material.lessonTitle || lessons[0]?.title || null);
                            setCourseContentDrawerOpen(false);
                        }}
                        isAdmin={true}
                        progressPercentage={0}
                        completedMaterials={[]}
                        isLessonLocked={() => false}
                        isLessonCompleted={() => false}
                        courseTitle={course.title}
                        courseCategory={course?.category}
                        variant="sidebar"
                    />
                </div>
            </Drawer>

            {/* Slide-out Drawer for Learner Details */}
            <Drawer
                title="Learner Details"
                placement="right"
                onClose={() => setLearnerDrawerVisible(false)}
                open={learnerDrawerVisible}
                width={500}
            >
                {selectedLearner && (
                    <div className="space-y-6">
                        <div className="text-center pb-4 border-b">
                            <Avatar size={64} icon={<UserOutlined />} className="bg-emerald-100 text-emerald-600 mb-2" />
                            <Title level={4} style={{ margin: 0 }}>{selectedLearner.userId?.name}</Title>
                            <Text type="secondary">{selectedLearner.userId?.employeeId}</Text>
                        </div>

                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="Department">{selectedLearner.userId?.department}</Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={selectedLearner.status === 'completed' ? 'success' : 'processing'}>
                                    {selectedLearner.status.toUpperCase()}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Progress">
                                <Progress percent={Math.round(selectedLearner.progress)} size="small" />
                            </Descriptions.Item>
                            <Descriptions.Item label="Score">{selectedLearner.score ?? 'N/A'}</Descriptions.Item>
                        </Descriptions>

                        <div>
                            <Title level={5}>Completed Lessons</Title>
                            <List
                                size="small"
                                dataSource={selectedLearner.completedLessons}
                                renderItem={(lesson) => (
                                    <List.Item>
                                        <Text><CheckCircleOutlined className="text-emerald-500 mr-2" /> {lesson}</Text>
                                    </List.Item>
                                )}
                                locale={{ emptyText: "No lessons completed yet" }}
                            />
                        </div>
                    </div>
                )}
            </Drawer>
        </MainLayout>
    );
};

// Helper component for Trophy icon if not imported
function TrophyOutlined(props: any) {
    return <span role="img" aria-label="trophy" className="anticon anticon-trophy" {...props}>
        <svg viewBox="64 64 896 896" focusable="false" data-icon="trophy" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M832 192H704V128c0-17.7-14.3-32-32-32H352c-17.7 0-32 14.3-32 32v64H192c-17.7 0-32 14.3-32 32v160c0 96.6 66.8 177.3 157.1 199.3 22.8 83.2 87.6 148 171.4 171H416c-17.7 0-32 14.3-32 32v32c0 17.7 14.3 32 32 32h192c17.7 0 32-14.3 32-32v-32c0-17.7-14.3-32-32-32H535.5c83.8-23 148.6-87.8 171.4-171C797.2 461.3 864 380.6 864 284V224c0-17.7-14.3-32-32-32zM232 224h128v160H232V224zm192 160V160h176v224H424zm368-64h-128V224h128v96z"></path></svg>
    </span>
}

export default AdminCourseDetailPage;
