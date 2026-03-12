import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Descriptions, Tabs, Table, Progress, Typography, Avatar, Row, Col, Statistic, Result, Tag, Badge, Modal } from 'antd';
import { LmsLoadingState } from '@/components/lms/SharedComponents';
import { UserOutlined, ArrowLeftOutlined, TrophyOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import { message, Space, Tooltip, Popconfirm, Divider } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { lmsService } from '@/services/lmsService';
import { useGetCourseAssessmentAttemptReportQuery } from '@/store/api/lmsApi';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const LearnerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [learner, setLearner] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [viewLogCourse, setViewLogCourse] = useState<{ courseId: string; title: string } | null>(null);

    const { data: attemptReportData, isLoading: isAttemptLoading, isError: isAttemptError } = useGetCourseAssessmentAttemptReportQuery(
        { courseId: viewLogCourse?.courseId ?? '', employeeId: id ?? '' },
        { skip: !viewLogCourse?.courseId || !id }
    );

    const isCourseCompletedWithAssessment = (c: any) => {
        const passed = c.assessmentStatus === 'Passed' || (typeof c.score === 'number' && c.score >= 80);
        return c.status === 'Completed' && passed;
    };

    const assignedCourses = useMemo(() => {
        if (!learner?.courses) return [];
        return learner.courses.filter((c: any) => !isCourseCompletedWithAssessment(c));
    }, [learner?.courses]);

    const completedCourses = useMemo(() => {
        if (!learner?.courses) return [];
        return learner.courses.filter((c: any) => isCourseCompletedWithAssessment(c));
    }, [learner?.courses]);

    const fetchDetails = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await lmsService.getLearnerDetails(id);
            setLearner(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [id]);

    // Refetch when tab/window gains focus so course Status column stays in sync
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible' && id) fetchDetails();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, [id]);

    const handleToggleAccess = async (progressId: string, currentStatus: boolean) => {
        try {
            await lmsService.toggleCourseAccess(progressId, !currentStatus);
            message.success(!currentStatus ? 'Course access paused' : 'Course access restored');
            fetchDetails(); // Refresh data
        } catch (error) {
            message.error('Failed to update access status');
        }
    };

    const handleUnenroll = async (progressId: string) => {
        try {
            await lmsService.unenrollLearner(progressId);
            message.success('Learner removed from course');
            fetchDetails(); // Refresh list
        } catch (error) {
            message.error('Failed to remove learner');
        }
    };

    if (loading) return <MainLayout><div className="min-h-screen"><LmsLoadingState minHeight="100vh" /></div></MainLayout>;
    if (!learner) return (
        <MainLayout>
            <Result
                status="404"
                title="Learner Not Found"
                extra={<Button type="primary" onClick={() => navigate('/admin/lms/learners')}>Back to List</Button>}
            />
        </MainLayout>
    );

    return (
        <MainLayout>
            <div className="lms-page p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <Button
                        type="link"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/admin/lms/learners')}
                        className="pl-0 text-gray-600"
                    >
                        Back to Learners
                    </Button>
                    <Button
                        type="default"
                        icon={<ReloadOutlined spin={loading} />}
                        onClick={() => fetchDetails()}
                        size="large"
                    >
                        Refresh
                    </Button>
                </div>

                <Card className="lms-card mb-6">
                    <Row gutter={24} align="middle">
                        <Col>
                            <Avatar
                                size={80}
                                src={learner.avatar}
                                icon={<UserOutlined />}
                                className="bg-gray-200"
                            />
                        </Col>
                        <Col flex="auto">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Title level={3} className="mt-0 mb-2">{learner.firstName} {learner.lastName}</Title>
                                    <Descriptions column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }} size="small">
                                        <Descriptions.Item label="Email">{learner.email}</Descriptions.Item>
                                        <Descriptions.Item label="Role">
                                            {typeof learner.role === 'object' ? (learner.role?.name || 'Employee') : (learner.role || 'Employee')}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Department">
                                            {typeof learner.department === 'object' ? (learner.department?.name || '-') : (learner.department || '-')}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Joined">{dayjs(learner.createdAt).format('MMMM YYYY')}</Descriptions.Item>
                                    </Descriptions>
                                </div>
                                {learner.stats?.avgScore >= 90 && (
                                    <Tag icon={<TrophyOutlined />} color="gold">Top Performer</Tag>
                                )}
                            </div>
                        </Col>
                    </Row>
                </Card>

                <Row gutter={[16, 16]} className="mb-6">
                    <Col xs={24} sm={12} md={8} lg={5} xl={5}>
                        <Card bordered size="small">
                            <Statistic
                                title="Avg Assessment Score"
                                value={learner.stats?.avgScore || 0}
                                precision={1}
                                suffix="%"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={5} xl={5}>
                        <Card bordered size="small">
                            <Statistic
                                title="Courses Completed"
                                value={learner.stats?.completedCourses || 0}
                                suffix={`/ ${learner.stats?.assigned || 0}`}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={5} xl={5}>
                        <Card bordered size="small">
                            <Statistic
                                title="Assessments Taken"
                                value={learner.assessments?.length || 0}
                                prefix={<FileTextOutlined className="text-gray-400 mr-2" />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={5} xl={5}>
                        <Card bordered size="small">
                            <Statistic
                                title="Avg AI Quiz Score"
                                value={typeof learner.stats?.avgAiQuizScore === 'number' ? learner.stats.avgAiQuizScore : 0}
                                precision={1}
                                suffix="%"
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={4} xl={4}>
                        <Card bordered size="small">
                            <Statistic
                                title="In Progress"
                                value={learner.stats?.inProgress || 0}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card bordered={true}>
                    <Tabs defaultActiveKey="1">
                        <Tabs.TabPane tab="Assigned Courses" key="1">
                            <Table
                                className="learner-detail-table"
                                dataSource={assignedCourses}
                                rowKey={(record: any) => record.id || record._id || Math.random()}
                                pagination={false}
                                columns={[
                                    {
                                        title: 'Course',
                                        dataIndex: 'title',
                                        key: 'title',
                                        width: 250,
                                        align: 'left',
                                        render: (text, record: any) => (
                                            <div>
                                                <Text strong className="block mb-1">{text}</Text>
                                                <Tag className="text-[10px] mr-0">{record.category || 'General'}</Tag>
                                            </div>
                                        )
                                    },
                                    {
                                        title: 'Assigned Date',
                                        dataIndex: 'enrolledDate',
                                        key: 'enrolledDate',
                                        width: 120,
                                        align: 'center',
                                        render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-'
                                    },
                                    {
                                        title: 'Time Left',
                                        dataIndex: 'validityDate',
                                        key: 'validityDate',
                                        width: 120,
                                        align: 'center',
                                        render: (date: string, record: any) => {
                                            if (!date) return '-';
                                            const due = dayjs(date);
                                            const now = dayjs();
                                            if (record.status === 'Completed' || record.assessmentStatus === 'Passed') return '—';
                                            const daysLeft = due.diff(now, 'day');
                                            if (daysLeft < 0) return <span className="  ">Overdue</span>;
                                            if (daysLeft === 0) return 'Due today';
                                            const weeks = Math.floor(daysLeft / 7);
                                            const d = daysLeft % 7;
                                            return weeks > 0 ? `${weeks}W${d > 0 ? ` ${d}D` : ''}` : `${daysLeft}D`;
                                        }
                                    },
                                    {
                                        title: 'Progress',
                                        dataIndex: 'progress',
                                        key: 'progress',
                                        width: 260,
                                        align: 'center',
                                        onCell: () => ({ style: { width: 260, maxWidth: 260 } }),
                                        render: (val, record: any) => {
                                            const totalLessons = record.totalLessons ?? 0;
                                            const completedLessons = record.completedLessons ?? 0;
                                            const percent = (val != null && val > 0) ? val : (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                                                    <span style={{ flexShrink: 0, fontSize: 12, whiteSpace: 'nowrap' }}>{completedLessons}/{totalLessons} Lessons</span>
                                                    <div style={{ flex: 1, minWidth: 0, width: 0 }}>
                                                        <Progress percent={percent} showInfo={false} size="small" strokeColor={percent === 100 ? '#52c41a' : '#1890ff'} style={{ width: '100%' }} />
                                                    </div>
                                                    <span style={{ flexShrink: 0, fontSize: 12, whiteSpace: 'nowrap' }}>{percent}%</span>
                                                </div>
                                            );
                                        }
                                    },
                                    {
                                        title: 'Avg AI Quiz Score',
                                        key: 'avgAiQuizScore',
                                        width: 130,
                                        align: 'center',
                                        render: (_: unknown, record: any) => {
                                            const score = record?.avgAiQuizScore;
                                            return <Text strong>{typeof score === 'number' ? `${score.toFixed(1)}%` : '—'}</Text>;
                                        }
                                    },
                                    {
                                        title: 'Status',
                                        dataIndex: 'status',
                                        key: 'status',
                                        align: 'center',
                                        render: (status, record: any) => {
                                            let displayStatus = 'Not Started';
                                            let color = 'default';

                                            const passingScore = 80;
                                            const score = record.score || 0;
                                            const lessonsCount = record.completedLessons || 0;
                                            const totalLessons = record.totalLessons || 0;
                                            // Ensure lessonsCount is valid before comparing
                                            const isLessonsCompleted = (totalLessons > 0) && (lessonsCount === totalLessons);

                                            if (status === 'Completed' && score >= passingScore) {
                                                displayStatus = 'Course Completed';
                                                color = 'success';
                                            } else if (isLessonsCompleted) {
                                                displayStatus = 'Lessons Completed';
                                                color = 'cyan';
                                            } else if (status === 'In Progress') {
                                                displayStatus = 'Ongoing';
                                                color = 'processing';
                                            }

                                            return (
                                                <div className="learner-detail-cell-center">
                                                    <Tag color={color}>{displayStatus}</Tag>
                                                </div>
                                            );
                                        }
                                    },
                                    {
                                        title: 'Access',
                                        key: 'access',
                                        align: 'center',
                                        render: (_, record: any) => (
                                            <div className="learner-detail-cell-center">
                                                {record.isAccessBlocked ?
                                                    <Badge status="error" text="Paused" /> :
                                                    <Badge status="success" text="Active" />
                                                }
                                            </div>
                                        )
                                    },
                                    {
                                        title: 'Action',
                                        key: 'action',
                                        align: 'center',
                                        render: (_, record: any) => (
                                            <div className="learner-detail-cell-center">
                                                <Space split={<Divider type="vertical" />}>
                                                    <Tooltip title={record.isAccessBlocked ? "Resume Course" : "Pause Course"}>
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            danger={!record.isAccessBlocked}
                                                            icon={record.isAccessBlocked ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                                                            onClick={() => handleToggleAccess(record.progressId, record.isAccessBlocked)}
                                                        >
                                                            {record.isAccessBlocked ? 'Resume' : 'Pause'}
                                                        </Button>
                                                    </Tooltip>

                                                    <Popconfirm
                                                        title="Remove learner from course?"
                                                        description="This will delete their progress permanently. Are you sure?"
                                                        onConfirm={() => handleUnenroll(record.progressId)}
                                                        okText="Yes"
                                                        cancelText="No"
                                                    >
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </Popconfirm>
                                                </Space>
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="Completed Courses" key="2">
                            <Table
                                className="learner-detail-table"
                                dataSource={completedCourses}
                                rowKey={(record: any) => record.id || record._id || Math.random()}
                                pagination={false}
                                columns={[
                                    {
                                        title: 'Course',
                                        dataIndex: 'title',
                                        key: 'title',
                                        width: 250,
                                        align: 'left',
                                        render: (text: string, record: any) => (
                                            <div>
                                                <Text strong className="block mb-1">{text}</Text>
                                                <Tag className="text-[10px] mr-0">{record.category || 'General'}</Tag>
                                            </div>
                                        )
                                    },
                                    {
                                        title: 'Assigned Date',
                                        dataIndex: 'enrolledDate',
                                        key: 'enrolledDate',
                                        width: 120,
                                        align: 'center',
                                        render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '—'
                                    },
                                    {
                                        title: 'Final Score',
                                        dataIndex: 'score',
                                        key: 'score',
                                        width: 100,
                                        align: 'center',
                                        render: (score: number) => (
                                            <Text strong>{typeof score === 'number' ? `${score}%` : '—'}</Text>
                                        )
                                    },
                                    {
                                        title: 'Avg AI Quiz Score',
                                        key: 'avgAiQuizScore',
                                        width: 130,
                                        align: 'center',
                                        render: (_: unknown, record: any) => {
                                            const s = record?.avgAiQuizScore;
                                            return <Text strong>{typeof s === 'number' ? `${s.toFixed(1)}%` : '—'}</Text>;
                                        }
                                    },
                                    {
                                        title: 'Status',
                                        key: 'status',
                                        align: 'center',
                                        render: () => (
                                            <Tag color="success">Course Completed</Tag>
                                        )
                                    },
                                    {
                                        title: 'Access',
                                        key: 'access',
                                        align: 'center',
                                        render: () => (
                                            <div className="learner-detail-cell-center">
                                                <Badge status="success" text="Full access" />
                                            </div>
                                        )
                                    },
                                    {
                                        title: 'Action',
                                        key: 'action',
                                        align: 'center',
                                        render: (_: unknown, record: any) => (
                                            <div className="learner-detail-cell-center">
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    icon={<FileTextOutlined />}
                                                    onClick={() => setViewLogCourse({
                                                        courseId: (record.id || record._id)?.toString?.() ?? '',
                                                        title: record.title || 'Course'
                                                    })}
                                                >
                                                    View Log
                                                </Button>
                                            </div>
                                        )
                                    }
                                ]}
                            />
                        </Tabs.TabPane>
                    </Tabs>
                </Card>

                {/* Full Assessment Log modal (same detail as standardized assessment tab view log) */}
                <Modal
                    wrapClassName="lms-modal"
                    title={
                        <span className="flex items-center gap-2">
                            <FileTextOutlined />
                            Assessment Log
                            {viewLogCourse && <span className="font-normal text-gray-500 text-sm">— {viewLogCourse.title}</span>}
                        </span>
                    }
                    open={!!viewLogCourse}
                    onCancel={() => setViewLogCourse(null)}
                    footer={<div className="flex justify-end"><Button type="primary" onClick={() => setViewLogCourse(null)}>Close</Button></div>}
                    width={720}
                    centered
                    destroyOnHidden
                >
                    {viewLogCourse && (
                        <div className="pt-2">
                            {isAttemptLoading && <div className="py-8 text-center text-gray-500">Loading attempt report...</div>}
                            {!isAttemptLoading && (isAttemptError || !attemptReportData?.data) && (
                                <div className="py-6 text-center">
                                    <Text type="secondary">No attempt data available for this course.</Text>
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
                                                {attempt.employeeId?.name ?? [learner?.firstName, learner?.lastName].filter(Boolean).join(' ') ?? '—'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Assessment">
                                                {attempt.courseId?.title ?? viewLogCourse.title ?? '—'}
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
                                                            {r.isCorrect ? <Tag color="success" className="ml-2">Correct</Tag> : <Tag color="error" className="ml-2">Incorrect</Tag>}
                                                        </div>
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

export default LearnerDetail;
