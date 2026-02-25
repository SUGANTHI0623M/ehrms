import React, { useMemo, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import MainLayout from "@/components/MainLayout";
import {
    Card, Row, Col, Typography, Empty, Button, Input, Select, Tag, Tabs
} from 'antd';
import {
    BookOutlined, BarChartOutlined, SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useGetEmployeeCoursesQuery } from "@/store/api/lmsApi";
import { LearningEngineContent } from './LearningEngineDashboard';
import { LmsCourseCard, LmsLoadingState } from '@/components/lms/SharedComponents';
import { lmsService } from '@/services/lmsService';

const { Option } = Select;

const EmployeeLMSDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
    const [activeTab, setActiveTab] = useState('1');

    useEffect(() => {
        lmsService.getMyLmsAccess().then((res) => {
            if (res?.data?.lmsAccessEnabled === false) navigate('/employee/dashboard');
        }).catch(() => {});
    }, [navigate]);

    const { data: courses, isLoading } = useGetEmployeeCoursesQuery();

    // Only show categories that exist in the learner's assigned courses
    const categories = useMemo(() => {
        if (!courses?.data?.length) return [];
        const set = new Set<string>();
        courses.data.forEach((item: any) => {
            const cat = item.courseId?.category;
            if (cat != null && String(cat).trim()) set.add(String(cat).trim());
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [courses?.data]);

    useEffect(() => {
        if (categoryFilter && categories.length > 0 && !categories.includes(categoryFilter)) {
            setCategoryFilter(undefined);
        }
    }, [categories, categoryFilter]);

    // Process Courses Data
    const enrolledCourses = useMemo(() => {
        if (!courses?.data) return [];
        return courses.data.map((item: any) => {
            const course = item.courseId;
            const duration = course?.completionDuration;
            let deadlineDate = null;
            let timeLeft = null;
            if (item.dueDate) {
                deadlineDate = dayjs(item.dueDate);
            } else if (duration && duration.value && duration.unit && item.createdAt) {
                const assignedDate = dayjs(item.createdAt);
                deadlineDate = assignedDate.add(duration.value, duration.unit.toLowerCase() as any);
            }
            if (deadlineDate && item.status !== 'Completed' && item.assessmentStatus !== 'Passed') {
                const now = dayjs();
                const diff = deadlineDate.diff(now);
                if (diff > 0) {
                    const days = deadlineDate.diff(now, 'day');
                    const weeks = Math.floor(days / 7);
                    const d = days % 7;
                    timeLeft = weeks > 0 ? `${weeks}W${d > 0 ? ` ${d}D` : ''}` : `${days}D`;
                } else timeLeft = 'Overdue';
            }
            return {
                ...course,
                progressId: item._id,
                progress: item.completionPercentage || 0,
                status: item.status,
                assessmentStatus: item.assessmentStatus,
                assessmentScore: item.assessmentScore,
                lastAccessed: item.lastAccessedAt,
                timeSpent: item.timeSpent || 0,
                timeLeft: timeLeft,
                lessonCount: item.lessonCount ?? (Array.isArray(course?.lessons) ? course.lessons.length : 0)
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

    const myCoursesTabContent = (
        <div className="space-y-6">
            {/* Filters */}
            <Card className="lms-card" bodyStyle={{ padding: '16px' }}>
                <div className="flex flex-col md:flex-row gap-4">
                    <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="Search your courses..."
                        className="flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        allowClear
                    />
                    {categories.length > 0 && (
                        <Select
                            placeholder="All Categories"
                            className="w-full md:w-48"
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                            allowClear
                        >
                            {categories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
                        </Select>
                    )}
                </div>
            </Card>

            {/* Course Grid */}
            {enrolledCourses.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        searchTerm || categoryFilter
                            ? "No matches found in your library."
                            : "No courses assigned yet. Contact your administrator to get assigned to courses."
                    }
                    className="lms-card py-20"
                />
            ) : (
                <Row gutter={[20, 20]}>
                    {enrolledCourses.map((course: any) => (
                        <Col xs={24} sm={12} md={8} lg={6} xl={6} key={course.progressId}>
                            <LmsCourseCard
                                course={course}
                                onClick={() => navigate(`/lms/employee/course/${course._id}`)}
                                showProgress={true}
                                progress={course.progress}
                                status={course.status}
                                assessmentStatus={course.assessmentStatus}
                                assessmentScore={course.assessmentScore}
                                timeLeft={course.timeLeft}
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
            children: myCoursesTabContent,
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
                <div className="min-h-[calc(100vh-64px)]">
                    <LmsLoadingState minHeight="calc(100vh - 64px)" />
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
