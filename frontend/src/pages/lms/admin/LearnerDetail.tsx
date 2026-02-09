import React, { useState, useEffect } from 'react';
import { Card, Button, Descriptions, Tabs, Table, Progress, Typography, Avatar, Row, Col, Statistic, Spin, Result, Tag, Badge } from 'antd';
import { UserOutlined, ArrowLeftOutlined, TrophyOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { message, Space, Tooltip, Popconfirm, Divider } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { lmsService } from '@/services/lmsService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const LearnerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [learner, setLearner] = useState<any>(null);
    const [loading, setLoading] = useState(false);

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

    if (loading) return <MainLayout><div className="flex items-center justify-center h-screen"><Spin size="large" /></div></MainLayout>;
    if (!learner) return (
        <MainLayout>
            <Result
                status="404"
                title="Learner Not Found"
                extra={<Button type="primary" onClick={() => navigate('/lms/learners')}>Back to List</Button>}
            />
        </MainLayout>
    );

    return (
        <MainLayout>
            <div className="p-6">
                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/lms/learners')}
                    className="mb-4 pl-0 text-gray-600"
                >
                    Back to Learners
                </Button>

                <Card className="mb-6" bordered={true}>
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

                <Row gutter={16} className="mb-6">
                    <Col span={6}>
                        <Card bordered={true}>
                            <Statistic
                                title="Avg Quiz Score"
                                value={learner.stats?.avgScore || 0}
                                precision={1}
                                suffix="%"
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card bordered={true}>
                            <Statistic
                                title="Courses Completed"
                                value={learner.stats?.completedCourses || 0}
                                suffix={`/ ${learner.stats?.assigned || 0}`}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card bordered={true}>
                            <Statistic
                                title="Assessments Taken"
                                value={learner.assessments?.length || 0}
                                prefix={<FileTextOutlined className="text-gray-400 mr-2" />}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card bordered={true}>
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
                                dataSource={learner.courses}
                                rowKey={(record: any) => record.id || record._id || Math.random()}
                                pagination={false}
                                columns={[
                                    {
                                        title: 'Course',
                                        dataIndex: 'title',
                                        key: 'title',
                                        width: 250,
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
                                        render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-'
                                    },
                                    {
                                        title: 'Validity Date',
                                        dataIndex: 'validityDate',
                                        key: 'validityDate',
                                        width: 120,
                                        render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-'
                                    },
                                    {
                                        title: 'Progress',
                                        dataIndex: 'progress',
                                        key: 'progress',
                                        width: 200,
                                        render: (val, record: any) => (
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>{val}%</span>
                                                    <span>{record.completedLessons}/{record.totalLessons} Lessons</span>
                                                </div>
                                                <Progress percent={val} showInfo={false} size="small" strokeColor={val === 100 ? '#52c41a' : '#1890ff'} />
                                            </div>
                                        )
                                    },
                                    {
                                        title: 'Avg Ai quiz score',
                                        dataIndex: 'avgAiQuizScore',
                                        key: 'avgAiQuizScore',
                                        width: 130,
                                        render: (avg: number | null) => avg != null ? <Text strong>{avg}%</Text> : <Text type="secondary">-</Text>
                                    },
                                    {
                                        title: 'Status',
                                        dataIndex: 'status',
                                        key: 'status',
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

                                            return <Tag color={color}>{displayStatus}</Tag>;
                                        }
                                    },
                                    {
                                        title: 'Access',
                                        key: 'access',
                                        render: (_, record: any) => (
                                            record.isAccessBlocked ?
                                                <Badge status="error" text="Paused" /> :
                                                <Badge status="success" text="Active" />
                                        )
                                    },
                                    {
                                        title: 'Action',
                                        key: 'action',
                                        render: (_, record: any) => (
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
                                        )
                                    }
                                ]}
                            />
                        </Tabs.TabPane>
                        <Tabs.TabPane tab="Assessment History" key="2">
                            <Table
                                dataSource={learner.assessments}
                                rowKey={(record: any) => record.id || record._id || Math.random()}
                                pagination={false}
                                columns={[
                                    { title: 'Assessment', dataIndex: 'name', key: 'name' },
                                    { title: 'Date', dataIndex: 'date', key: 'date', render: d => dayjs(d).format('MMM D, YYYY') },
                                    {
                                        title: 'Score',
                                        dataIndex: 'score',
                                        key: 'score',
                                        render: (score, record: any) => (
                                            <Text type={record.result === 'Pass' ? 'success' : 'danger'}>{score}%</Text>
                                        )
                                    },
                                    {
                                        title: 'Result',
                                        dataIndex: 'result',
                                        key: 'result',
                                        render: (res) => (
                                            <Tag color={res === 'Pass' ? 'green' : 'red'}>
                                                {res ? res.toUpperCase() : 'N/A'}
                                            </Tag>
                                        )
                                    }
                                ]}
                            />
                        </Tabs.TabPane>
                    </Tabs>
                </Card>
            </div>
        </MainLayout>
    );
};

export default LearnerDetail;
