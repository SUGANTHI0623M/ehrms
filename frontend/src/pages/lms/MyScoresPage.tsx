import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, Row, Col, Typography, Progress, Table, Empty, Tag, Modal, Button, Descriptions, Divider } from 'antd';
import { LmsLoadingState } from '@/components/lms/SharedComponents';
import { TrophyOutlined, BookOutlined, CheckCircleOutlined, RiseOutlined, FileTextOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { lmsService } from '@/services/lmsService';
import { useGetMyCourseAssessmentAttemptReportQuery } from '@/store/api/lmsApi';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const COLORS = ['#52c41a', '#1890ff', '#fa8c16', '#f5222d'];

const MyScoresPage: React.FC = () => {
    const [assessmentLogCourse, setAssessmentLogCourse] = useState<{ courseId: string; title: string } | null>(null);
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
                <div className="lms-page min-h-[60vh]">
                    <LmsLoadingState minHeight="60vh" />
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

    const { data: attemptReportData, isLoading: isAttemptLoading, isError: isAttemptError } = useGetMyCourseAssessmentAttemptReportQuery(
        { courseId: assessmentLogCourse?.courseId ?? '' },
        { skip: !assessmentLogCourse?.courseId }
    );

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
                        <Card className="lms-card h-full">
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
                        <Card className="lms-card h-full">
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
                        <Card className="lms-card h-full">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Text type="secondary" className="text-xs uppercase tracking-wider">Assessments</Text>
                                    <div className="text-2xl font-bold text-gray-800">
                                        <span className=" ">{summary.passedAssessments} passed</span>
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
                        <Card title="Course Status" className="lms-card">
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
                        <Card title="Course-wise Progress" className="lms-card">
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
                                    },
                                    {
                                        title: 'Action',
                                        key: 'action',
                                        width: 140,
                                        render: (_: unknown, r: any) =>
                                            (r.assessmentScore != null || r.assessmentStatus === 'Passed' || r.assessmentStatus === 'Failed') ? (
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    icon={<FileTextOutlined />}
                                                    onClick={() => setAssessmentLogCourse({ courseId: typeof r.courseId === 'string' ? r.courseId : (r.courseId?._id ?? r.courseId)?.toString?.() ?? '', title: r.title })}
                                                >
                                                    Assessment Log
                                                </Button>
                                            ) : '—'
                                    }
                                ]}
                                locale={{ emptyText: <Empty description="No courses" /> }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Assessment Log modal (learner view) */}
                <Modal
                    title={
                        <span className="flex items-center gap-2">
                            <FileTextOutlined />
                            Assessment Log
                            {assessmentLogCourse && (
                                <span className="font-normal text-gray-500 text-sm">— {assessmentLogCourse.title}</span>
                            )}
                        </span>
                    }
                    open={!!assessmentLogCourse}
                    onCancel={() => setAssessmentLogCourse(null)}
                    footer={
                        <div className="flex justify-end">
                            <Button type="primary" onClick={() => setAssessmentLogCourse(null)}>Close</Button>
                        </div>
                    }
                    width={720}
                    centered
                    destroyOnHidden
                >
                    {assessmentLogCourse && (
                        <div className="pt-2">
                            {isAttemptLoading && (
                                <div className="py-8 text-center text-gray-500">Loading attempt report...</div>
                            )}
                            {!isAttemptLoading && (isAttemptError || !attemptReportData?.data) && (
                                <div className="py-6 text-center">
                                    <Text type="secondary">
                                        No attempt data available for this course.
                                    </Text>
                                </div>
                            )}
                            {!isAttemptLoading && attemptReportData?.data && (() => {
                                const attempt = attemptReportData.data as any;
                                const snapByQid = (attempt.questionSnapshots || []).reduce((acc: any, s: any) => {
                                    acc[s.questionId] = s;
                                    return acc;
                                }, {});
                                return (
                                    <div className="space-y-4">
                                        <Descriptions size="small" column={1} bordered>
                                            <Descriptions.Item label="Employee">
                                                {attempt.employeeId?.name ?? '—'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Assessment">
                                                {attempt.courseId?.title ?? assessmentLogCourse.title ?? '—'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Attempted date">
                                                {attempt.submittedAt ? dayjs(attempt.submittedAt).format('MMM D, YYYY h:mm A') : '—'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Duration">
                                                {attempt.durationMinutes != null ? `${attempt.durationMinutes} min` : '—'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Total score">
                                                <Tag color={attempt.scorePercentage >= 80 ? 'green' : attempt.scorePercentage >= 50 ? 'orange' : 'red'}>
                                                    {attempt.earnedMarks} / {attempt.totalMarks} ({attempt.scorePercentage}%)
                                                </Tag>
                                            </Descriptions.Item>
                                        </Descriptions>
                                        <Divider className="my-3">Questions &amp; answers</Divider>
                                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                                            {(attempt.questionResults || []).map((r: any, idx: number) => {
                                                const snap = snapByQid[r.questionId];
                                                const qText = snap?.questionText || `Question ${idx + 1}`;
                                                const userAns = Array.isArray(r.userAnswer) ? r.userAnswer.join(', ') : (r.userAnswer ?? '—');
                                                const correctAns = Array.isArray(r.correctAnswer) ? r.correctAnswer.join(', ') : (r.correctAnswer ?? '—');
                                                return (
                                                    <div key={r.questionId || idx} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                                                        <div className="font-medium text-gray-800 mb-2">{qText}</div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                                            <div>
                                                                <span className="text-gray-500">Selected: </span>
                                                                <span className={r.isCorrect ? '' : 'text-red-700'}>{userAns || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500">Correct: </span>
                                                                <span className="text-gray-800">{correctAns}</span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 text-xs text-gray-500">
                                                            Score: {r.marksAwarded} / {r.marksTotal}
                                                            {r.isCorrect ? (
                                                                <Tag color="success" className="ml-2">Correct</Tag>
                                                            ) : (
                                                                <Tag color="error" className="ml-2">Incorrect</Tag>
                                                            )}
                                                        </div>
                                                        {r.aiFeedback && (
                                                            <div className="mt-2 text-xs text-gray-600 italic border-l-2 border-primary/30 pl-2">
                                                                AI: {r.aiFeedback}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
};

export default MyScoresPage;
