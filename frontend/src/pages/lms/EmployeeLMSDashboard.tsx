import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import MainLayout from "@/components/MainLayout";
import {
    Card, Row, Col, Typography, Empty, Button, Spin, Input, Select, Tag, Tabs
} from 'antd';
import {
    BookOutlined, BarChartOutlined, SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useGetEmployeeCoursesQuery } from "@/store/api/lmsApi";
import { LearningEngineContent } from './LearningEngineDashboard';
import { LmsCourseCard } from '@/components/lms/SharedComponents';

const { Option } = Select;

const EmployeeLMSDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
    const [activeTab, setActiveTab] = useState('1');

    const { data: courses, isLoading } = useGetEmployeeCoursesQuery();

    const categories = ['Development', 'Business', 'Design', 'Marketing', 'IT & Software', 'Personal Development'];

    // Process Courses Data
    const enrolledCourses = useMemo(() => {
        if (!courses?.data) return [];
        return courses.data.map((item: any) => {
            const course = item.courseId;
            const duration = course?.completionDuration;
            let deadlineDate = null;
            let timeLeft = null;

            if (duration && duration.value && duration.unit && item.status !== 'Completed') {
                const assignedDate = dayjs(item.createdAt);
                deadlineDate = assignedDate.add(duration.value, duration.unit.toLowerCase() as any);
                const now = dayjs();
                const diff = deadlineDate.diff(now);
                if (diff > 0) {
                    const days = deadlineDate.diff(now, 'day');
                    timeLeft = days >= 7 ? `${Math.floor(days / 7)}w ${days % 7}d left` :
                        days > 0 ? `${days}d left` : `${deadlineDate.diff(now, 'hour')}h left`;
                } else timeLeft = 'Overdue';
            }

            return {
                ...course,
                progressId: item._id,
                progress: item.completionPercentage || 0,
                status: item.status,
                lastAccessed: item.lastAccessedAt,
                timeSpent: item.timeSpent || 0,
                deadline: deadlineDate?.format('MMM DD, YYYY'),
                timeLeft: timeLeft
            };
        }).filter((course: any) => {
            const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = !categoryFilter || course.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [courses, searchTerm, categoryFilter]);

    // Calculate Analytics for Employee
    const analytics = useMemo(() => {
        const total = enrolledCourses.length;
        const completed = enrolledCourses.filter((c: any) => c.status === 'Completed').length;
        const totalMin = enrolledCourses.reduce((acc: number, c: any) => acc + (c.timeSpent || 0), 0);

        // Overall progress calculation
        const overallProgress = total > 0 ? Math.round(enrolledCourses.reduce((acc: number, c: any) => acc + (c.progress || 0), 0) / total) : 0;

        return { total, completed, totalMin, overallProgress };
    }, [enrolledCourses]);

    // Render Action Button for Course Card
    const renderActionBtn = (course: any) => (
        <Button
            type="primary"
            size="middle"
            className="min-h-[44px] touch-target font-bold uppercase rounded-lg shadow-sm border-none bg-primary hover:bg-primary/90 px-4 text-xs sm:text-sm"
            onClick={(e) => {
                e.stopPropagation();
                navigate(`/lms/employee/course/${course._id}`);
            }}
            disabled={course.status === 'Completed'}
        >
            {course.status === 'Completed' ? 'Completed' : (course.progress > 0 ? 'Resume' : 'Start')}
        </Button>
    );

    const CoursesTab = () => (
        <div className="space-y-6">
            {/* Filters */}
            <Card className="shadow-sm border-gray-100 rounded-xl" bodyStyle={{ padding: '16px' }} bordered={false}>
                <div className="flex flex-col md:flex-row gap-4">
                    <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="Search your courses..."
                        className="flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        allowClear
                    />
                    <Select
                        placeholder="All Categories"
                        className="w-full md:w-48"
                        onChange={setCategoryFilter}
                        allowClear
                    >
                        {categories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
                    </Select>
                </div>
            </Card>

            {/* Course Grid */}
            {enrolledCourses.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        searchTerm || categoryFilter
                            ? "No matches found in your library."
                            : "No courses assigned yet. Visit the library to enroll!"
                    }
                    className="py-20 bg-white rounded-xl border border-gray-50 shadow-sm"
                >
                    {!searchTerm && !categoryFilter && (
                        <Button type="primary" onClick={() => navigate('/lms')}>Go to Course Library</Button>
                    )}
                </Empty>
            ) : (
                <Row gutter={[20, 20]}>
                    {enrolledCourses.map((course: any) => (
                        <Col xs={24} sm={12} md={8} lg={6} xl={6} key={course.progressId}>
                            <LmsCourseCard
                                course={course}
                                onClick={() => navigate(`/lms/employee/course/${course._id}`)}
                                actionButton={renderActionBtn(course)}
                                showProgress={true}
                                progress={course.progress}
                                status={course.status}
                            />
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );

    const tabItems = [
        {
            key: '1',
            label: <span className="flex items-center gap-2"><BookOutlined />My Courses</span>, // "My Learning" module main view
            children: <CoursesTab />,
        },
        {
            key: '2',
            label: <span className="flex items-center gap-2"><BarChartOutlined />Learning Engine</span>,
            children: <LearningEngineContent />,
        },
    ];

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="lms-page p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-64px)]">
                <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
                    {/* Header Section - stacks on mobile */}
                    <div className="flex flex-col gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 m-0">My Learning Dashboard</h1>
                        <p className="text-sm text-gray-500 m-0">Track your progress, resume courses, and achieve your learning goals.</p>
                    </div>

                    {/* Main Content Tabs - scroll horizontally on small screens if needed */}
                    <Tabs
                        defaultActiveKey="1"
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabItems}
                        size="large"
                        className="w-full lms-dashboard-tabs"
                    />
                </div>
            </div>
        </MainLayout>
    );
};

export default EmployeeLMSDashboard;
