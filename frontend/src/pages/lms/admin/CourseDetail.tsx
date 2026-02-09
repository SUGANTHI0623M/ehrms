import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { LmsPageLayout, LmsSectionHeader, LmsCard } from '@/components/lms/SharedComponents';
import CourseCurriculumSection from '@/components/lms/CourseCurriculumSection';
import type { Lesson, Material } from '@/components/lms/LmsCourseSidebar';
import {
    Typography, Progress, Button, Tag, Space,
    Card, List, Avatar, Spin, Result,
    message, Empty, Table, Input, Select, Badge,
    Row, Col, Alert, Statistic, Divider, Tooltip, Popconfirm,
    Modal, Form, Tabs
} from 'antd';
import {
    ArrowLeftOutlined, EditOutlined, TeamOutlined, RiseOutlined, TrophyOutlined, BookOutlined,
    SearchOutlined, FilterOutlined, FileTextOutlined, DownloadOutlined,
    FilePdfOutlined, VideoCameraOutlined, YoutubeOutlined, GlobalOutlined, CloudSyncOutlined,
    FileOutlined, ExportOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined, UserOutlined,
    EyeOutlined, EyeInvisibleOutlined, UserAddOutlined
} from '@ant-design/icons';
import { lmsService } from '@/services/lmsService';
import dayjs from 'dayjs';
import CourseFormWizard from '../components/CourseFormWizard';
import { getFileUrl } from '@/utils/url';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface LearnerProgress {
    employeeId: string;
    progressId?: string; // Added for actions
    name: string;
    email: string;
    profilePicture?: string;
    enrolledDate: string;
    completedLessons: string[];
    totalLessons: number;
    progressPercentage: number;
    currentLesson?: string;
    status: 'Not Started' | 'In Progress' | 'Completed';
    lastAccessed?: string;
    completionDate?: string;
    assessmentScore?: number;
    isAccessBlocked?: boolean; // Added for pause status
}

