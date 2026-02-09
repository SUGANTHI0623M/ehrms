import React, { useMemo } from 'react';
import {
    Card, Row, Col, Statistic, Progress, Timeline,
    List, Typography, Spin, Empty, Tag, Button, Tooltip
} from 'antd';
import {
    FireOutlined, CheckCircleOutlined, ClockCircleOutlined,
    PlayCircleOutlined, RiseOutlined, CalendarOutlined,
    BookOutlined, RightOutlined
} from '@ant-design/icons';
import { useGetEmployeeCoursesQuery } from '@/store/api/lmsApi';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    Tooltip as ReTooltip
} from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import MainLayout from '@/components/MainLayout';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

// Color constants
const COLORS = {
    primary: '#10b981',
    success: '#52C41A',
    warning: '#FAAD14',
    error: '#F5222D',
    gray: '#D9D9D9',
    purple: '#9333ea',
    cyan: '#0891b2',
    orange: '#FF7A45',
};

// Hook for Progress Insights data
export const useProgressInsightsData = () => {
    const { data: coursesData, isLoading } = useGetEmployeeCoursesQuery();

    const enrolledCourses = useMemo(() => {
        if (!coursesData?.data) return [];
        return coursesData.data.map((item: any) => ({
            ...item.courseId,
            progress: item.completionPercentage || 0,
            status: item.status,
            lastAccessed: item.lastAccessedAt,
            timeSpent: item.timeSpent || 0,
            enrolledDate: item.createdAt
        }));
    }, [coursesData]);

    // 1. Calculate Stats
    const stats = useMemo(() => {
        // Streak Calculation
        const dates = enrolledCourses
            .filter((c: any) => c.lastAccessed)
            .map((c: any) => dayjs(c.lastAccessed).startOf('day'))
            .sort((a: any, b: any) => b.valueOf() - a.valueOf());

        let streak = 0;
        let checkDate = dayjs().startOf('day');

        // Remove duplicates
        const uniqueDates = dates.filter((date: any, i: number, self: any[]) =>
            i === 0 || !date.isSame(self[i - 1], 'day')
        );

        for (const date of uniqueDates) {
            if (date.isSame(checkDate, 'day') || date.isSame(checkDate.subtract(1, 'day'), 'day')) {
                streak++;
                checkDate = date;
            } else {
                // If the most recent activity wasn't today or yesterday, streak is broken/0
                // UNLESS we are just starting the loop and the first date is NOT today/yesterday.
                // But the loop logic handles checking against checkDate. 
                // However, checkDate update logic above: checkDate = date. 
                // Correct logic:
                // If date is same as checkDate (today), extend checkDate to yesterday.
                // If date is yesterday relative to OLD checkDate (today), increment.
            }
        }

        // Simplified streak logic based on user snippet
        let currentStreak = 0;
        let currentDateToCheck = dayjs().startOf('day');

        // Filter unique date strings
        const activityDates = new Set(enrolledCourses
            .filter((c: any) => c.lastAccessed)
            .map((c: any) => dayjs(c.lastAccessed).format('YYYY-MM-DD'))
        );

        // Check today
        if (activityDates.has(currentDateToCheck.format('YYYY-MM-DD'))) {
            currentStreak++;
            currentDateToCheck = currentDateToCheck.subtract(1, 'day');
        } else {
            // Check yesterday if not today (to allow maintaining streak if user learns later today)
            if (activityDates.has(currentDateToCheck.subtract(1, 'day').format('YYYY-MM-DD'))) {
                currentStreak++;
                currentDateToCheck = currentDateToCheck.subtract(2, 'day');
            } else {
                // No activity today or yesterday -> streak broken
                currentStreak = 0;
            }
        }

        if (currentStreak > 0) {
            // Continue checking backwards
            while (activityDates.has(currentDateToCheck.format('YYYY-MM-DD'))) {
                currentStreak++;
                currentDateToCheck = currentDateToCheck.subtract(1, 'day');
            }
        }

        const totalMinutes = enrolledCourses.reduce((sum: number, c: any) => sum + (c.timeSpent || 0), 0);

        return {
            streak: currentStreak,
            completed: enrolledCourses.filter((c: any) => c.status === 'Completed').length,
            total: enrolledCourses.length,
            inProgress: enrolledCourses.filter((c: any) => c.status === 'In Progress').length,
            hours: Math.floor(totalMinutes / 60),
            minutes: totalMinutes % 60
        };
    }, [enrolledCourses]);

    // 2. Activity Calendar
    const activityCalendar = useMemo(() => {
        const today = dayjs();
        const daysInMonth = today.daysInMonth();
        const activity = Array(daysInMonth).fill(0);

        enrolledCourses.forEach((course: any) => {
            if (course.lastAccessed) {
                const date = dayjs(course.lastAccessed);
                if (date.month() === today.month() && date.year() === today.year()) {
                    activity[date.date() - 1]++;
                }
            }
        });

        return activity;
    }, [enrolledCourses]);

    // 3. Progress Data
    const progressData = useMemo(() => [
        { name: 'Completed', value: stats.completed, color: COLORS.success },
        { name: 'In Progress', value: stats.inProgress, color: COLORS.primary },
        { name: 'Not Started', value: stats.total - stats.completed - stats.inProgress, color: COLORS.gray }
    ], [stats]);

    // 4. Category Data
    const categoryData = useMemo(() => {
        const categories: Record<string, number> = {};
        enrolledCourses.forEach((course: any) => {
            const cat = course.category || 'General';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [enrolledCourses]);

    // 5. Upcoming Deadlines
    const upcomingDeadlines = useMemo(() => {
        return enrolledCourses
            .filter((c: any) => c.status !== 'Completed' && c.completionDuration)
            .map((c: any) => {
                const enrolledDate = dayjs(c.enrolledDate);
                const { value, unit } = c.completionDuration;
                const deadline = enrolledDate.add(value, unit.toLowerCase());
                const daysLeft = deadline.diff(dayjs(), 'day');

                return {
                    ...c,
                    deadline,
                    daysLeft,
                    urgency: daysLeft < 3 ? 'high' : daysLeft < 7 ? 'medium' : 'low'
                };
            })
            .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
            .slice(0, 5);
    }, [enrolledCourses]);

    // 6. Recent Activity
    const recentActivity = useMemo(() => {
        return enrolledCourses
            .filter((c: any) => c.lastAccessed)
            .sort((a: any, b: any) => dayjs(b.lastAccessed).valueOf() - dayjs(a.lastAccessed).valueOf())
            .slice(0, 5)
            .map((c: any) => ({
                id: c._id,
                title: c.status === 'Completed' ? `Completed "${c.title}"` : `Resumed "${c.title}"`,
                time: dayjs(c.lastAccessed).fromNow(),
                type: c.status === 'Completed' ? 'completed' : 'started'
            }));
    }, [enrolledCourses]);

    return {
        enrolledCourses,
        stats,
        activityCalendar,
        progressData,
        categoryData,
        upcomingDeadlines,
        recentActivity,
        isLoading
    };
};

// Reusable content component
export const ProgressInsightsContent: React.FC<any> = ({
    stats,
    activityCalendar,
    progressData,
    categoryData,
    upcomingDeadlines,
    recentActivity
}) => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <Row gutter={[20, 20]}>
                {/* 1. Solved / Progress Card (LeetCode Style) */}
                <Col xs={24} lg={10}>
                    <Card
                        title={<span className="text-gray-500 font-medium">Course Progress</span>}
                        className="h-full shadow-sm border-gray-200 rounded-xl"
                        headStyle={{ borderBottom: 'none', paddingBottom: 0 }}
                        bodyStyle={{ paddingTop: 10 }}
                    >
                        <div className="flex flex-col sm:flex-row items-center gap-8">
                            {/* Circular Chart */}
                            <div className="relative w-40 h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={progressData}
                                            innerRadius={60}
                                            outerRadius={75}
                                            startAngle={90}
                                            endAngle={-270}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {progressData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-4xl font-bold text-gray-800">{stats.completed}</span>
                                    <span className="text-xs text-gray-400 uppercase tracking-wider">Completed</span>
                                </div>
                            </div>

                            {/* Stats Breakdown */}
                            <div className="flex-1 w-full space-y-3">
                                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg group hover:bg-green-100 transition-colors cursor-default">
                                    <div className="flex items-center gap-2">
                                        <Text className="text-green-600 font-medium text-xs uppercase w-20">Completed</Text>
                                        <span className="text-gray-400 text-xs">__</span>
                                    </div>
                                    <Text strong className="text-gray-700">{stats.completed}</Text>
                                </div>

                                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg group hover:bg-emerald-100 transition-colors cursor-default">
                                    <div className="flex items-center gap-2">
                                        <Text className="text-emerald-500 font-medium text-xs uppercase w-20">In Progress</Text>
                                        <span className="text-gray-400 text-xs">__</span>
                                    </div>
                                    <Text strong className="text-gray-700">{stats.inProgress}</Text>
                                </div>

                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors cursor-default">
                                    <div className="flex items-center gap-2">
                                        <Text className="text-gray-400 font-medium text-xs uppercase w-20">Not Started</Text>
                                        <span className="text-gray-400 text-xs">__</span>
                                    </div>
                                    <Text strong className="text-gray-700">
                                        {stats.total - stats.completed - stats.inProgress}
                                    </Text>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between text-center">
                            <div>
                                <Text type="secondary" className="text-xs block mb-1">Total Time</Text>
                                <Text strong className="text-lg">{stats.hours}h {stats.minutes}m</Text>
                            </div>
                            <div>
                                <Text type="secondary" className="text-xs block mb-1">Total Courses</Text>
                                <Text strong className="text-lg">{stats.total}</Text>
                            </div>
                            <div>
                                <Text type="secondary" className="text-xs block mb-1">Efficiency</Text>
                                <Text strong className="text-lg">
                                    {stats.total > 0 ? Math.round((stats.completed / (stats.completed + stats.inProgress || 1)) * 100) : 0}%
                                </Text>
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* 2. Calendar & Streak (LeetCode Daily Style) */}
                <Col xs={24} lg={14}>
                    <Card
                        className="h-full shadow-sm border-gray-200 rounded-xl"
                        bodyStyle={{ padding: 24, paddingBottom: 12 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <CalendarOutlined className="text-gray-600 text-lg" />
                                </div>
                                <div>
                                    <Text strong className="block text-lg">{dayjs().format('MMMM YYYY')}</Text>
                                    <Text type="secondary" className="text-xs">Learning Consistency</Text>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                                <FireOutlined className="text-orange-500" />
                                <Text strong className="text-orange-600">{stats.streak} Day Streak</Text>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2 mb-4">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                <div key={i} className="text-center text-xs text-gray-400 font-medium mb-1">
                                    {d}
                                </div>
                            ))}
                            {/* Empty cells for start of month offset - simplified for now (starts at idx 0) 
                                ideally would align with actual day of week, but user asked for simple grid 
                            */}
                            {Array.from({ length: dayjs().startOf('month').day() }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}

                            {activityCalendar.map((count: number, dayIndex: number) => {
                                const day = dayIndex + 1;
                                const isToday = day === dayjs().date();
                                const hasActivity = count > 0;

                                return (
                                    <Tooltip key={day} title={hasActivity ? `${count} activities` : isToday ? 'Today' : ''}>
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-200 relative
                                                    ${isToday ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
                                                    ${hasActivity
                                                        ? 'bg-green-500 text-white shadow-md shadow-green-200 cursor-pointer hover:bg-green-600'
                                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                    }
                                                `}
                                            >
                                                {hasActivity ? (
                                                    <CheckCircleOutlined className="text-sm" />
                                                ) : (
                                                    day
                                                )}
                                            </div>
                                        </div>
                                    </Tooltip>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-end gap-4 mt-6 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-gray-50"></div>
                                <span>No Activity</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-green-500"></div>
                                <span>Completed Lesson</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded bg-white ring-2 ring-emerald-500"></div>
                                <span>Current Day</span>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[20, 20]}>
                {/* 3. Recent Submissions / Activity */}
                <Col xs={24} lg={12}>
                    <Card
                        title={<span className="text-gray-500 font-medium">Recent Activity</span>}
                        className="h-full shadow-sm border-gray-200 rounded-xl"
                        bodyStyle={{ padding: 0 }}
                    >
                        {recentActivity.length === 0 ? (
                            <Empty description="No recent activity" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-8" />
                        ) : (
                            <List
                                dataSource={recentActivity}
                                renderItem={(item: any, index: number) => (
                                    <List.Item
                                        className={`px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer`}
                                        onClick={() => navigate(`/lms/employee/course/${item.id}`)}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <div className="min-w-[40px] text-gray-400 text-lg">
                                                    {item.type === 'completed' ? (
                                                        <CheckCircleOutlined className="text-green-500" />
                                                    ) : (
                                                        <PlayCircleOutlined className="text-emerald-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <Text strong className="block text-gray-700">{item.title.replace(/Completed "|Resumed "|"/g, '')}</Text>
                                                    <Text type="secondary" className="text-xs">
                                                        {item.type === 'completed' ? 'Course Completed' : 'Resumed Learning'}
                                                    </Text>
                                                </div>
                                            </div>
                                            <Text type="secondary" className="text-xs whitespace-nowrap ml-4">{item.time}</Text>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        )}
                        {recentActivity.length > 0 && (
                            <div className="p-3 border-t border-gray-100 text-center">
                                <Button type="link" size="small" className="text-gray-500 hover:text-gray-800">View All Activity <RightOutlined /></Button>
                            </div>
                        )}
                    </Card>
                </Col>

                {/* 4. Study Plan / Deadlines */}
                <Col xs={24} lg={12}>
                    <Card
                        title={<span className="text-gray-500 font-medium">Upcoming Deadlines</span>}
                        className="h-full shadow-sm border-gray-200 rounded-xl"
                        bodyStyle={{ padding: 0 }}
                        extra={<Tag color="green">{upcomingDeadlines.length} Due</Tag>}
                    >
                        {upcomingDeadlines.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <CheckCircleOutlined className="text-4xl text-green-200 mb-3" />
                                <Text type="secondary">All caught up! No pending deadlines.</Text>
                            </div>
                        ) : (
                            <List
                                dataSource={upcomingDeadlines}
                                renderItem={(item: any) => (
                                    <List.Item
                                        className="px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer group"
                                        onClick={() => navigate(`/lms/employee/course/${item._id}`)}
                                    >
                                        <div className="w-full">
                                            <div className="flex justify-between items-center mb-1">
                                                <Text strong className="text-gray-700 group-hover:text-emerald-600 transition-colors">{item.title}</Text>
                                                {item.daysLeft < 3 && <Tag color="error">Urgent</Tag>}
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                                <span>Due {item.deadline.format('MMM DD')}</span>
                                                <span>{item.daysLeft} days left</span>
                                            </div>
                                            <Progress
                                                percent={item.progress}
                                                showInfo={false}
                                                size="small"
                                                strokeColor={item.daysLeft < 3 ? '#ff4d4f' : '#10b981'}
                                                trailColor="#f0f0f0"
                                            />
                                        </div>
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* 5. Topic Tags (Category Breakdown) */}
            <Card
                className="shadow-sm border-gray-200 rounded-xl"
                bodyStyle={{ padding: '16px 24px' }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <BookOutlined className="text-gray-400" />
                    <span className="text-gray-500 font-medium">Learning Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categoryData.length === 0 && <Text type="secondary" className="text-xs">No topics found</Text>}
                    {categoryData.map((cat: any, i: number) => (
                        <div key={i} className="flex items-center bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors cursor-default border border-gray-100">
                            <span className="text-xs text-gray-600 font-medium mr-2">{cat.name}</span>
                            <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 rounded-full">{cat.value}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

// Standalone page component for backward compatibility or routing
const ProgressInsightsPage: React.FC = () => {
    const data = useProgressInsightsData();

    if (data.isLoading) {
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
            <div className="lms-page p-6 max-w-[1600px] mx-auto overflow-x-hidden">
                <div className="mb-6">
                    <Title level={3} className="!mb-1">Progress Insights</Title>
                    <Text type="secondary">Knowledge Hub &gt; Progress Insights</Text>
                </div>
                <ProgressInsightsContent {...data} />
            </div>
        </MainLayout>
    );
};

export default ProgressInsightsPage;
