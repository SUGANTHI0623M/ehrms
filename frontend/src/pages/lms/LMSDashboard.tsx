import React, { useState, useEffect } from 'react';
import MainLayout from "@/components/MainLayout";
import { Card, Row, Col, Typography, Spin, List, Avatar, Space, Tag, Empty, Button } from "antd";
import {
    TeamOutlined, ClockCircleOutlined, TrophyOutlined,
    ArrowRightOutlined, UserOutlined, RiseOutlined,
    BookOutlined, FireOutlined, AppstoreOutlined, BarChartOutlined,
    ReadOutlined
} from "@ant-design/icons";
import { lmsService } from "@/services/lmsService";
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const COLORS = ['#4f46e5', '#16a34a', '#ca8a04', '#dc2626', '#9333ea', '#0891b2'];

const LMSDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>({
        kpi: { totalCourses: 0, totalLearners: 0, totalHours: 0, certificates: 0, completionRate: 0, avgScore: 0, activeCourses: 0 },
        recentActivity: [],
        trends: [],
        scoreDist: [],
        categoryDist: []
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await lmsService.getLMSAnalytics();
                if (res.data) {
                    setData({
                        kpi: {
                            totalCourses: res.data.kpi?.totalCourses || 0,
                            totalLearners: res.data.kpi?.totalLearners || 0,
                            totalHours: res.data.kpi?.totalHours || 0,
                            certificates: res.data.kpi?.certificates || 0,
                            completionRate: res.data.kpi?.completionRate || 0,
                            avgScore: res.data.kpi?.avgScore || 0,
                            activeCourses: res.data.kpi?.activeCourses || 0
                        },
                        recentActivity: res.data.recentActivity || [],
                        trends: res.data.trends || [],
                        scoreDist: res.data.scoreDist || [],
                        categoryDist: res.data.categoryDist || []
                    });
                }
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const KPICard = ({ title, value, icon, color, suffix }: any) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:scale-[1.02]">
            <div>
                <Text type="secondary" className="text-xs font-bold uppercase tracking-wider block mb-2">{title}</Text>
                <div className="text-3xl font-black text-gray-800 tracking-tight">
                    {value}
                    {suffix && <span className="text-lg text-gray-400 font-medium ml-1">{suffix}</span>}
                </div>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl`} style={{ backgroundColor: `${color}10`, color: color }}>
                {icon}
            </div>
        </div>
    );

    if (loading) {
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
            <div className="lms-page p-4 md:p-8 bg-gray-50 min-h-[calc(100vh-64px)] overflow-x-hidden">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <Title level={2} style={{ margin: 0 }} className="flex items-center gap-3 !mb-1">
                                LMS Dashboard
                            </Title>
                            <Text type="secondary">Overview of organization learning metrics</Text>
                        </div>
                        <Space>
                            <Tag className="px-3 py-1 bg-white border-gray-200 text-gray-500 rounded-full">Updated: {dayjs().format('HH:mm')}</Tag>
                            <Button
                                type="primary"
                                className="bg-indigo-600 hover:bg-indigo-500 border-none shadow-md"
                                icon={<ArrowRightOutlined />}
                                onClick={() => navigate('/lms/admin/course-library')}
                            >
                                Manage Courses
                            </Button>
                        </Space>
                    </div>

                    {/* KPI Cards */}
                    <Row gutter={[20, 20]}>
                        <Col xs={24} sm={12} lg={6}>
                            <KPICard title="Total Courses" value={data.kpi?.totalCourses || 0} icon={<BookOutlined />} color="#2563eb" />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <KPICard title="Active Learners" value={data.kpi?.totalLearners || 0} icon={<TeamOutlined />} color="#16a34a" />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <KPICard title="Completion Rate" value={data.kpi?.completionRate || 0} suffix="%" icon={<ReadOutlined />} color="#ca8a04" />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <KPICard title="Total Hours" value={data.kpi?.totalHours || 0} icon={<ClockCircleOutlined />} color="#9333ea" />
                        </Col>
                    </Row>

                    <Row gutter={[20, 20]}>
                        {/* Learning Progress Map */}
                        <Col xs={24} lg={16}>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2 font-bold text-gray-800">
                                        <RiseOutlined className="text-indigo-500" /> Learning Trend
                                    </div>
                                    <Tag className="rounded-full border-none bg-gray-50 text-gray-500">Last 30 Days</Tag>
                                </div>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.trends}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                            <ReTooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" />
                                            <Bar dataKey="assigned" name="Enrollments" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar dataKey="completed" name="Completions" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Col>

                        {/* Recent Activity */}
                        <Col xs={24} lg={8}>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2 font-bold text-gray-800">
                                        <ClockCircleOutlined className="text-indigo-500" /> Live Feed
                                    </div>
                                    <Button type="link" size="small" onClick={() => navigate('/lms/analytics/learners')}>View All</Button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {data.recentActivity && data.recentActivity.length > 0 ? (
                                        <List
                                            itemLayout="horizontal"
                                            dataSource={data.recentActivity}
                                            renderItem={(item: any) => (
                                                <List.Item className="border-b-0 px-0 py-3 hover:bg-gray-50 rounded-lg transition-colors px-2">
                                                    <List.Item.Meta
                                                        avatar={
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                                                <UserOutlined />
                                                            </div>
                                                        }
                                                        title={
                                                            <div className="flex justify-between items-baseline">
                                                                <span className="text-xs font-bold text-gray-700">{item.userName}</span>
                                                                <span className="text-[10px] text-gray-400">{dayjs(item.time).fromNow(true)}</span>
                                                            </div>
                                                        }
                                                        description={
                                                            <div className="text-xs text-gray-500 leading-tight mt-0.5">
                                                                {item.action} <span className="text-indigo-600 font-medium">{item.target}</span>
                                                            </div>
                                                        }
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    ) : (
                                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent activity" className="my-auto" />
                                    )}
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row gutter={[20, 20]}>
                        {/* Category Distribution */}
                        <Col xs={24} md={12} lg={8}>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                                <div className="flex items-center gap-2 font-bold text-gray-800 mb-4">
                                    <AppstoreOutlined className="text-indigo-500" /> Content Distribution
                                </div>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.categoryDist.length > 0 ? data.categoryDist : [{ name: 'Empty', value: 1 }]}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {data.categoryDist.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                                ))}
                                                {data.categoryDist.length === 0 && <Cell key="empty" fill="#f0f0f0" strokeWidth={0} />}
                                            </Pie>
                                            <ReTooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Col>

                        {/* Avg Score Display */}
                        <Col xs={24} md={12} lg={8}>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col justify-center text-center">
                                <div className="flex items-center justify-center gap-2 font-bold text-gray-800 mb-2">
                                    <TrophyOutlined className="text-yellow-500" /> Skill Proficiency
                                </div>
                                <div className="py-6">
                                    <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4">Average Score</div>
                                    <div className="text-6xl font-black text-indigo-600">
                                        {data.kpi?.avgScore || 0}
                                        <span className="text-2xl font-normal text-gray-400">%</span>
                                    </div>
                                    <div className="mt-6 flex justify-center gap-2">
                                        <Tag className="rounded-full bg-green-50 text-green-600 border-green-100 px-3">High Performance</Tag>
                                    </div>
                                </div>
                            </div>
                        </Col>

                        {/* Score Distribution */}
                        <Col xs={24} md={24} lg={8}>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                                <div className="flex items-center gap-2 font-bold text-gray-800 mb-4">
                                    <BarChartOutlined className="text-indigo-500" /> Score Breakdown
                                </div>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.scoreDist} layout="vertical">
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} style={{ fontSize: '10px', fill: '#6b7280', fontWeight: 500 }} />
                                            <ReTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                            <Bar dataKey="value" name="Learners" radius={[0, 4, 4, 0]} barSize={20}>
                                                {data.scoreDist.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #f3f4f6;
                    border-radius: 20px;
                }
            `}</style>
        </MainLayout>
    );
};

export default LMSDashboard;
