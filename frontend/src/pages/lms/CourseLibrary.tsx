import React, { useState, useEffect } from 'react';
import MainLayout from "@/components/MainLayout";
import { LmsCourseCard, LmsPrimaryButton, ArchiveIcon, PublishIcon, LmsLoadingState, LmsCourseCardSkeleton } from '@/components/lms/SharedComponents';
import {
    Input, Select, Card, Row, Col, Typography,
    Button, Empty, Modal, message, Tooltip, Space, Popconfirm
} from 'antd';
import {
    SearchOutlined, PlusOutlined, ExclamationCircleOutlined,
    EditOutlined, DeleteOutlined,
    RocketOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useGetCoursesQuery, useLazyGetCourseByIdQuery, useUpdateCourseMutation, useDeleteCourseMutation, useUpdateCourseStatusMutation } from "@/store/api/lmsApi";
import { useSelector } from 'react-redux';
import { RootState } from "@/store/store";
import { lmsService } from '@/services/lmsService';
import CourseFormWizard from './components/CourseFormWizard';

const { Option } = Select;

const CourseLibrary = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<any>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [loadingCats, setLoadingCats] = useState(false);

    const user = useSelector((state: RootState) => state.auth.user);
    const userRole = user?.role || 'Employee';
    const isAdmin = ['Admin', 'Super Admin'].includes(userRole);

    // Employees must not access full course library; only admins can assign courses. Redirect to My Learning.
    useEffect(() => {
        if (!isAdmin) {
            navigate('/lms/employee/dashboard', { replace: true });
        }
    }, [isAdmin, navigate]);

    const { data: coursesData, isLoading, refetch } = useGetCoursesQuery(
        {
            search: searchTerm,
            category: categoryFilter,
            status: isAdmin ? statusFilter : 'Published',
            limit: 10,
            page: 1
        },
        { skip: !isAdmin }
    );

    const [fetchCourseById] = useLazyGetCourseByIdQuery();
    const [updateStatus] = useUpdateCourseStatusMutation();
    const [deleteCourse] = useDeleteCourseMutation();

    // Fetch categories from same source as course form (meta options); merge with categories on existing courses so filter stays in sync
    React.useEffect(() => {
        const fetchCats = async () => {
            setLoadingCats(true);
            try {
                const [metaRes, listRes] = await Promise.all([
                    lmsService.getMetaOptions('CATEGORY'),
                    lmsService.getCourseCategories()
                ]);
                const fromMeta = (metaRes?.data || []).map((c: { value: string }) => c.value);
                const fromCourses = listRes?.data || [];
                setCategories(Array.from(new Set([...fromMeta, ...fromCourses])).filter(Boolean).sort());
            } catch (error) {
                console.error("Failed to fetch categories", error);
            } finally {
                setLoadingCats(false);
            }
        };
        fetchCats();
    }, []);

    const handlePublishToggle = async (courseId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Published' ? 'Archived' : 'Published';
        try {
            await updateStatus({ id: courseId, status: newStatus }).unwrap();
            message.success(`Course ${newStatus} successfully`);
            refetch();
        } catch (error) {
            message.error('Failed to update course status');
        }
    };

    const handleCreateCourse = () => {
        setEditingCourse(null);
        setIsCreateModalOpen(true);
    };

    const handleEditCourse = async (listCourse: any) => {
        const toBool = (v: any) => v === true || v === "true" || !!v;
        const isMandatory = toBool(listCourse?.isMandatory);
        const isLiveAssessment = toBool(listCourse?.isLiveAssessment);
        // Open modal immediately with list course so toggles show correctly (card and modal same source)
        setEditingCourse({ ...listCourse, isMandatory, isLiveAssessment });
        setIsCreateModalOpen(true);
        try {
            const res = await fetchCourseById(listCourse._id).unwrap();
            const raw = res?.data ?? res;
            const courseData = raw?.course ?? raw;
            const resolved = courseData ?? listCourse;
            // Merge full course but keep list toggles so modal never flips toggles after fetch
            setEditingCourse(
                resolved && typeof resolved === "object"
                    ? { ...resolved, isMandatory, isLiveAssessment }
                    : { ...listCourse, isMandatory, isLiveAssessment }
            );
        } catch {
            message.error("Failed to load course details");
            // Keep modal open with list course (toggles already correct)
        }
    };

    const showDeleteConfirm = (course: any) => {
        Modal.confirm({
            title: 'Delete Course?',
            icon: <ExclamationCircleOutlined />,
            content: `This action cannot be undone. Are you sure you want to delete "${course.title}"?`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            centered: true,
            onOk: async () => {
                try {
                    await deleteCourse(course._id).unwrap();
                    message.success('Course deleted successfully');
                    refetch();
                } catch (error) {
                    message.error('Failed to delete course');
                }
            }
        });
    };

    const renderAdminActions = (course: any) => (
        <Space size={4}>
            <Tooltip title="Edit">
                <Button type="text" size="small" icon={<EditOutlined className="text-gray-400 hover:text-emerald-500" />} onClick={(e) => { e.stopPropagation(); handleEditCourse(course); }} />
            </Tooltip>
            {isAdmin && (
                <Popconfirm
                    title={course.status === 'Published' ? 'Archive this course?' : 'Publish this course?'}
                    description={course.status === 'Published' ? 'The course will be moved to Archived and hidden from learners.' : 'The course will be visible to assigned learners.'}
                    onConfirm={() => handlePublishToggle(course._id, course.status)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Tooltip title={course.status === 'Published' ? 'Archive' : 'Publish'}>
                        <Button
                            type="text"
                            size="small"
                            icon={course.status === 'Published' ? <ArchiveIcon className="text-gray-400 hover:text-orange-500" /> : <PublishIcon className="text-gray-400 hover:text-green-500" />}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Tooltip>
                </Popconfirm>
            )}
            {(course.enrollmentCount ?? 0) === 0 && (
                <Tooltip title="Delete (only for courses not assigned to anyone)">
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); showDeleteConfirm(course); }} />
                </Tooltip>
            )}
        </Space>
    );

    const renderEmployeeAction = (course: any) => (
        <Button
            type="primary"
            size="small"
            className="lms-btn-primary h-8 text-xs px-3 bg-primary border-primary hover:bg-primary/90"
            icon={<RocketOutlined />}
            onClick={(e) => { e.stopPropagation(); navigate(`/lms/employee/course/${course._id}`); }}
        >
            Start
        </Button>
    );

    const courses = coursesData?.data?.courses || [];

    // Employees are redirected to My Learning; show nothing until redirect
    if (!isAdmin) {
        return (
            <MainLayout>
                <div className="min-h-[calc(100vh-64px)]">
                    <LmsLoadingState minHeight="calc(100vh - 64px)" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="lms-page p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto space-y-6 md:space-y-8 bg-gray-50 min-h-[calc(100vh-64px)]">
                {/* Header: stacks on mobile, Create Course always accessible */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 m-0">Course Library</h1>
                        <p className="text-sm text-gray-500 mt-1 m-0">
                            {isAdmin ? 'Manage, edit, and publish your organization\'s courses' : 'Explore and enroll in available courses'}
                        </p>
                    </div>
                    {isAdmin && (
                        <LmsPrimaryButton
                            icon={<PlusOutlined />}
                            onClick={handleCreateCourse}
                            className="touch-target min-h-[44px] w-full sm:w-auto shrink-0"
                        >
                            Create Course
                        </LmsPrimaryButton>
                    )}
                </div>

                {/* Filters: stack vertically on mobile */}
                <Card className="lms-card" bodyStyle={{ padding: '16px 20px' }}>
                    <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row">
                        <Input
                            prefix={<SearchOutlined className="text-gray-400" />}
                            placeholder="Search courses..."
                            className="flex-1"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            allowClear
                        />
                        <Select
                            placeholder="Category"
                            className="w-full md:w-48"
                            onChange={setCategoryFilter}
                            allowClear
                        >
                            {categories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
                        </Select>
                        {isAdmin && (
                            <Select
                                placeholder="Status"
                                className="w-full md:w-40"
                                onChange={(val) => setStatusFilter(val === 'All' ? undefined : val)}
                                allowClear
                                defaultValue={undefined}
                            >
                                <Option value="All">All Status</Option>
                                <Option value="Published">Published</Option>
                                <Option value="Archived">Archived</Option>
                                <Option value="Draft">Draft</Option>
                            </Select>
                        )}
                    </div>
                </Card>

                {/* Content */}
                {isLoading ? (
                    <Row gutter={[16, 16]}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <Col xs={24} sm={12} md={12} lg={8} xl={6} key={i}>
                                <LmsCourseCardSkeleton />
                            </Col>
                        ))}
                    </Row>
                ) : !courses.length ? (
                    <Card className="lms-card lms-empty-state">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No courses found"
                        />
                    </Card>
                ) : (
                    <Row gutter={[16, 16]}>
                        {courses.map((course: any) => (
                            <Col xs={24} sm={12} md={12} lg={8} xl={6} key={course._id}>
                                <LmsCourseCard
                                    course={course}
                                    onClick={() => navigate(isAdmin ? `/lms/admin/course/${course._id}` : `/lms/employee/course/${course._id}`)}
                                    actionButton={isAdmin ? renderAdminActions(course) : renderEmployeeAction(course)}
                                    status={course.status} // pass status for color logic inside card if needed
                                />
                            </Col>
                        ))}
                    </Row>
                )}
            </div>

            <CourseFormWizard
                open={isCreateModalOpen}
                initialData={editingCourse}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingCourse(null);
                }}
                onSuccess={() => {
                    refetch();
                    setIsCreateModalOpen(false);
                    setEditingCourse(null);
                }}
            />
        </MainLayout>
    );
};

export default CourseLibrary;
