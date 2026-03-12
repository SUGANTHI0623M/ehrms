// Redesigned Learners Management Page - V2 (responsive: cards on mobile, table on desktop)
import React, { useState, useEffect } from 'react';
import {
    Table,
    Input,
    Select,
    Button,
    Avatar,
    Typography,
    Row,
    Col,
    Card,
    Space,
    Tag,
    Switch,
    Modal,
    message,
    Empty,
    Tooltip,
    Pagination,
    Skeleton
} from 'antd';
import {
    UserOutlined,
    SearchOutlined,
    ExclamationCircleOutlined,
    CheckCircleOutlined,
    TrophyOutlined,
    RightOutlined,
    ReloadOutlined,
    TeamOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { LmsKpiCard } from '@/components/lms/SharedComponents';
import { lmsService } from '@/services/lmsService';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const { Title, Text } = Typography;
const { Option } = Select;

interface Learner {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { name: string } | string;
    department: { name: string } | string;
    avatar?: string;
    stats: {
        assigned: number;
        completed: number;
        inProgress: number;
        avgScore: number;
        avgAiQuizScore?: number;
        status: string;
        assessmentsCount?: number;
    };
    isActive?: boolean;
}

const PAGE_SIZE = 10;

const LearnersList = () => {
    const navigate = useNavigate();
    const { isMobile } = useBreakpoint();
    const [learners, setLearners] = useState<Learner[]>([]);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<string[]>([]);
    const [filters, setFilters] = useState({
        search: '',
        department: '',
        status: ''
    });
    const [mobilePage, setMobilePage] = useState(1);

    useEffect(() => {
        const fetchDeps = async () => {
            try {
                const res = await lmsService.getDepartments();
                const depts = res.data?.departments || res.data || [];
                setDepartments(Array.isArray(depts) ? depts : []);
            } catch (error) {
                console.error("Failed to fetch departments", error);
            }
        };
        fetchDeps();
    }, []);

    useEffect(() => {
        fetchLearners();
    }, [filters]);

    // Refetch when tab/window gains focus so Status and stats stay in sync with backend
    useEffect(() => {
        const onFocus = () => fetchLearners();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [filters]);

    const fetchLearners = async () => {
        setLoading(true);
        try {
            const res = await lmsService.getLearnersList(filters);
            const enhancedData = (res.data || []).map((l: any) => ({
                ...l,
                isActive: l.isActive !== undefined ? l.isActive : l.stats?.status !== 'Inactive'
            }));
            setLearners(enhancedData);
        } catch (error) {
            console.error("Failed to fetch learners", error);
            message.error("Failed to load learners data");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = (learner: Learner) => {
        const newStatus = !learner.isActive;
        Modal.confirm({
            title: `${newStatus ? 'Activate' : 'Deactivate'} LMS access?`,
            icon: <ExclamationCircleOutlined />,
            content: `This will ${newStatus ? 'show' : 'hide'} the "My Learning" module in ${learner.firstName} ${learner.lastName}'s employee portal. Their account will remain active.`,
            okText: 'Yes, Proceed',
            cancelText: 'Cancel',
            centered: true,
            onOk: async () => {
                try {
                    await lmsService.updateLearnerLmsAccess(learner._id, newStatus);
                    setLearners(prev => prev.map(l =>
                        l._id === learner._id ? { ...l, isActive: newStatus, stats: { ...l.stats, status: newStatus ? 'Active' : 'Inactive' } } : l
                    ));
                    message.success(`LMS access ${newStatus ? 'enabled' : 'disabled'} successfully`);
                } catch (error) {
                    message.error("Failed to update LMS access");
                }
            }
        });
    };

    /** Progress status only (Not Started / In Progress / Completed). */
    const getLearnerProgressStatus = (record: Learner): { color: string; text: string } => {
        const assigned = record.stats?.assigned ?? 0;
        const completed = record.stats?.completed ?? 0;
        if (assigned === 0) return { color: 'default', text: 'Not Started' };
        if (completed >= assigned) return { color: 'success', text: 'Completed' };
        return { color: 'processing', text: 'In Progress' };
    };

    const columns = [
        {
            title: 'Learner',
            key: 'learner',
            width: 280,
            render: (_: any, record: Learner) => (
                <Space size="middle">
                    <Avatar
                        src={record.avatar}
                        icon={<UserOutlined />}
                        className="bg-indigo-50 text-indigo-500"
                        size={36}
                    />
                    <div className="flex flex-col">
                        <Text strong className="text-sm">{record.firstName} {record.lastName}</Text>
                        <Text type="secondary" className="text-[11px] leading-tight">{record.email}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Department',
            key: 'department',
            render: (_: any, record: Learner) => {
                const dept = typeof record.department === 'object' ? (record.department as any).name : record.department;
                return <Text className="text-sm">{dept || 'General'}</Text>;
            }
        },
        {
            title: 'Assigned',
            key: 'assigned',
            align: 'center' as const,
            render: (_: any, record: Learner) => record.stats?.assigned || 0
        },
        {
            title: (
                <Tooltip title="Number of courses where the learner completed all lessons (excluding assessment)">
                    <span>Completed</span>
                </Tooltip>
            ),
            key: 'completed',
            align: 'center' as const,
            render: (_: any, record: Learner) => (
                <Text className="text-sm font-medium  ">{record.stats?.completed ?? 0}</Text>
            )
        },
        {
            title: (
                <Tooltip title="Number of assessments the learner passed">
                    <span>Assessments</span>
                </Tooltip>
            ),
            key: 'assessments',
            align: 'center' as const,
            render: (_: any, record: Learner) => record.stats?.assessmentsCount ?? 0
        },
        {
            title: 'Avg AI Quiz Score',
            key: 'avgAiQuizScore',
            align: 'center' as const,
            render: (_: any, record: Learner) => (
                <Text strong className="text-sm">{(record.stats?.avgAiQuizScore ?? 0).toFixed(1)}%</Text>
            )
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: any, record: Learner) => {
                const { color, text } = getLearnerProgressStatus(record);
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: 'Action',
            key: 'action',
            align: 'center' as const,
            width: 100,
            onCell: () => ({
                onClick: (e: React.MouseEvent) => e.stopPropagation()
            }),
            render: (_: any, record: Learner) => (
                <Tooltip title={record.isActive ? "Disable LMS access (hide My Learning)" : "Enable LMS access"}>
                    <Switch
                        size="small"
                        checked={record.isActive}
                        onChange={() => handleStatusToggle(record)}
                        className={record.isActive ? 'bg-green-500' : ''}
                    />
                </Tooltip>
            )
        }
    ];

    const paginatedLearners = isMobile
        ? learners.slice((mobilePage - 1) * PAGE_SIZE, mobilePage * PAGE_SIZE)
        : learners;

    return (
        <MainLayout>
            <div className="lms-page p-4 sm:p-6 w-full max-w-[1600px] mx-auto space-y-4 pb-20">
                {/* 1. Page Header */}
                <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div>
                        <Title level={4} style={{ margin: 0 }} className="text-lg sm:text-xl">Learners Management</Title>
                        <Text type="secondary" className="text-xs sm:text-sm block mt-1">
                            Manage learner enrollment, course assignment, and activity status
                        </Text>
                    </div>
                </div>

                {/* KPI Overview — same design as Course Library / Assessment / Live Sessions */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <LmsKpiCard
                            title="Total Learners"
                            value={learners.length}
                            icon={<UserOutlined />}
                            accentColor="#1e40af"
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <LmsKpiCard
                            title="Active Now"
                            value={learners.filter(l => l.isActive).length}
                            icon={<TeamOutlined />}
                            accentColor="#15803d"
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <LmsKpiCard
                            title="Completed All"
                            value={learners.filter(l => l.stats?.status === 'Completed').length}
                            icon={<CheckCircleOutlined />}
                            accentColor="#0d9488"
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <LmsKpiCard
                            title="Avg Assessment Score"
                            value={learners.length > 0 ? `${(learners.reduce((acc, curr) => acc + (curr.stats?.avgScore || 0), 0) / learners.length).toFixed(1)}%` : '0.0%'}
                            icon={<TrophyOutlined />}
                            accentColor="#b45309"
                        />
                    </Col>
                </Row>

                {/* 2. Compact Filters Card - stack on mobile */}
                <Card
                    className="shadow-sm border-gray-100"
                    styles={{ body: { padding: '12px 16px' } }}
                    bordered={false}
                >
                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
                        <Input
                            prefix={<SearchOutlined className="text-gray-400" />}
                            placeholder="Search by name or email"
                            className="w-full sm:flex-1 sm:min-w-[200px] md:w-64 touch-target min-h-[44px]"
                            allowClear
                            onChange={e => setFilters({ ...filters, search: e.target.value })}
                        />
                        <Select
                            placeholder="All Departments"
                            className="w-full sm:w-48 touch-target min-h-[44px]"
                            allowClear
                            onChange={v => setFilters({ ...filters, department: v })}
                        >
                            {departments.map((d: any) => {
                                const val = typeof d === 'object' ? d._id : d;
                                const label = typeof d === 'object' ? d.name : d;
                                return <Option key={val} value={val}>{label}</Option>;
                            })}
                        </Select>
                        <Select
                            placeholder="Status"
                            className="w-full sm:w-40 touch-target min-h-[44px]"
                            allowClear
                            onChange={v => setFilters({ ...filters, status: v })}
                        >
                            <Option value="Completed">Completed</Option>
                            <Option value="In Progress">In Progress</Option>
                            <Option value="Not Started">Not Started</Option>
                        </Select>
                        <Button
                            type="default"
                            icon={<ReloadOutlined spin={loading} />}
                            onClick={() => fetchLearners()}
                            className="touch-target min-h-[44px] sm:min-h-0"
                        >
                            Refresh
                        </Button>
                    </div>
                </Card>

                {/* 3. Main: Cards on mobile, Table on tablet/desktop */}
                <Card
                    className="shadow-sm border-gray-100 overflow-hidden"
                    styles={{ body: { padding: isMobile ? 16 : 0 } }}
                    bordered={false}
                >
                    {isMobile ? (
                        <>
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <Card key={i} size="small" className="rounded-xl border-gray-100" styles={{ body: { padding: 16 } }}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <Skeleton.Avatar active size={44} shape="circle" />
                                                    <div className="min-w-0 flex-1">
                                                        <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 0 }} />
                                                        <Skeleton active title={{ width: '80%' }} paragraph={{ rows: 0 }} className="mt-1" />
                                                        <div className="flex gap-2 mt-2"><Skeleton.Button active size="small" /><Skeleton.Button active size="small" /></div>
                                                    </div>
                                                </div>
                                                <Skeleton active title={{ width: 40 }} paragraph={{ rows: 0 }} />
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                                                <Skeleton active title={{ width: 64 }} paragraph={{ rows: 0 }} />
                                                <Skeleton.Button active size="small" />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            ) : paginatedLearners.length === 0 ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={<Text type="secondary">No learners found</Text>}
                                />
                            ) : (
                                <div className="space-y-3">
                                    {paginatedLearners.map((record) => (
                                        <Card
                                            key={record._id}
                                            size="small"
                                            className="rounded-xl border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => navigate(`/admin/lms/learners/${record._id}`)}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <Avatar
                                                        src={record.avatar}
                                                        icon={<UserOutlined />}
                                                        className="bg-indigo-50 text-indigo-500 shrink-0"
                                                        size={44}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <Text strong className="block truncate text-base">{record.firstName} {record.lastName}</Text>
                                                        <Text type="secondary" className="text-xs block truncate">{record.email}</Text>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <Tag className="m-0 text-xs">
                                                                {typeof record.department === 'object' ? (record.department as any).name : record.department || 'General'}
                                                            </Tag>
                                                            {(() => { const { color, text } = getLearnerProgressStatus(record); return <Tag color={color} className="m-0 text-xs">{text}</Tag>; })()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-2">
                                                    <div className="text-right text-xs">
                                                        <div className="text-gray-500">Progress</div>
                                                        <div className="font-semibold">{record.stats?.completed ?? 0}/{record.stats?.assigned ?? 0}</div>
                                                        <div className="text-gray-500">{(record.stats?.avgScore ?? 0).toFixed(0)}% avg</div>
                                                    </div>
                                                    <RightOutlined className="text-gray-400" />
                                                </div>
                                            </div>
                                            <div
                                                className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span className="text-xs text-gray-500">LMS access</span>
                                                <Switch
                                                    size="small"
                                                    checked={record.isActive}
                                                    onChange={() => handleStatusToggle(record)}
                                                    className={record.isActive ? 'bg-green-500' : ''}
                                                />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                            {learners.length > PAGE_SIZE && (
                                <div className="flex justify-center mt-4">
                                    <Pagination
                                        current={mobilePage}
                                        total={learners.length}
                                        pageSize={PAGE_SIZE}
                                        onChange={setMobilePage}
                                        showSizeChanger={false}
                                        showTotal={(total) => `Total ${total} learners`}
                                        className="touch-target"
                                    />
                                </div>
                            )}
                        </>
                    ) : loading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <Skeleton key={i} active paragraph={{ rows: 1 }} title={{ width: '100%' }} />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table
                                columns={columns}
                                dataSource={learners}
                                rowKey="_id"
                                pagination={{
                                    pageSize: 10,
                                    showTotal: (total) => `Total ${total} learners`,
                                    position: ['bottomRight'],
                                    showSizeChanger: !isMobile
                                }}
                                onRow={(record) => ({
                                    onClick: () => navigate(`/admin/lms/learners/${record._id}`),
                                    className: 'cursor-pointer'
                                })}
                                scroll={{ x: 900 }}
                                locale={{
                                    emptyText: (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={<Text type="secondary">No learners found</Text>}
                                        />
                                    )
                                }}
                            />
                        </div>
                    )}
                </Card>
            </div>
        </MainLayout>
    );
};

export default LearnersList;
