import React, { useMemo, useState } from "react";
import MainLayout from "@/components/MainLayout";
import {
  Row,
  Col,
  Card,
  Button,
  Select,
  Input,
  Space,
  Tag,
  Progress,
  Avatar,
  Typography,
  Table,
  Tooltip,
  Statistic,
  Tabs,
  DatePicker,
  Empty,
  Timeline,
  Collapse,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  BarChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useGetGoalsQuery } from "@/store/api/pmsApi";
import { useGetKRAsQuery } from "@/store/api/kraApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Target, TrendingUp, TrendingDown, Zap, AlertCircle, Clock, ExternalLink, Award } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

const { Search } = Input;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

interface GoalTrackRecord {
  goal: any;
  employee: any;
  createdDate: Date;
  completionDate?: Date;
  duration?: number;
  expectedDuration: number;
  completionSpeed: number;
  speedStatus: 'early' | 'ontime' | 'late' | 'inprogress' | 'overdue';
  linkedKRA?: any;
  kpiScore?: number; // Industry standard KPI score (0-100)
  kraContribution?: number; // Contribution to linked KRA
}

interface EmployeePerformance {
  employee: any;
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  earlyCompletions: number;
  onTimeCompletions: number;
  lateCompletions: number;
  averageKpiScore: number;
  averageDuration: number;
  completionRate: number;
  onTimeRate: number;
  records: GoalTrackRecord[];
}