const CourseDetail = () => {
    const { courseId } = useParams(); // Note: Route param is 'courseId' based on existing code
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [course, setCourse] = useState<any>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [activeLesson, setActiveLesson] = useState<string | null>(null);
    const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Learner Progress States
    const [learnerProgress, setLearnerProgress] = useState<LearnerProgress[]>([]);
    const [loadingLearners, setLoadingLearners] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [activeTab, setActiveTab] = useState('overview');
    const [analytics, setAnalytics] = useState<any>(null);

    // Assign Learners modal
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignForm] = Form.useForm();
    const [assignSubmitting, setAssignSubmitting] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [fetchingOrg, setFetchingOrg] = useState(false);

    useEffect(() => {
        if (courseId) {
            fetchCourseDetails();
        }
    }, [courseId]);

    const fetchAssignModalData = async () => {
        setFetchingOrg(true);
        try {
            const [deptRes, empRes] = await Promise.all([
                lmsService.getDepartments(),
                lmsService.getEmployees()
            ]);
            setDepartments(deptRes?.data?.departments || []);
            setEmployees(empRes?.data?.staff || []);
        } catch (e) {
            message.error('Failed to load departments/employees');
        } finally {
            setFetchingOrg(false);
        }
    };

    const openAssignModal = () => {
        assignForm.resetFields();
        setAssignModalOpen(true);
        fetchAssignModalData();
    };

    const handleAssignSubmit = async () => {
        try {
            const values = await assignForm.validateFields();
            const isByDept = values.assignmentType === 'By Department';
            const targetIds = isByDept ? (values.departments || []) : (values.employees || []);
            if (!targetIds.length) {
                message.warning(isByDept ? 'Select at least one department' : 'Select at least one employee');
                return;
            }
            setAssignSubmitting(true);
            await lmsService.assignCourse(courseId!, {
                assignedTo: isByDept ? 'Department' : 'Individual',
                targetIds,
                mandatory: false,
                dueDate: undefined
            });
            message.success('Course assigned successfully');
            setAssignModalOpen(false);
            fetchLearnerProgress(pagination.current);
        } catch (err: any) {
            if (err?.errorFields) return; // validation
            message.error(err?.response?.data?.error?.message || 'Failed to assign course');
        } finally {
            setAssignSubmitting(false);
        }
    };

    const groupMaterialsByLesson = (materials: any[]): Lesson[] => {
        const grouped: any[] = [];
        materials.forEach(material => {
            const lessonTitle = material.lessonTitle || 'Introduction';
            let lesson = grouped.find(l => l.title === lessonTitle);
            if (!lesson) {
                lesson = {
                    id: lessonTitle,
                    title: lessonTitle,
                    materials: []
                };
                grouped.push(lesson);
            }
            lesson.materials.push(material);
        });
        return grouped;
    };

    const fetchCourseDetails = async () => {
        setLoading(true);
        try {
            const res = await lmsService.getCourseById(courseId!);
            if (res.data) {
                const courseData = res.data.course;
                setCourse(courseData);

                const allMaterials = [
                    ...(courseData.materials || []),
                    ...(courseData.contents || [])
                ];
                const groupedLessons = groupMaterialsByLesson(allMaterials);
                setLessons(groupedLessons);

                if (groupedLessons.length > 0) {
                    setActiveLesson(groupedLessons[0].title);
                    if (groupedLessons[0].materials.length > 0) {
                        setSelectedMaterial(groupedLessons[0].materials[0]);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch course details", error);
            message.error("Failed to load course details");
        } finally {
            setLoading(false);
        }
    };

    // Updated Data Fetching with Params
    const fetchLearnerProgress = async (page = 1, limit = 10) => {
        if (!courseId) return;
        setLoadingLearners(true);
        try {
            const params: any = { page, limit };
            if (searchText) params.search = searchText;
            if (statusFilter !== 'All') params.status = statusFilter;

            const res = await lmsService.getCourseAnalytics(courseId, params); // Updated service call signature
            if (res.success && res.data.learners) {
                setLearnerProgress(res.data.learners);
                setAnalytics(res.data.analytics);
                setPagination({
                    current: res.data.pagination.page,
                    pageSize: res.data.pagination.limit,
                    total: res.data.pagination.total
                });
            }
        } catch (error) {
            console.error('Failed to fetch learner progress:', error);
            message.error('Failed to load learner progress');
        } finally {
            setLoadingLearners(false);
        }
    };

    // State for pagination
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

    const handlePublishToggle = async () => {
        if (!course) return;
        const newStatus = course.status === 'Published' ? 'Archived' : 'Published';
        try {
            await lmsService.updateCourseStatus(course._id, newStatus);
            message.success(`Course ${newStatus} successfully`);
            fetchCourseDetails(); // Refresh
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to update course status');
        }
    };

    useEffect(() => {
        if (activeTab === 'analysis') {
            fetchLearnerProgress(1, pagination.pageSize);
        }
    }, [statusFilter, activeTab]);

    const handleTableChange = (newPagination: any) => {
        fetchLearnerProgress(newPagination.current, newPagination.pageSize);
    };

    const handleToggleAccess = async (progressId: string, currentStatus?: boolean) => {
        try {
            await lmsService.toggleCourseAccess(progressId, !currentStatus);
            message.success(!currentStatus ? 'Learner access paused' : 'Learner access restored');
            fetchLearnerProgress(pagination.current); // Refresh data
        } catch (error) {
            message.error('Failed to update access status');
        }
    };

    const handleUnenroll = async (progressId: string) => {
        try {
            await lmsService.unenrollLearner(progressId);
            message.success('Learner removed from course');
            fetchLearnerProgress(pagination.current); // Refresh list
        } catch (error) {
            message.error('Failed to remove learner');
        }
    };

    const handleMaterialClick = (material: Material, _globalIndex?: number) => {
        setSelectedMaterial(material);
        setActiveLesson(material.lessonTitle || null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const allMaterials: Material[] = course
        ? [...(course.materials || []), ...(course.contents || [])]
        : [];

    const getIconForType = (type: string) => {
        switch (type) {
            case 'PDF': return <FilePdfOutlined className="text-red-500" />;
            case 'VIDEO': return <VideoCameraOutlined className="text-primary" />;
            case 'YOUTUBE': return <YoutubeOutlined className="text-red-600" />;
            case 'URL': return <GlobalOutlined className="text-green-500" />;
            case 'DRIVE': return <CloudSyncOutlined className="text-yellow-500" />;
            default: return <FileOutlined />;
        }
    };

    const renderMediaPreview = () => {
        if (!selectedMaterial) {
            return (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-gray-400">Select a lesson from the sidebar to preview content</span>}
                    className="my-20"
                />
            );
        }

        const url = getFileUrl(selectedMaterial.url || selectedMaterial.filePath);
        const { type, title } = selectedMaterial;

        const isValidMediaUrl = (u: string) => {
            const s = (u || '').trim();
            if (!s || s === '/' || s.startsWith('javascript:')) return false;
            try {
                const parsed = new URL(s, 'http://localhost');
                if (parsed.pathname === '/' || parsed.pathname === '') return false;
            } catch {
                // relative path
            }
            return true;
        };

        const PreviewHeader = () => (
            <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gray-50 rounded">
                        {getIconForType(type)}
                    </div>
                    <Text strong className="text-base">{title}</Text>
                    <Tag className="ml-2">{type}</Tag>
                </div>
                <Button
                    type="text"
                    icon={<ExportOutlined />}
                    onClick={() => window.open(url, '_blank')}
                    title="Open in new tab"
                />
            </div>
        );

        const renderContent = () => {
            if (!isValidMediaUrl(url)) {
                return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
                        <Text type="secondary">No learning material available for this lesson.</Text>
                    </div>
                );
            }
            switch (type) {
                case 'PDF':
                    return (
                        <div className="w-full rounded-xl overflow-hidden bg-gray-100">
                            <iframe
                                key={url}
                                src={`${url}#toolbar=1&view=FitH`}
                                className="w-full border-none bg-gray-100 min-h-[600px] h-[75vh]"
                                title="PDF Preview"
                            />
                        </div>
                    );
                case 'VIDEO': {
                    const subtitleUrl = (selectedMaterial as any).subtitleUrl;
                    const subtitleResolved = subtitleUrl ? getFileUrl(subtitleUrl) : '';
                    return (
                        <div className="w-full bg-black flex items-center justify-center aspect-video">
                            <video
                                controls
                                controlsList="nodownload"
                                crossOrigin="anonymous"
                                className="max-w-full max-h-full"
                                src={url}
                            >
                                {subtitleResolved && <track kind="subtitles" src={subtitleResolved} default />}
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    );
                }
                case 'YOUTUBE':
                    let videoId = url;
                    if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0];
                    if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1];
                    if (!videoId) {
                        return (
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
                                <Text type="secondary">No learning material available for this lesson.</Text>
                            </div>
                        );
                    }
                    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
                    return <iframe className="w-full aspect-video" src={embedUrl} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
                case 'URL':
                case 'DRIVE':
                    return (
                        <div className="w-full aspect-video relative border-none bg-white">
                            <iframe src={url} className="w-full h-full" title="External Content" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                            <div className="absolute bottom-2 right-2 bg-white/90 p-2 rounded shadow text-xs text-gray-500">
                                If content doesn't load, <a href={url} target="_blank" rel="noopener noreferrer">open externally</a>
                            </div>
                        </div>
                    );
                default:
                    return <Alert message="Unsupported content type" type="warning" showIcon className="m-4" />;
            }
        };

        return (
            <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-green-600 overflow-hidden">
                <PreviewHeader />
                <div className="flex-1 bg-gray-50">
                    {renderContent()}
                </div>
            </div>
        );
    };

    const renderLearnerAnalytics = () => {
        // Removed client-side filtering logic here

        const columns = [
            {
                title: 'Learner',
                dataIndex: 'name',
                key: 'name',
                width: 280,
                render: (text: string, record: LearnerProgress) => (
                    <Space>
                        <Avatar src={record.profilePicture} icon={<UserOutlined />} />
                        <div>
                            <div className="font-medium text-sm">{text}</div>
                            <Text type="secondary" className="text-xs">{record.email}</Text>
                        </div>
                    </Space>
                )
            },
            {
                title: 'Assigned Date',
                dataIndex: 'enrolledDate',
                key: 'enrolledDate',
                render: (date: string) => <span className="text-xs text-gray-500">{dayjs(date).format('MMM D, YYYY')}</span>
            },
            {
                title: 'Progress',
                dataIndex: 'progressPercentage',
                key: 'progress',
                width: 250,
                render: (percent: number, record: LearnerProgress) => (
                    <div className="w-full">
                        <div className="flex justify-between text-xs mb-1">
                            <span>{percent}%</span>
                            <span className="text-gray-400">{record.completedLessons}/{record.totalLessons} Lessons</span>
                        </div>
                        <Progress percent={percent} showInfo={false} size="small" strokeColor={percent < 40 ? '#ff4d4f' : percent < 70 ? '#faad14' : '#52c41a'} />
                    </div>
                )
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (status: string, record: LearnerProgress) => {
                    let displayStatus = 'Not Started';
                    let color = 'default';

                    const passingScore = course.qualificationScore || 80;
                    const score = record.assessmentScore || 0;
                    const lessonsCount = record.completedLessons?.length || 0;
                    const totalLessons = record.totalLessons || 0;
                    const isLessonsCompleted = totalLessons > 0 && lessonsCount === totalLessons;

                    // 1. Course Completed (Passed)
                    if (status === 'Completed' && score >= passingScore) {
                        displayStatus = 'Course Completed';
                        color = 'success';
                    }
                    // 2. Lessons Completed (All lessons done, but not necessarily passed/completed course)
                    else if (isLessonsCompleted) {
                        displayStatus = 'Lessons Completed';
                        color = 'cyan';
                    }
                    // 3. Ongoing (In Progress)
                    else if (status === 'In Progress') {
                        displayStatus = 'Ongoing';
                        color = 'processing';
                    }

                    return <Tag color={color}>{displayStatus}</Tag>;
                }
            },
            {
                title: 'Access',
                key: 'access',
                render: (_, record: LearnerProgress) => (
                    record.isAccessBlocked ?
                        <Badge status="error" text="Paused" /> :
                        <Badge status="success" text="Active" />
                )
            },
            {
                title: 'Score',
                dataIndex: 'assessmentScore',
                key: 'score',
                render: (score: number) => score ? <Text strong>{score}%</Text> : <span className="text-gray-400">-</span>
            },
            {
                title: 'Action',
                key: 'action',
                render: (_, record: LearnerProgress) => (
                    <Space split={<Divider type="vertical" />}>
                        <Tooltip title={record.isAccessBlocked ? "Resume Course Access" : "Pause Course Access"}>
                            <Button
                                type="text"
                                size="small"
                                danger={!record.isAccessBlocked}
                                icon={record.isAccessBlocked ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                                onClick={() => handleToggleAccess(record.progressId!, record.isAccessBlocked)}
                            >
                            </Button>
                        </Tooltip>

                        <Popconfirm
                            title="Remove learner from course?"
                            description="This will delete their progress permanently. Are you sure?"
                            onConfirm={() => handleUnenroll(record.progressId!)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                            />
                        </Popconfirm>
                    </Space>
                )
            }
        ];

        return (
            <div className="space-y-6">
                {/* KPI Cards */}
                <Row gutter={[16, 16]}>
                    {[
                        { title: 'Total Enrolled', value: analytics?.totalEnrolled || 0, icon: <TeamOutlined />, color: 'blue', trend: '+12%' },
                        { title: 'Completion Rate', value: `${analytics?.completionRate || 0}%`, icon: <RiseOutlined />, color: 'emerald', trend: '+5%' },
                        { title: 'Avg. Quiz Score', value: `${analytics?.avgScore || 0}%`, icon: <TrophyOutlined />, color: 'amber', trend: '+2.4%' },
                        { title: 'Active Learners', value: analytics?.activeLearners || 0, icon: <UserOutlined />, color: 'indigo', trend: 'Live' }
                    ].map((item, idx) => (
                        <Col xs={24} sm={6} key={idx}>
                            <Card className="rounded-2xl shadow-sm border-gray-100 hover:shadow-md transition-all duration-300">
                                <Statistic
                                    title={<Text type="secondary" className="text-xs font-semibold uppercase tracking-wider">{item.title}</Text>}
                                    value={item.value}
                                    prefix={<div className={`p-2 rounded-lg bg-${item.color}-50 text-${item.color}-500 mr-2 flex items-center justify-center inline-flex`}>{item.icon}</div>}
                                    valueStyle={{ fontWeight: 800, fontSize: '24px', color: '#1f2937' }}
                                />
                                <div className="mt-2 flex items-center gap-1">
                                    <Tag color={item.trend.startsWith('+') ? 'success' : 'processing'} className="m-0 border-0 rounded-full text-[10px] font-bold">
                                        {item.trend}
                                    </Tag>
                                    <Text type="secondary" className="text-[10px]">vs last month</Text>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>

                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <Space>
                        <Input placeholder="Search learners..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 250 }} onPressEnter={() => fetchLearnerProgress(1)} />
                        <Select value={statusFilter} onChange={(val) => { setStatusFilter(val); }} style={{ width: 150 }}>
                            <Select.Option value="All">All Status</Select.Option>
                            <Select.Option value="Not Started">Not Started</Select.Option>
                            <Select.Option value="In Progress">In Progress</Select.Option>
                            <Select.Option value="Completed">Completed</Select.Option>
                        </Select>
                    </Space>
                    <Space>
                        <Button type="primary" icon={<UserAddOutlined />} onClick={openAssignModal}>Assign Learner</Button>
                        <Button onClick={() => fetchLearnerProgress(pagination.current)} loading={loadingLearners} icon={<CloudSyncOutlined />}>Refresh</Button>
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={learnerProgress}
                    rowKey="employeeId"
                    loading={loadingLearners}
                    pagination={pagination}
                    onChange={handleTableChange}
                    className="shadow-sm border border-gray-100 rounded-xl overflow-hidden"
                />
            </div>
        );
    };

    if (loading) return <MainLayout><div className="h-screen flex items-center justify-center"><Spin size="large" /></div></MainLayout>;
    if (!course) return <MainLayout><Empty description="Course not found" /></MainLayout>;

    return (
        <MainLayout>
            <LmsPageLayout
                header={
                    <LmsSectionHeader
                        title={
                            <div className="flex items-center gap-3">
                                <Button
                                    icon={<ArrowLeftOutlined />}
                                    onClick={() => navigate(-1)}
                                    type="text"
                                    className="mr-2"
                                />
                                {course.title}
                            </div>
                        }
                        action={
                            <Space>
                                <Button
                                    icon={course.status === 'Published' ? <EyeInvisibleOutlined className="text-orange-500" /> : <EyeOutlined className="text-green-500" />}
                                    onClick={handlePublishToggle}
                                >
                                    {course.status === 'Published' ? 'Archive' : 'Publish'}
                                </Button>
                                <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditModalOpen(true)}>Edit Course</Button>
                            </Space>
                        }
                    />
                }
                rightSidebar={
                    <div className="h-full overflow-y-auto">
                        <CourseCurriculumSection
                            lessons={lessons}
                            allMaterials={allMaterials}
                            activeLessonKey={activeLesson}
                            setActiveLessonKey={setActiveLesson}
                            selectedMaterialId={selectedMaterial?._id || selectedMaterial?.id || null}
                            onMaterialClick={handleMaterialClick}
                            isAdmin={true}
                            progressPercentage={0}
                            completedMaterials={[]}
                            isLessonLocked={() => false}
                            isLessonCompleted={() => false}
                            courseTitle={course.title}
                            variant="sidebar"
                        />
                    </div>
                }
            >
                <div className="space-y-8">
                    {/* Media Player / Preview */}
                    {renderMediaPreview()}

                    {/* Tabs Section - Live Session style (Ant Design Tabs in Card) */}
                    <Card className="shadow-sm border-gray-200/60 rounded-xl overflow-hidden" bordered={false} bodyStyle={{ padding: 0 }}>
                        <Tabs
                            activeKey={activeTab}
                            onChange={(key: string) => {
                                setActiveTab(key);
                                if (key === 'analysis') fetchLearnerProgress();
                            }}
                            size="large"
                            className="custom-tabs px-2 pt-2 pb-0 bg-white border-b border-gray-100"
                            tabBarStyle={{ marginBottom: 0, paddingLeft: 16, paddingBottom: 0 }}
                            items={[
                                {
                                    key: 'overview',
                                    label: <span className="flex items-center gap-2 px-2"><BookOutlined />Course Overview</span>,
                                    children: (
                                        <div className="space-y-4 pt-5 px-4 pb-4">
                                            <div>
                                                <Title level={4}>Course Description</Title>
                                                <Paragraph className="text-gray-600 leading-relaxed">{course.description}</Paragraph>
                                            </div>
                                            <Divider />
                                            <div>
                                                <Title level={5} className="mb-4">Course Details</Title>
                                                <Row gutter={[24, 24]}>
                                                    <Col span={8}>
                                                        <Text type="secondary" className="block text-xs uppercase mb-1">Category</Text>
                                                        <Text strong>{course.category}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary" className="block text-xs uppercase mb-1">Status</Text>
                                                        <Tag color={course.status === 'Published' ? 'success' : course.status === 'Archived' ? 'error' : 'warning'}>
                                                            {course.status}
                                                        </Tag>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary" className="block text-xs uppercase mb-1">Created At</Text>
                                                        <Text>{dayjs(course.createdAt).format('MMM D, YYYY')}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary" className="block text-xs uppercase mb-1">Language</Text>
                                                        <Text>{course.language || 'English'}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary" className="block text-xs uppercase mb-1">Duration</Text>
                                                        <Text>{course.completionDuration?.value} {course.completionDuration?.unit}</Text>
                                                    </Col>
                                                    <Col span={8}>
                                                        <Text type="secondary" className="block text-xs uppercase mb-1">Total Materials</Text>
                                                        <Text>{(course.materials?.length || 0) + (course.contents?.length || 0)}</Text>
                                                    </Col>
                                                </Row>
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: 'analysis',
                                    label: <span className="flex items-center gap-2 px-2"><TeamOutlined />Assigned Learners</span>,
                                    children: (
                                        <div className="space-y-4 pt-5 px-4 pb-4">
                                            {renderLearnerAnalytics()}
                                        </div>
                                    )
                                }
                            ]}
                        />
                    </Card>
                </div>
            </LmsPageLayout>

            {/* Assign Learners modal - same Assign Course field as in create course */}
            <Modal
                title="Assign Learners"
                open={assignModalOpen}
                onCancel={() => setAssignModalOpen(false)}
                footer={null}
                width={520}
                destroyOnClose
            >
                <Form
                    form={assignForm}
                    layout="vertical"
                    initialValues={{ assignmentType: 'By Department' }}
                    onFinish={handleAssignSubmit}
                >
                    <Form.Item name="assignmentType" label={<Text strong>Assign Course</Text>}>
                        <Select
                            size="large"
                            placeholder="Select Target Audience"
                            onChange={(val) => {
                                if (val === 'By Department') assignForm.setFieldsValue({ employees: [] });
                                else assignForm.setFieldsValue({ departments: [] });
                            }}
                        >
                            <Option value="By Department">By Department</Option>
                            <Option value="To Individuals">By Individual Employees</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.assignmentType !== curr.assignmentType}>
                        {({ getFieldValue }) => {
                            const type = getFieldValue('assignmentType');
                            if (type === 'By Department') {
                                return (
                                    <Form.Item name="departments" label="Select Departments" rules={[{ required: true, message: 'Select at least one department' }]}>
                                        <Select mode="multiple" size="large" placeholder="Search departments..." loading={fetchingOrg} optionFilterProp="children">
                                            {departments.map(d => <Option key={d._id} value={d._id}>{d.name}</Option>)}
                                        </Select>
                                    </Form.Item>
                                );
                            }
                            if (type === 'To Individuals') {
                                return (
                                    <Form.Item name="employees" label="Select Employees" rules={[{ required: true, message: 'Select at least one employee' }]}>
                                        <Select mode="multiple" size="large" placeholder="Search employees..." loading={fetchingOrg} optionFilterProp="children">
                                            {employees.map(e => <Option key={e._id} value={e._id}>{e.name}</Option>)}
                                        </Select>
                                    </Form.Item>
                                );
                            }
                            return null;
                        }}
                    </Form.Item>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button onClick={() => setAssignModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={assignSubmitting} icon={<UserAddOutlined />}>Assign</Button>
                    </div>
                </Form>
            </Modal>

            <CourseFormWizard
                open={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    fetchCourseDetails();
                    message.success("Course updated successfully");
                }}
                initialData={course}
            />
        </MainLayout>
    );
};

export default CourseDetail;
