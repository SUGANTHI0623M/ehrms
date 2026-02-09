import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import {
    Card, Row, Col, Statistic, Select, Typography, Button, Table, Tabs, Tag, Space,
    Progress, Tooltip, Empty, Spin, Dropdown, Input
} from 'antd';
import {
    TeamOutlined, TrophyOutlined, WarningOutlined,
    BookOutlined, DownloadOutlined, UserOutlined, SearchOutlined
} from '@ant-design/icons';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { lmsService } from '@/services/lmsService';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;

const COLORS = ['#52c41a', '#1890ff', '#fa8c16', '#f5222d'];

const ScoresAnalytics: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [subTab, setSubTab] = useState('courses');
    const [months, setMonths] = useState<number>(6);
    const [courseSearch, setCourseSearch] = useState('');
    const [learnerSearch, setLearnerSearch] = useState('');

    const [systemData, setSystemData] = useState<any>(null);
    const [courseData, setCourseData] = useState<any[]>([]);
    const [departmentData, setDepartmentData] = useState<any[]>([]);
    const [learners, setLearners] = useState<any[]>([]);

    const fetchSystem = async () => {
        setLoading(true);
        try {
            const res = await lmsService.getSystemAnalytics({ months });
            if (res?.data) setSystemData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await lmsService.getCourseLevelAnalytics();
            if (res?.data) setCourseData(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await lmsService.getDepartmentAnalytics();
            if (res?.data) setDepartmentData(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchLearners = async () => {
        try {
            const res = await lmsService.getLearnersList();
            if (res?.data) setLearners(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchSystem();
    }, [months]);

    useEffect(() => {
        fetchCourses();
        fetchDepartments();
        fetchLearners();
    }, []);

    const handleExport = async (type: 'learners' | 'courses') => {
        try {
            const res = await lmsService.exportAnalytics(type, { months });
            const blob = res instanceof Blob ? res : (res as any)?.data;
            if (!blob) return;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const rangeSuffix = months === 0 || months >= 24 ? '-all' : `-last-${months}-months`;
            a.download = type === 'learners' ? `lms-learners-export${rangeSuffix}.csv` : `lms-courses-export${rangeSuffix}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
        }
    };

    const learnerName = (r: any) => `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email || '—';
    const learnerDept = (r: any) => (typeof r.department === 'object' ? r.department?.name : r.department) || '—';

    const exportMenuItems: MenuProps['items'] = [
        { key: 'learners', label: 'Export Learners (CSV)', icon: <UserOutlined />, onClick: () => handleExport('learners') },
        { key: 'courses', label: 'Export Courses (CSV)', icon: <BookOutlined />, onClick: () => handleExport('courses') }
    ];

    const kpi = systemData?.kpi || {};
    const trendMonths = systemData?.trendMonths || systemData?.trends || [];
    const scoreDist = systemData?.scoreDist || [];

    const topPerformers = learners
        .filter((l: any) => (l.stats?.avgScore ?? 0) > 0)
        .sort((a: any, b: any) => (b.stats?.avgScore ?? 0) - (a.stats?.avgScore ?? 0))
        .slice(0, 10);
    const needsAttention = learners
        .filter((l: any) => {
            const s = l.stats || {};
            const score = s.avgScore ?? 0;
            const assigned = s.assigned ?? 0;
            const completed = s.completed ?? 0;
            const inProgress = s.inProgress ?? 0;
            return (
                (assigned > 0 && completed === 0 && inProgress === 0) ||
                (completed > 0 && score < 50)
            );
        })
        .sort((a: any, b: any) => (a.stats?.avgScore ?? 0) - (b.stats?.avgScore ?? 0))
        .slice(0, 10);

    const filteredCourseData = courseData.filter(
        (c: any) => !courseSearch || (c.title || '').toLowerCase().includes(courseSearch.toLowerCase()) || (c.category || '').toLowerCase().includes(courseSearch.toLowerCase())
    );
    const filteredLearners = learners.filter(
        (l: any) => !learnerSearch || learnerName(l).toLowerCase().includes(learnerSearch.toLowerCase()) || (l.email || '').toLowerCase().includes(learnerSearch.toLowerCase()) || learnerDept(l).toLowerCase().includes(learnerSearch.toLowerCase())
    );

    return (
        <MainLayout>
            <div className="lms-page p-4 sm:p-6 max-w-7xl mx-auto overflow-x-hidden">
                <div className="flex flex-col sm:flex-row flex-wrap justify-between items-stretch sm:items-center gap-4 mb-6">
                    <div>
                        <Title level={3} className="!mb-1 text-lg sm:text-xl">Scores & Analytics</Title>
                        <Text type="secondary" className="text-sm">Learning effectiveness, completion rates, and performance metrics</Text>
                    </div>
                    <Space className="w-full sm:w-auto">
                        <Select
                            value={months}
                            onChange={setMonths}
                            className="w-full sm:w-[160px] min-h-[44px] sm:min-h-0"
                            options={[
                                { value: 1, label: 'Last month' },
                                { value: 3, label: 'Last 3 months' },
                                { value: 6, label: 'Last 6 months' },
                                { value: 12, label: 'Last 12 months' },
                                { value: 0, label: 'All time' }
                            ]}
                        />
                        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
                            <Button icon={<DownloadOutlined />} className="min-h-[44px] sm:min-h-0 w-full sm:w-auto">Export</Button>
                        </Dropdown>
                    </Space>
                </div>

                {/* System Overview: KPIs + charts, then sub-tabs */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-12"><Spin size="large" /></div>
                    ) : (
                        <>
                            <Row gutter={[16, 16]}>
                                <Col xs={12} md={8} lg={4}>
                                    <Card className="rounded-xl">
                                        <Statistic title="Total Enrollments" value={kpi.totalEnrollments ?? 0} />
                                    </Card>
                                </Col>
                                <Col xs={12} md={8} lg={4}>
                                    <Card className="rounded-xl">
                                        <Statistic title="Completion Rate" value={kpi.completionRate ?? 0} suffix="%" />
                                    </Card>
                                </Col>
                                <Col xs={12} md={8} lg={4}>
                                    <Card className="rounded-xl">
                                        <Statistic title="Avg Score" value={kpi.avgScore ?? 0} suffix="%" />
                                    </Card>
                                </Col>
                                <Col xs={12} md={8} lg={4}>
                                    <Card className="rounded-xl">
                                        <Statistic title="Pass Rate" value={kpi.passRate ?? 0} suffix="%" />
                                    </Card>
                                </Col>
                                <Col xs={12} md={8} lg={4}>
                                    <Card className="rounded-xl">
                                        <Statistic title="Active Learners" value={kpi.activeLearnerCount ?? 0} />
                                    </Card>
                                </Col>
                                <Col xs={12} md={8} lg={4}>
                                    <Card className="rounded-xl">
                                        <Statistic title="Avg Time to Complete" value={kpi.avgTimeToCompleteDays ?? 0} suffix="days" />
                                    </Card>
                                </Col>
                            </Row>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} lg={16}>
                                    <Card title="Trend (Assigned vs Completed)" className="rounded-xl">
                                        <div style={{ height: 320 }}>
                                            {(!trendMonths || trendMonths.length === 0) ? (
                                                <div className="flex items-center justify-center h-full text-gray-400"><Empty description="No trend data for selected period" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>
                                            ) : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={trendMonths}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="name" />
                                                        <YAxis />
                                                        <RechartsTooltip />
                                                        <Legend />
                                                        <Line type="monotone" dataKey="assigned" name="Assigned" stroke="#1890ff" strokeWidth={2} />
                                                        <Line type="monotone" dataKey="completed" name="Completed" stroke="#52c41a" strokeWidth={2} />
                                                        <Line type="monotone" dataKey="avgScore" name="Avg Score" stroke="#fa8c16" strokeWidth={2} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </Card>
                                </Col>
                                <Col xs={24} lg={8}>
                                    <Card title="Score Distribution" className="rounded-xl" bodyStyle={{ minHeight: 320 }}>
                                        <div style={{ height: 320 }}>
                                            {(!scoreDist || scoreDist.length === 0 || scoreDist.every((d: any) => !d.value)) ? (
                                                <div className="flex items-center justify-center h-full text-gray-400"><Empty description="No score data yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /></div>
                                            ) : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={scoreDist.filter((d: any) => d.value > 0)}
                                                            innerRadius={50}
                                                            outerRadius={80}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            label
                                                        >
                                                            {scoreDist.filter((d: any) => d.value > 0).map((entry: any, i: number) => (
                                                                <Cell key={i} fill={entry.color} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}

                    {/* Sub-tabs: Course Performance | Department / Team | Learners */}
                    <Card className="rounded-xl" bodyStyle={{ paddingTop: 16 }}>
                        <Tabs
                            activeKey={subTab}
                            onChange={setSubTab}
                            size="middle"
                            items={[
                                {
                                    key: 'courses',
                                    label: <span><BookOutlined /> Course Performance</span>,
                                    children: (
                                        <div className="space-y-4">
                                            <Input
                                                placeholder="Search by course or category..."
                                                prefix={<SearchOutlined />}
                                                value={courseSearch}
                                                onChange={(e) => setCourseSearch(e.target.value)}
                                                allowClear
                                                style={{ maxWidth: 320 }}
                                            />
                                            <div className="scores-table-wrapper overflow-x-auto">
                                                <Table
                                                    dataSource={filteredCourseData}
                                                    rowKey={(r: any) => String(r.courseId || r.title || Math.random())}
                                                    pagination={{ pageSize: 10, showSizeChanger: true }}
                                                    showSorterTooltip={false}
                                                    tableLayout="fixed"
                                                    className="scores-course-table"
                                                    columns={[
                                                        { title: 'Course', dataIndex: 'title', key: 'title', ellipsis: true, width: '15%', sorter: (a: any, b: any) => (a.title || '').localeCompare(b.title || ''), render: (t: string, r: any) => <span className="font-medium">{t}</span> },
                                                        { title: 'Category', dataIndex: 'category', key: 'category', width: '15%', sorter: (a: any, b: any) => (a.category || '').localeCompare(b.category || '') },
                                                        { title: 'Assigned', dataIndex: 'assigned', key: 'assigned', width: '10%', sorter: (a: any, b: any) => (a.assigned ?? 0) - (b.assigned ?? 0) },
                                                        { title: 'Completed', dataIndex: 'completed', key: 'completed', width: '10%', sorter: (a: any, b: any) => (a.completed ?? 0) - (b.completed ?? 0) },
                                                        {
                                                            title: 'Completion %',
                                                            dataIndex: 'completionRate',
                                                            key: 'completionRate',
                                                            width: '12%',
                                                            sorter: (a: any, b: any) => (a.completionRate ?? 0) - (b.completionRate ?? 0),
                                                            render: (v: number) => <Progress percent={v} size="small" status={v >= 70 ? 'success' : v >= 40 ? 'active' : 'exception'} />
                                                        },
                                                        { title: 'Avg Score', dataIndex: 'avgScore', key: 'avgScore', width: '10%', sorter: (a: any, b: any) => (a.avgScore ?? 0) - (b.avgScore ?? 0), render: (v: number) => `${v ?? 0}%` },
                                                        { title: 'Pass Rate', dataIndex: 'passRate', key: 'passRate', width: '10%', sorter: (a: any, b: any) => (a.passRate ?? 0) - (b.passRate ?? 0), render: (v: number) => `${v ?? 0}%` },
                                                        { title: 'Avg Days to Complete', dataIndex: 'avgTimeToCompleteDays', key: 'days', width: '13%', sorter: (a: any, b: any) => (a.avgTimeToCompleteDays ?? 0) - (b.avgTimeToCompleteDays ?? 0) },
                                                        {
                                                            key: 'action',
                                                            width: '5%',
                                                            render: (_: any, r: any) => (
                                                                <Button type="link" size="small" className="min-h-[44px] flex items-center" onClick={() => navigate(`/lms/admin/course/${r.courseId}`)}>View</Button>
                                                            )
                                                        }
                                                    ]}
                                                    locale={{ emptyText: <Empty description="No course data" /> }}
                                                />
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: 'departments',
                                    label: <span><TeamOutlined /> Department / Team</span>,
                                    children: (
                                        <div className="scores-table-wrapper overflow-x-auto">
                                            <Table
                                                dataSource={departmentData}
                                                rowKey="department"
                                                pagination={{ pageSize: 10, showSizeChanger: true }}
                                                showSorterTooltip={false}
                                                tableLayout="fixed"
                                                className="scores-department-table"
                                                columns={[
                                                    { title: 'Department', dataIndex: 'department', key: 'department', width: '20%', sorter: (a: any, b: any) => (a.department || '').localeCompare(b.department || ''), render: (t: string) => <span className="font-medium">{t}</span> },
                                                    { title: 'Learners', dataIndex: 'learnerCount', key: 'learnerCount', width: '12%', align: 'center', sorter: (a: any, b: any) => (a.learnerCount ?? 0) - (b.learnerCount ?? 0) },
                                                    { title: 'Enrollments', dataIndex: 'assignedEnrollments', key: 'assigned', width: '12%', align: 'center', sorter: (a: any, b: any) => (a.assignedEnrollments ?? 0) - (b.assignedEnrollments ?? 0) },
                                                    { title: 'Completed', dataIndex: 'completed', key: 'completed', width: '12%', align: 'center', sorter: (a: any, b: any) => (a.completed ?? 0) - (b.completed ?? 0) },
                                                    {
                                                        title: 'Completion %',
                                                        dataIndex: 'completionRate',
                                                        key: 'completionRate',
                                                        width: '15%',
                                                        align: 'center',
                                                        sorter: (a: any, b: any) => (a.completionRate ?? 0) - (b.completionRate ?? 0),
                                                        render: (v: number) => <Progress percent={v} size="small" status={v >= 70 ? 'success' : 'active'} />
                                                    },
                                                    { title: 'Avg Score', dataIndex: 'avgScore', key: 'avgScore', width: '12%', align: 'center', sorter: (a: any, b: any) => (a.avgScore ?? 0) - (b.avgScore ?? 0), render: (v: number) => `${v ?? 0}%` },
                                                    { title: 'Pass Rate', dataIndex: 'passRate', key: 'passRate', width: '12%', align: 'center', sorter: (a: any, b: any) => (a.passRate ?? 0) - (b.passRate ?? 0), render: (v: number) => `${v ?? 0}%` }
                                                ]}
                                                locale={{ emptyText: <Empty description="No department data" /> }}
                                            />
                                        </div>
                                    )
                                },
                                {
                                    key: 'learners',
                                    label: <span><UserOutlined /> Learners</span>,
                                    children: (
                                        <div className="space-y-6">
                                            <Row gutter={[16, 16]}>
                                                <Col xs={24} lg={12}>
                                                    <Card title={<><TrophyOutlined className="mr-2" /> Top Performers</>} size="small" className="rounded-xl">
                                                        <Table
                                                            dataSource={topPerformers}
                                                            rowKey="_id"
                                                            pagination={false}
                                                            size="small"
                                                            columns={[
                                                                { title: '#', key: 'rank', width: 40, render: (_: any, __: any, i: number) => i + 1 },
                                                                { title: 'Learner', key: 'name', render: (_: any, r: any) => learnerName(r) },
                                                                { title: 'Dept', key: 'dept', render: (_: any, r: any) => learnerDept(r) },
                                                                { title: 'Score', key: 'score', width: 70, render: (r: any) => <Text strong>{r.stats?.avgScore ?? 0}%</Text> },
                                                                { key: 'action', width: 80, render: (_: any, r: any) => <Button type="link" size="small" onClick={() => navigate(`/lms/learners/${r._id}`)}>View</Button> }
                                                            ]}
                                                            locale={{ emptyText: <Empty description="No data yet. Scores appear as learners complete assessments." /> }}
                                                        />
                                                    </Card>
                                                </Col>
                                                <Col xs={24} lg={12}>
                                                    <Card title={<><WarningOutlined className="mr-2" /> Needs Attention</>} size="small" className="rounded-xl">
                                                        <Table
                                                            dataSource={needsAttention}
                                                            rowKey="_id"
                                                            pagination={false}
                                                            size="small"
                                                            columns={[
                                                                { title: 'Learner', key: 'name', render: (_: any, r: any) => learnerName(r) },
                                                                { title: 'Dept', key: 'dept', render: (_: any, r: any) => learnerDept(r) },
                                                                { title: 'Score', key: 'score', width: 70, render: (r: any) => <Text type="danger">{r.stats?.avgScore ?? 0}%</Text> },
                                                                { key: 'action', width: 80, render: (_: any, r: any) => <Button type="link" size="small" onClick={() => navigate(`/lms/learners/${r._id}`)}>View</Button> }
                                                            ]}
                                                            locale={{ emptyText: <Empty description="No learners need attention" /> }}
                                                        />
                                                    </Card>
                                                </Col>
                                            </Row>
                                            <Card
                                                title="All Learners"
                                                extra={
                                                    <Space>
                                                        <Input
                                                            placeholder="Search name, email, department..."
                                                            prefix={<SearchOutlined />}
                                                            value={learnerSearch}
                                                            onChange={(e) => setLearnerSearch(e.target.value)}
                                                            allowClear
                                                            style={{ width: 240 }}
                                                        />
                                                        <Button type="primary" size="small" onClick={() => navigate('/lms/learners')}>View full list</Button>
                                                    </Space>
                                                }
                                                size="small"
                                                className="rounded-xl"
                                            >
                                                <Table
                                                    dataSource={filteredLearners}
                                                    rowKey="_id"
                                                    pagination={{ pageSize: 15, showSizeChanger: true }}
                                                    size="small"
                                                    columns={[
                                                        { title: 'Name', key: 'name', render: (_: any, r: any) => learnerName(r) },
                                                        { title: 'Department', key: 'dept', render: (_: any, r: any) => learnerDept(r) },
                                                        { title: 'Assigned', dataIndex: ['stats', 'assigned'], key: 'assigned', width: 80 },
                                                        { title: 'Completed', dataIndex: ['stats', 'completed'], key: 'completed', width: 80 },
                                                        { title: 'Avg Score', key: 'score', width: 90, render: (r: any) => `${r.stats?.avgScore ?? 0}%` },
                                                        { title: 'Status', key: 'status', width: 100, render: (r: any) => <Tag color={r.stats?.status === 'Completed' ? 'green' : r.stats?.status === 'In Progress' ? 'blue' : 'default'}>{r.stats?.status ?? '—'}</Tag> },
                                                        { key: 'action', width: 80, render: (_: any, r: any) => <Button type="link" size="small" onClick={() => navigate(`/lms/learners/${r._id}`)}>View</Button> }
                                                    ]}
                                                    locale={{ emptyText: <Empty description="No learners" /> }}
                                                />
                                            </Card>
                                        </div>
                                    )
                                }
                            ]}
                        />
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
};

export default ScoresAnalytics;
