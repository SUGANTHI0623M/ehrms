import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, Row, Col, Typography, Progress, Table, Spin, Empty, Tag } from 'antd';
import { TrophyOutlined, BookOutlined, CheckCircleOutlined, RiseOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { lmsService } from '@/services/lmsService';

const { Title, Text } = Typography;
const COLORS = ['#52c41a', '#1890ff', '#fa8c16', '#f5222d'];

const MyScoresPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        summary: {
            totalCourses: number;
            completedCourses: number;
            inProgress: number;
            overallScore: number;
            passedAssessments: number;
            failedAssessments: number;
        };
        courses: any[];
    } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await lmsService.getMyScoresAnalytics();
                if (res?.data) setData(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center min-h-[60vh]">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }

    const summary = data?.summary ?? {
        totalCourses: 0,
        completedCourses: 0,
        inProgress: 0,
        overallScore: 0,
        passedAssessments: 0,
        failedAssessments: 0
    };
    const courses = data?.courses ?? [];

    const scoreDist = [
        { name: 'Completed', value: summary.completedCourses, color: COLORS[0] },
        { name: 'In Progress', value: summary.inProgress, color: COLORS[1] },
        { name: 'Not Started', value: Math.max(0, summary.totalCourses - summary.completedCourses - summary.inProgress), color: '#d9d9d9' }
    ].filter(d => d.value > 0);

    return (
        <MainLayout>
            <div className="lms-page p-6 max-w-5xl mx-auto overflow-x-hidden">
                <Title level={3} className="!mb-1">My Scores & Progress</Title>
                <Text type="secondary" className="block mb-6">Your learning performance and course completion</Text>

                <Row gutter={[16, 16]} className="mb-6">
                    <Col xs={12} md={6}>
                        <Card className="rounded-xl h-full">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Text type="secondary" className="text-xs uppercase tracking-wider">Overall Score</Text>
                                    <div className="text-2xl font-bold text-gray-800">{summary.overallScore}%</div>
                                </div>
                                <TrophyOutlined className="text-3xl text-amber-500" />
                            </div>
                        </Card>
                    </Col>
                    <Col xs={12} md={6}>
                        <Card className="rounded-xl h-full">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Text type="secondary" className="text-xs uppercase tracking-wider">Completed</Text>
                                    <div className="text-2xl font-bold text-gray-800">{summary.completedCourses} / {summary.totalCourses}</div>
                                </div>
                                <CheckCircleOutlined className="text-3xl text-green-500" />
                            </div>
                        </Card>
                    </Col>
                    <Col xs={12} md={6}>
                        <Card className="rounded-xl h-full">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Text type="secondary" className="text-xs uppercase tracking-wider">Assessments</Text>
                                    <div className="text-2xl font-bold text-gray-800">
                                        <span className="text-green-600">{summary.passedAssessments} passed</span>
                                        {summary.failedAssessments > 0 && <span className="text-red-500"> / {summary.failedAssessments} failed</span>}
                                    </div>
                                </div>
                                <RiseOutlined className="text-3xl text-indigo-500" />
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} md={10}>
                        <Card title="Course Status" className="rounded-xl">
                            {scoreDist.length > 0 ? (
                                <div style={{ height: 220 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={scoreDist}
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                                nameKey="name"
                                                label
                                            >
                                                {scoreDist.map((entry: any, i: number) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <Empty description="No courses assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} md={14}>
                        <Card title="Course-wise Progress" className="rounded-xl">
                            <Table
                                dataSource={courses}
                                rowKey="courseId"
                                pagination={false}
                                size="small"
                                columns={[
                                    { title: 'Course', dataIndex: 'title', key: 'title', ellipsis: true },
                                    {
                                        title: 'Progress',
                                        dataIndex: 'progress',
                                        key: 'progress',
                                        width: 120,
                                        render: (v: number, r: any) => (
                                            <Progress
                                                percent={v ?? 0}
                                                size="small"
                                                status={r.status === 'Completed' ? 'success' : 'active'}
                                            />
                                        )
                                    },
                                    {
                                        title: 'Status',
                                        dataIndex: 'status',
                                        key: 'status',
                                        width: 100,
                                        render: (v: string) => (
                                            <Tag color={v === 'Completed' ? 'green' : v === 'In Progress' ? 'blue' : 'default'}>{v}</Tag>
                                        )
                                    },
                                    {
                                        title: 'Score',
                                        dataIndex: 'assessmentScore',
                                        key: 'score',
                                        width: 70,
                                        render: (v: number) => (v != null ? `${v}%` : '—')
                                    },
                                    {
                                        title: 'Time',
                                        dataIndex: 'timeSpentMinutes',
                                        key: 'time',
                                        width: 70,
                                        render: (m: number) => (m != null ? `${Math.round(m / 60 * 10) / 10}h` : '—')
                                    }
                                ]}
                                locale={{ emptyText: <Empty description="No courses" /> }}
                            />
                        </Card>
                    </Col>
                </Row>
            </div>
        </MainLayout>
    );
};

export default MyScoresPage;