const KRAKPI: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"timeline" | "employee">("timeline");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch all goals with completion details
  const { data: goalsData, isLoading: goalsLoading } = useGetGoalsQuery({
    limit: 1000,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // Fetch KRAs for linking
  const { data: krasData } = useGetKRAsQuery({ page: 1, limit: 1000 });
  const { data: staffData } = useGetStaffQuery({ page: 1, limit: 1000 });

  const goals = goalsData?.data?.goals || [];
  const kras = krasData?.data?.kras || [];
  const staff = staffData?.data?.staff || [];

  // Industry Standard KRA/KPI Calculation
  // KPI Score = (Progress * Weightage) + (Completion Speed Bonus) - (Delay Penalty)
  const calculateKpiScore = (record: GoalTrackRecord): number => {
    const baseScore = record.goal.progress || 0;
    const weightage = record.goal.weightage || 0;
    let adjustedScore = baseScore;

    // Completion speed adjustment (Industry Standard: ±10% for early/late)
    if (record.completionDate) {
      if (record.speedStatus === 'early') {
        adjustedScore = Math.min(100, baseScore * 1.1); // 10% bonus for early completion
      } else if (record.speedStatus === 'late') {
        adjustedScore = Math.max(0, baseScore * 0.9); // 10% penalty for late completion
      }
    } else if (record.speedStatus === 'overdue') {
      adjustedScore = Math.max(0, baseScore * 0.95); // 5% penalty for overdue
    }

    // Weighted KPI Score
    return Math.round((adjustedScore * weightage) / 100);
  };

  // Calculate track record for each goal
  const trackRecords: GoalTrackRecord[] = useMemo(() => {
    return goals.map((goal: any) => {
      const employee = goal.employeeId;
      const createdDate = goal.createdAt ? new Date(goal.createdAt) : new Date();
      const startDate = new Date(goal.startDate);
      const endDate = new Date(goal.endDate);
      const expectedDuration = Math.max(1, differenceInDays(endDate, startDate));
      
      let completionDate: Date | undefined;
      let duration: number | undefined;
      let completionSpeed = 0;
      let speedStatus: 'early' | 'ontime' | 'late' | 'inprogress' | 'overdue' = 'inprogress';

      if (goal.completedApprovedAt) {
        completionDate = new Date(goal.completedApprovedAt);
        duration = Math.max(1, differenceInDays(completionDate, startDate));
        completionSpeed = (expectedDuration / duration) * 100;
        
        if (completionSpeed > 110) {
          speedStatus = 'early';
        } else if (completionSpeed >= 90) {
          speedStatus = 'ontime';
        } else {
          speedStatus = 'late';
        }
      } else if (goal.progress === 100 && !goal.completedApprovedAt) {
        const now = new Date();
        if (isAfter(now, endDate)) {
          speedStatus = 'overdue';
        }
      } else if (goal.progress < 100) {
        const now = new Date();
        if (isAfter(now, endDate)) {
          speedStatus = 'overdue';
        }
      }

      // Find linked KRA
      const linkedKRA = goal.kraId
        ? (typeof goal.kraId === 'string'
            ? kras.find((k: any) => k._id === goal.kraId)
            : goal.kraId)
        : undefined;

      const record: GoalTrackRecord = {
        goal,
        employee,
        createdDate,
        completionDate,
        duration,
        expectedDuration,
        completionSpeed,
        speedStatus,
        linkedKRA,
      };

      // Calculate KPI Score (Industry Standard)
      record.kpiScore = calculateKpiScore(record);

      // Calculate KRA Contribution (if linked)
      if (linkedKRA && record.completionDate) {
        const kraProgress = typeof linkedKRA === 'object' && 'overallPercent' in linkedKRA
          ? linkedKRA.overallPercent
          : 0;
        record.kraContribution = Math.round((record.kpiScore * (goal.weightage || 0)) / 100);
      }

      return record;
    });
  }, [goals, kras]);

  // Filter track records
  const filteredRecords = useMemo(() => {
    let filtered = [...trackRecords];

    // Search filter (using debounced value)
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.goal.title.toLowerCase().includes(searchLower) ||
          record.goal.kpi.toLowerCase().includes(searchLower) ||
          record.employee?.name?.toLowerCase().includes(searchLower) ||
          record.employee?.employeeId?.toLowerCase().includes(searchLower) ||
          record.employee?.department?.toLowerCase().includes(searchLower)
      );
    }

    // Date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].toDate ? dateRange[0].toDate() : new Date(dateRange[0]);
      const end = dateRange[1].toDate ? dateRange[1].toDate() : new Date(dateRange[1]);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((record) => {
        const created = record.createdDate;
        return created >= start && created <= end;
      });
    }

    // Tab filter
    if (activeTab === "completed") {
      filtered = filtered.filter((r) => r.goal.status === "completed" && r.completionDate);
    } else if (activeTab === "inprogress") {
      filtered = filtered.filter((r) => r.goal.status === "approved" && r.goal.progress < 100);
    } else if (activeTab === "early") {
      filtered = filtered.filter((r) => r.speedStatus === "early");
    } else if (activeTab === "late") {
      filtered = filtered.filter((r) => r.speedStatus === "late" || r.speedStatus === "overdue");
    }

    // Sort by date (most recent first)
    return filtered.sort((a, b) => {
      if (b.completionDate && a.completionDate) {
        return b.completionDate.getTime() - a.completionDate.getTime();
      }
      return b.createdDate.getTime() - a.createdDate.getTime();
    });
  }, [trackRecords, debouncedSearchTerm, dateRange, activeTab]);

  // Group by employee for Employee View
  const employeePerformance: EmployeePerformance[] = useMemo(() => {
    const grouped: Record<string, GoalTrackRecord[]> = {};
    filteredRecords.forEach((record) => {
      const empId = record.employee?._id || "unknown";
      if (!grouped[empId]) {
        grouped[empId] = [];
      }
      grouped[empId].push(record);
    });

    return Object.entries(grouped).map(([empId, records]) => {
      const employee = records[0].employee;
      const completed = records.filter((r) => r.completionDate).length;
      const inProgress = records.filter((r) => r.goal.status === "approved" && r.goal.progress < 100).length;
      const early = records.filter((r) => r.speedStatus === "early").length;
      const onTime = records.filter((r) => r.speedStatus === "ontime").length;
      const late = records.filter((r) => r.speedStatus === "late" || r.speedStatus === "overdue").length;
      
      const avgKpiScore = records.length > 0
        ? Math.round(records.reduce((sum, r) => sum + (r.kpiScore || 0), 0) / records.length)
        : 0;
      
      const avgDuration = completed > 0
        ? Math.round(
            records
              .filter((r) => r.duration)
              .reduce((sum, r) => sum + (r.duration || 0), 0) / completed
          )
        : 0;

      const completionRate = records.length > 0 ? Math.round((completed / records.length) * 100) : 0;
      const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100) : 0;

      return {
        employee,
        totalGoals: records.length,
        completedGoals: completed,
        inProgressGoals: inProgress,
        earlyCompletions: early,
        onTimeCompletions: onTime,
        lateCompletions: late,
        averageKpiScore: avgKpiScore,
        averageDuration: avgDuration,
        completionRate,
        onTimeRate,
        records: records.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime()),
      };
    }).sort((a, b) => b.averageKpiScore - a.averageKpiScore);
  }, [filteredRecords]);

  // Pagination for timeline view
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredRecords.slice(start, end);
  }, [filteredRecords, page, pageSize]);

  // Pagination for employee view
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return employeePerformance.slice(start, end);
  }, [employeePerformance, page, pageSize]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = trackRecords.length;
    const completed = trackRecords.filter((r) => r.completionDate).length;
    const early = trackRecords.filter((r) => r.speedStatus === "early").length;
    const onTime = trackRecords.filter((r) => r.speedStatus === "ontime").length;
    const late = trackRecords.filter((r) => r.speedStatus === "late" || r.speedStatus === "overdue").length;
    const inProgress = trackRecords.filter((r) => r.goal.status === "approved" && r.goal.progress < 100).length;
    
    const avgDuration = completed > 0
      ? Math.round(
          trackRecords
            .filter((r) => r.duration)
            .reduce((sum, r) => sum + (r.duration || 0), 0) / completed
        )
      : 0;

    const avgKpiScore = trackRecords.length > 0
      ? Math.round(trackRecords.reduce((sum, r) => sum + (r.kpiScore || 0), 0) / trackRecords.length)
      : 0;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100) : 0;

    return {
      total,
      completed,
      early,
      onTime,
      late,
      inProgress,
      avgDuration,
      avgKpiScore,
      completionRate,
      onTimeRate,
    };
  }, [trackRecords]);

  // Table columns for timeline view
  const timelineColumns = [
    {
      title: "Goal",
      key: "goal",
      width: 250,
      fixed: 'left' as const,
      render: (_: any, record: GoalTrackRecord) => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Target style={{ fontSize: 14, color: "#1890ff" }} />
            <Text strong>{record.goal.title}</Text>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            KPI: {record.goal.kpi} • Target: {record.goal.target}
          </Text>
          {record.linkedKRA && (
            <div style={{ marginTop: 4 }}>
              <Tag color="blue" style={{ fontSize: 11 }}>
                KRA: {typeof record.linkedKRA === 'object' && 'title' in record.linkedKRA 
                  ? record.linkedKRA.title 
                  : 'Linked'}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Employee",
      key: "employee",
      width: 180,
      render: (_: any, record: GoalTrackRecord) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar size={32} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.employee?.name || "N/A"}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.employee?.employeeId || "N/A"} • {record.employee?.department || "N/A"}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Created",
      key: "created",
      width: 120,
      sorter: (a: GoalTrackRecord, b: GoalTrackRecord) => 
        a.createdDate.getTime() - b.createdDate.getTime(),
      render: (_: any, record: GoalTrackRecord) => (
        <div>
          <Text style={{ fontSize: 12 }}>
            {format(record.createdDate, "MMM dd, yyyy")}
          </Text>
          <div style={{ fontSize: 11, color: "#8c8c8c" }}>
            {format(record.createdDate, "h:mm a")}
          </div>
        </div>
      ),
    },
    {
      title: "Timeline",
      key: "timeline",
      width: 150,
      render: (_: any, record: GoalTrackRecord) => (
        <div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <Text type="secondary">Expected: </Text>
            <Text strong>{record.expectedDuration} days</Text>
          </div>
          {record.duration ? (
            <div style={{ fontSize: 12 }}>
              <Text type="secondary">Actual: </Text>
              <Text strong>{record.duration} days</Text>
            </div>
          ) : (
            <Text type="secondary" style={{ fontSize: 11 }}>
              In progress
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "KPI Score",
      key: "kpiScore",
      width: 120,
      sorter: (a: GoalTrackRecord, b: GoalTrackRecord) => 
        (a.kpiScore || 0) - (b.kpiScore || 0),
      render: (_: any, record: GoalTrackRecord) => (
        <div>
          <Progress
            type="circle"
            percent={record.kpiScore || 0}
            size={50}
            strokeColor={record.kpiScore && record.kpiScore >= 80 ? "#52c41a" : record.kpiScore && record.kpiScore >= 60 ? "#1890ff" : "#ff4d4f"}
          />
        </div>
      ),
    },
    {
      title: "Completion",
      key: "completion",
      width: 180,
      render: (_: any, record: GoalTrackRecord) => {
        if (record.completionDate) {
          return (
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                {format(record.completionDate, "MMM dd, yyyy")}
              </div>
              <Tag
                color={
                  record.speedStatus === "early"
                    ? "green"
                    : record.speedStatus === "ontime"
                    ? "blue"
                    : "red"
                }
                style={{ fontSize: 11 }}
              >
                {record.speedStatus === "early" && (
                  <>
                    <Zap style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
                    Early ({record.completionSpeed.toFixed(0)}%)
                  </>
                )}
                {record.speedStatus === "ontime" && (
                  <>
                    <Clock style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
                    On Time
                  </>
                )}
                {record.speedStatus === "late" && (
                  <>
                    <AlertCircle style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
                    Late
                  </>
                )}
              </Tag>
            </div>
          );
        }
        return (
          <div>
            <Progress
              percent={record.goal.progress}
              size="small"
              status={record.speedStatus === "overdue" ? "exception" : "active"}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.goal.progress}% complete
            </Text>
            {record.speedStatus === "overdue" && (
              <Tag color="orange" style={{ fontSize: 11, marginTop: 4 }}>
                Overdue
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_: any, record: GoalTrackRecord) => {
        const statusColors: Record<string, string> = {
          completed: "green",
          approved: "blue",
          pending: "orange",
          rejected: "red",
          modified: "gold",
        };
        return (
          <Tag color={statusColors[record.goal.status] || "default"}>
            {record.goal.status.charAt(0).toUpperCase() + record.goal.status.slice(1)}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: GoalTrackRecord) => (
        <Button
          type="link"
          size="small"
          icon={<ExternalLink style={{ fontSize: 12 }} />}
          onClick={() => navigate(`/pms/goals/${record.goal._id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <MainLayout>
      <div style={{ padding: 24 }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              KRA / KPI Track Record
            </Title>
            <Text type="secondary">
              Industry-standard performance tracking based on goal creation and completion timeline
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                type={viewMode === "timeline" ? "primary" : "default"}
                icon={<HistoryOutlined />}
                onClick={() => {
                  setViewMode("timeline");
                  setPage(1);
                }}
              >
                Timeline View
              </Button>
              <Button
                type={viewMode === "employee" ? "primary" : "default"}
                icon={<TeamOutlined />}
                onClick={() => {
                  setViewMode("employee");
                  setPage(1);
                }}
              >
                Employee View
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Statistics Cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Goals"
                value={stats.total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Completed"
                value={stats.completed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
                suffix={`(${stats.completionRate}%)`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Avg KPI Score"
                value={stats.avgKpiScore}
                prefix={<Award style={{ width: 16, height: 16 }} />}
                valueStyle={{ color: "#722ed1" }}
                suffix="/100"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="On-Time Rate"
                value={stats.onTimeRate}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: "#1890ff" }}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>

        {/* Performance Breakdown */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} md={12}>
            <Card title="Completion Speed Breakdown">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Early"
                    value={stats.early}
                    valueStyle={{ color: "#52c41a" }}
                    prefix={<Zap style={{ width: 16, height: 16 }} />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="On Time"
                    value={stats.onTime}
                    valueStyle={{ color: "#1890ff" }}
                    prefix={<Clock style={{ width: 16, height: 16 }} />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Late"
                    value={stats.late}
                    valueStyle={{ color: "#ff4d4f" }}
                    prefix={<AlertCircle style={{ width: 16, height: 16 }} />}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Status Overview">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="In Progress"
                    value={stats.inProgress}
                    valueStyle={{ color: "#faad14" }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Avg Duration"
                    value={stats.avgDuration}
                    valueStyle={{ color: "#722ed1" }}
                    suffix="days"
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Search
                placeholder="Search goals, employees, KPI..."
                allowClear
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={(value) => setSearchTerm(value)}
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Select
                style={{ width: "100%" }}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                options={[
                  { label: "All Status", value: "all" },
                  { label: "Completed", value: "completed" },
                  { label: "Approved", value: "approved" },
                  { label: "Pending", value: "pending" },
                ]}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <RangePicker
                style={{ width: "100%" }}
                onChange={(dates) => {
                  setDateRange(dates as any);
                  setPage(1);
                }}
                format="MMM DD, YYYY"
              />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setDateRange(null);
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Content based on view mode */}
        {viewMode === "timeline" ? (
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                setActiveTab(key);
                setPage(1);
              }}
              items={[
                {
                  key: "all",
                  label: `All Goals (${filteredRecords.length})`,
                  children: (
                    <>
                      <Table
                        columns={timelineColumns}
                        dataSource={paginatedRecords}
                        rowKey={(record) => record.goal._id}
                        loading={goalsLoading}
                        pagination={{
                          current: page,
                          pageSize: pageSize,
                          total: filteredRecords.length,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} goals`,
                          pageSizeOptions: ['10', '20', '50', '100'],
                          onChange: (newPage, newPageSize) => {
                            setPage(newPage);
                            if (newPageSize !== pageSize) {
                              setPageSize(newPageSize);
                              setPage(1);
                            }
                          },
                        }}
                        scroll={{ x: 1400 }}
                      />
                    </>
                  ),
                },
                {
                  key: "completed",
                  label: `Completed (${trackRecords.filter((r) => r.completionDate).length})`,
                  children: (
                    <Table
                      columns={timelineColumns}
                      dataSource={paginatedRecords}
                      rowKey={(record) => record.goal._id}
                      pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: filteredRecords.length,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                          `${range[0]}-${range[1]} of ${total} goals`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        onChange: (newPage, newPageSize) => {
                          setPage(newPage);
                          if (newPageSize !== pageSize) {
                            setPageSize(newPageSize);
                            setPage(1);
                          }
                        },
                      }}
                      scroll={{ x: 1400 }}
                    />
                  ),
                },
                {
                  key: "inprogress",
                  label: `In Progress (${stats.inProgress})`,
                  children: (
                    <Table
                      columns={timelineColumns}
                      dataSource={paginatedRecords}
                      rowKey={(record) => record.goal._id}
                      pagination={{
                        current: page,
                        pageSize: pageSize,
                        total: filteredRecords.length,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                          `${range[0]}-${range[1]} of ${total} goals`,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        onChange: (newPage, newPageSize) => {
                          setPage(newPage);
                          if (newPageSize !== pageSize) {
                            setPageSize(newPageSize);
                            setPage(1);
                          }
                        },
                      }}
                      scroll={{ x: 1400 }}
                    />
                  ),
                },
              ]}
            />
          </Card>
        ) : (
          <Card>
            {paginatedEmployees.length === 0 ? (
              <Empty description="No employee data found" />
            ) : (
              <Collapse
                activeKey={Array.from(expandedEmployees)}
                onChange={(keys) => setExpandedEmployees(new Set(keys as string[]))}
              >
                {paginatedEmployees.map((emp) => (
                  <Panel
                    key={emp.employee?._id || "unknown"}
                    header={
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Avatar size={40} icon={<UserOutlined />} />
                          <div>
                            <Text strong style={{ fontSize: 16 }}>
                              {emp.employee?.name || "Unknown Employee"}
                            </Text>
                            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                              {emp.employee?.employeeId || "N/A"} • {emp.employee?.department || "N/A"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 24, marginRight: 24 }}>
                          <Statistic
                            title="KPI Score"
                            value={emp.averageKpiScore}
                            suffix="/100"
                            valueStyle={{ color: emp.averageKpiScore >= 80 ? "#52c41a" : emp.averageKpiScore >= 60 ? "#1890ff" : "#ff4d4f", fontSize: 18 }}
                          />
                          <Statistic
                            title="Completion Rate"
                            value={emp.completionRate}
                            suffix="%"
                            valueStyle={{ color: "#1890ff", fontSize: 18 }}
                          />
                          <Statistic
                            title="On-Time Rate"
                            value={emp.onTimeRate}
                            suffix="%"
                            valueStyle={{ color: "#52c41a", fontSize: 18 }}
                          />
                        </div>
                      </div>
                    }
                  >
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col span={6}>
                        <Statistic title="Total Goals" value={emp.totalGoals} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Completed" value={emp.completedGoals} valueStyle={{ color: "#52c41a" }} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="In Progress" value={emp.inProgressGoals} valueStyle={{ color: "#faad14" }} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="Avg Duration" value={emp.averageDuration} suffix="days" />
                      </Col>
                    </Row>
                    <Table
                      columns={timelineColumns.filter(col => col.key !== "employee")}
                      dataSource={emp.records}
                      rowKey={(record) => record.goal._id}
                      pagination={false}
                      size="small"
                      scroll={{ x: 1200 }}
                    />
                  </Panel>
                ))}
              </Collapse>
            )}
            {/* Pagination for employee view */}
            {employeePerformance.length > 0 && (
              <div style={{ marginTop: 24, textAlign: "right" }}>
                <Select
                  value={pageSize.toString()}
                  onChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                  style={{ width: 120, marginRight: 16 }}
                  options={[10, 20, 50, 100].map((size) => ({
                    label: `${size} per page`,
                    value: size.toString(),
                  }))}
                />
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{ marginRight: 8 }}
                >
                  Previous
                </Button>
                <span style={{ margin: "0 16px" }}>
                  Page {page} of {Math.ceil(employeePerformance.length / pageSize)}
                </span>
                <Button
                  disabled={page >= Math.ceil(employeePerformance.length / pageSize)}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default KRAKPI;
