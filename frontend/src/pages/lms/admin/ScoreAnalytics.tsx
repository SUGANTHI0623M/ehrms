
import React, { useState, useEffect, useRef, useCallback } from "react";
import MainLayout from "@/components/MainLayout";
import { LmsLoadingState } from "@/components/lms/SharedComponents";
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Typography,
  Button,
  Table,
  Tabs,
  Tag,
  Space,
  Progress,
  Tooltip,
  Empty,
  Dropdown,
  Input,
} from "antd";
import {
  TeamOutlined,
  TrophyOutlined,
  WarningOutlined,
  BookOutlined,
  DownloadOutlined,
  UserOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import TrendChart from "./TrendChart";
import { useNavigate } from "react-router-dom";
import { lmsService } from "@/services/lmsService";
import type { MenuProps } from "antd";

const { Title, Text } = Typography;

/** Fixed range for the trend chart so it always ends at current month; user scrolls to see earlier months. Cards still use the duration selector. Use 0 for all time. */
const CHART_TREND_MONTHS: number = 24;
const COLORS = ["#52c41a", "#1890ff", "#fa8c16", "#f5222d"];

const ScoresAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState("courses");
  const [months, setMonths] = useState<number>(6);
  const [courseSearch, setCourseSearch] = useState("");
  const [learnerSearch, setLearnerSearch] = useState("");

  const [systemData, setSystemData] = useState<any>(null);
  const [chartTrendData, setChartTrendData] = useState<{ timeSeries: { name: string; assigned: number; completed: number; avgScore: number }[] } | null>(null);
  const [courseData, setCourseData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);

  const fetchSystem = async () => {
    setLoading(true);
    try {
      const systemRes = await lmsService.getSystemAnalytics({ months });
      const systemPayload = (systemRes as any)?.data ?? systemRes;
      setSystemData(systemPayload?.data ?? systemPayload);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /** Chart trend: fixed long window so chart always ends at current month; duration selector does not change chart data. */
  const fetchChartTrend = async () => {
    try {
      const trendRes = await lmsService.getCourseAssignmentCompletionAnalytics({
        period: "monthly",
        months: CHART_TREND_MONTHS === 0 ? "0" : CHART_TREND_MONTHS,
      });
      const trendPayload = (trendRes as any)?.data ?? trendRes;
      const inner = trendPayload?.data ?? trendPayload;
      setChartTrendData(inner?.timeSeries != null ? { timeSeries: inner.timeSeries } : null);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await lmsService.getCourseLevelAnalytics();
      const payload = res?.data ?? res;
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      setCourseData(list);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await lmsService.getDepartmentAnalytics();
      const payload = res?.data ?? res;
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      setDepartmentData(list);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLearners = async () => {
    try {
      const res = await lmsService.getLearnersList();
      const payload = res?.data ?? res;
      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      setLearners(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSystem();
  }, [months]);

  useEffect(() => {
    fetchChartTrend();
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchLearners();
  }, []);

  // Refetch course-level analytics when user opens Course Performance tab so Avg assessment score stays up to date
  useEffect(() => {
    if (subTab === "courses") {
      fetchCourses();
    }
  }, [subTab]);

  const handleExport = async (type: "learners" | "courses") => {
    try {
      const res = await lmsService.exportAnalytics(type, { months });
      const blob = res instanceof Blob ? res : (res as any)?.data;
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const rangeSuffix =
        months === 0 || months >= 24 ? "-all" : `-last-${months}-months`;
      a.download =
        type === "learners"
          ? `lms-learners-export${rangeSuffix}.csv`
          : `lms-courses-export${rangeSuffix}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const learnerName = (r: any) =>
    `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.email || "—";
  const learnerDept = (r: any) =>
    (typeof r.department === "object" ? r.department?.name : r.department) ||
    "—";

  const exportMenuItems: MenuProps["items"] = [
    {
      key: "learners",
      label: "Export Learners (CSV)",
      icon: <UserOutlined />,
      onClick: () => handleExport("learners"),
    },
    {
      key: "courses",
      label: "Export Courses (CSV)",
      icon: <BookOutlined />,
      onClick: () => handleExport("courses"),
    },
  ];

  const kpi = systemData?.kpi ?? {};
  const trendMonths = chartTrendData?.timeSeries ?? [];
  const scoreDist = systemData?.scoreDist ?? [];

  const topPerformers = learners
    .filter((l: any) => (l.stats?.avgScore ?? 0) > 0)
    .sort(
      (a: any, b: any) => (b.stats?.avgScore ?? 0) - (a.stats?.avgScore ?? 0),
    )
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
    .sort(
      (a: any, b: any) => (a.stats?.avgScore ?? 0) - (b.stats?.avgScore ?? 0),
    )
    .slice(0, 10);

  const filteredCourseData = courseData.filter(
    (c: any) =>
      !courseSearch ||
      (c.title || "").toLowerCase().includes(courseSearch.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(courseSearch.toLowerCase()),
  );
  const filteredLearners = learners.filter(
    (l: any) =>
      !learnerSearch ||
      learnerName(l).toLowerCase().includes(learnerSearch.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(learnerSearch.toLowerCase()) ||
      learnerDept(l).toLowerCase().includes(learnerSearch.toLowerCase()),
  );

  return (
    <MainLayout>
      <div className="lms-page p-4 sm:p-6 max-w-7xl mx-auto overflow-x-hidden">
        <div className="flex flex-col sm:flex-row flex-wrap justify-between items-stretch sm:items-center gap-4 mb-6">
          <div>
            <Title level={3} className="!mb-1 text-lg sm:text-xl">
              Scores & Analytics
            </Title>
            <Text type="secondary" className="text-sm">
              Learning effectiveness, completion rates, and performance metrics
            </Text>
          </div>
          <Space className="w-full sm:w-auto">
            <Select
              value={months}
              onChange={setMonths}
              className="w-full sm:w-[160px] min-h-[44px] sm:min-h-0"
              options={[
                { value: 1, label: "Last month" },
                { value: 3, label: "Last 3 months" },
                { value: 6, label: "Last 6 months" },
                { value: 12, label: "Last 12 months" },
                { value: 24, label: "Last 24 months" },
                { value: 0, label: "All time (all months)" },
              ]}
            />
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
              <Button
                icon={<DownloadOutlined />}
                className="min-h-[44px] sm:min-h-0 w-full sm:w-auto"
              >
                Export
              </Button>
            </Dropdown>
          </Space>
        </div>

        {/* System Overview: KPIs + charts, then sub-tabs */}
        <div className="space-y-6">
          {loading ? (
            <LmsLoadingState minHeight="320px" />
          ) : (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8} lg={8} xl={8} xxl={4}>
                  <Card className="lms-card">
                    <Statistic
                      title="Total Learners"
                      value={kpi.totalEnrollments ?? 0}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8} lg={8} xl={8} xxl={4}>
                  <Card className="lms-card">
                    <Statistic
                      title="Completion Rate"
                      value={kpi.completionRate ?? 0}
                      suffix="%"
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8} lg={8} xl={8} xxl={4}>
                  <Card className="lms-card">
                    <Statistic
                      title="Avg Assessment Score"
                      value={kpi.avgScore ?? 0}
                      suffix="%"
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8} lg={8} xl={8} xxl={4}>
                  <Card className="lms-card">
                    <Statistic
                      title="Pass Rate"
                      value={kpi.passRate ?? 0}
                      suffix="%"
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8} lg={8} xl={8} xxl={4}>
                  <Card className="lms-card">
                    <Statistic
                      title="Active Learners"
                      value={kpi.activeLearnerCount ?? 0}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={8} lg={8} xl={8} xxl={4}>
                  <Card className="lms-card">
                    <Statistic
                      title="Avg Time to Complete"
                      value={kpi.avgTimeToCompleteDays ?? 0}
                      suffix="days"
                    />
                  </Card>
                </Col>
              </Row>
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                  <Card className="lms-card">
                    {!trendMonths || trendMonths.length === 0 ? (
                      <div className="flex items-center justify-center min-h-[320px] text-gray-400">
                        <Empty
                          description="No trend data for selected period"
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      </div>
                    ) : (
                      <TrendChart
                        title="Trend (Assigned % vs Completed % vs Avg Score)"
                        trendMonths={trendMonths.map((m: any) => ({
                          name: m.name,
                          month: m.name,
                          assigned: m.assigned ?? 0,
                          completed: m.completed ?? 0,
                          avgScore: m.avgScore ?? 0,
                        }))}
                        height={320}
                      />
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card
                    title="Score Distribution"
                    className="lms-card"
                    bodyStyle={{ minHeight: 320 }}
                  >
                    <div style={{ height: 320 }}>
                      {!scoreDist ||
                      scoreDist.length === 0 ||
                      scoreDist.every((d: any) => !d.value) ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <Empty
                            description="No score data yet"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        </div>
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
                              {scoreDist
                                .filter((d: any) => d.value > 0)
                                .map((entry: any, i: number) => (
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
          <Card className="lms-card" bodyStyle={{ paddingTop: 16 }}>
            <Tabs
              activeKey={subTab}
              onChange={setSubTab}
              size="middle"
              items={[
                {
                  key: "courses",
                  label: (
                    <span>
                      <BookOutlined /> Course Performance
                    </span>
                  ),
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
                          rowKey={(r: any) =>
                            String(
                              r.courseId?._id ??
                                r.courseId ??
                                r.title ??
                                Math.random(),
                            )
                          }
                          pagination={{ pageSize: 10, showSizeChanger: true }}
                          showSorterTooltip={false}
                          tableLayout="fixed"
                          className="scores-course-table"
                          columns={[
                            {
                              title: "Course",
                              dataIndex: "title",
                              key: "title",
                              ellipsis: true,
                              width: "15%",
                              sorter: (a: any, b: any) =>
                                (a.title || "").localeCompare(b.title || ""),
                              render: (t: string, r: any) => (
                                <span className="font-medium">{t ?? "—"}</span>
                              ),
                            },
                            {
                              title: "Category",
                              dataIndex: "category",
                              key: "category",
                              width: "15%",
                              sorter: (a: any, b: any) =>
                                (a.category || "").localeCompare(
                                  b.category || "",
                                ),
                              render: (v: string) => v ?? "—",
                            },
                            {
                              title: "Assigned",
                              dataIndex: "assigned",
                              key: "assigned",
                              width: "10%",
                              align: "center",
                              sorter: (a: any, b: any) =>
                                (a.assigned ?? 0) - (b.assigned ?? 0),
                              render: (v: number) => v ?? 0,
                            },
                            {
                              title: "Completed",
                              dataIndex: "completed",
                              key: "completed",
                              width: "10%",
                              align: "center",
                              sorter: (a: any, b: any) =>
                                (a.completed ?? 0) - (b.completed ?? 0),
                              render: (v: number) => v ?? 0,
                            },
                            {
                              title: "Completion %",
                              dataIndex: "completionRate",
                              key: "completionRate",
                              width: "12%",
                              sorter: (a: any, b: any) =>
                                (a.completionRate ?? 0) -
                                (b.completionRate ?? 0),
                              render: (v: number) => (
                                <Progress
                                  percent={Number(v) ?? 0}
                                  size="small"
                                  status={
                                    (Number(v) ?? 0) >= 70
                                      ? "success"
                                      : (Number(v) ?? 0) >= 40
                                        ? "active"
                                        : "exception"
                                  }
                                />
                              ),
                            },
                            {
                              title: "Avg Assessment Score",
                              dataIndex: "avgScore",
                              key: "avgScore",
                              width: "12%",
                              align: "center",
                              sorter: (a: any, b: any) =>
                                (a.avgScore ?? 0) - (b.avgScore ?? 0),
                              render: (v: number) => `${v ?? 0}%`,
                            },
                            {
                              title: "Pass Rate",
                              dataIndex: "passRate",
                              key: "passRate",
                              width: "10%",
                              align: "center",
                              sorter: (a: any, b: any) =>
                                (a.passRate ?? 0) - (b.passRate ?? 0),
                              render: (v: number) => `${v ?? 0}%`,
                            },
                            {
                              title: "Avg Days to Complete",
                              dataIndex: "avgTimeToCompleteDays",
                              key: "days",
                              width: "13%",
                              align: "center",
                              sorter: (a: any, b: any) =>
                                (a.avgTimeToCompleteDays ?? 0) -
                                (b.avgTimeToCompleteDays ?? 0),
                              render: (v: number) => v ?? 0,
                            },
                            {
                              key: "action",
                              width: "5%",
                              render: (_: any, r: any) => {
                                const id = r.courseId?._id ?? r.courseId;
                                return id ? (
                                  <Button
                                    type="link"
                                    size="small"
                                    className="min-h-[44px] flex items-center"
                                    onClick={() =>
                                      navigate(`/lms/admin/course/${id}`)
                                    }
                                  >
                                    View
                                  </Button>
                                ) : null;
                              },
                            },
                          ]}
                          locale={{
                            emptyText: <Empty description="No course data" />,
                          }}
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  key: "departments",
                  label: (
                    <span>
                      <TeamOutlined /> Department / Team
                    </span>
                  ),
                  children: (
                    <div className="scores-table-wrapper overflow-x-auto">
                      <Table
                        dataSource={departmentData}
                        rowKey={(r: any) => String(r.department ?? "row")}
                        pagination={{ pageSize: 10, showSizeChanger: true }}
                        showSorterTooltip={false}
                        tableLayout="fixed"
                        className="scores-department-table"
                        columns={[
                          {
                            title: "Department",
                            dataIndex: "department",
                            key: "department",
                            width: "20%",
                            sorter: (a: any, b: any) =>
                              (a.department || "").localeCompare(
                                b.department || "",
                              ),
                            render: (t: string) => (
                              <span className="font-medium">{t ?? "—"}</span>
                            ),
                          },
                          {
                            title: "Learners",
                            dataIndex: "learnerCount",
                            key: "learnerCount",
                            width: "12%",
                            align: "center",
                            sorter: (a: any, b: any) =>
                              (a.learnerCount ?? 0) - (b.learnerCount ?? 0),
                            render: (v: number) => v ?? 0,
                          },
                          {
                            title: "Enrollments",
                            dataIndex: "assignedEnrollments",
                            key: "assignedEnrollments",
                            width: "12%",
                            align: "center",
                            sorter: (a: any, b: any) =>
                              (a.assignedEnrollments ?? 0) -
                              (b.assignedEnrollments ?? 0),
                            render: (v: number) => v ?? 0,
                          },
                          {
                            title: "Completed",
                            dataIndex: "completed",
                            key: "completed",
                            width: "12%",
                            align: "center",
                            sorter: (a: any, b: any) =>
                              (a.completed ?? 0) - (b.completed ?? 0),
                            render: (v: number) => v ?? 0,
                          },
                          {
                            title: "Completion %",
                            dataIndex: "completionRate",
                            key: "completionRate",
                            width: "15%",
                            align: "center",
                            sorter: (a: any, b: any) =>
                              (a.completionRate ?? 0) - (b.completionRate ?? 0),
                            render: (v: number) => (
                              <Progress
                                percent={Number(v) ?? 0}
                                size="small"
                                status={
                                  (Number(v) ?? 0) >= 70 ? "success" : "active"
                                }
                              />
                            ),
                          },
                          {
                            title: "Avg Assessment Score",
                            dataIndex: "avgScore",
                            key: "avgScore",
                            width: "12%",
                            align: "center",
                            sorter: (a: any, b: any) =>
                              (a.avgScore ?? 0) - (b.avgScore ?? 0),
                            render: (v: number) => `${v ?? 0}%`,
                          },
                          {
                            title: "Pass Rate",
                            dataIndex: "passRate",
                            key: "passRate",
                            width: "12%",
                            align: "center",
                            sorter: (a: any, b: any) =>
                              (a.passRate ?? 0) - (b.passRate ?? 0),
                            render: (v: number) => `${v ?? 0}%`,
                          },
                        ]}
                        locale={{
                          emptyText: <Empty description="No department data" />,
                        }}
                      />
                    </div>
                  ),
                },
                {
                  key: "learners",
                  label: (
                    <span>
                      <UserOutlined /> Learners
                    </span>
                  ),
                  children: (
                    <div className="space-y-6">
                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={12}>
                          <Card
                            title={
                              <>
                                <TrophyOutlined className="mr-2" /> Top
                                Performers
                              </>
                            }
                            size="small"
                            className="lms-card"
                          >
                            <Table
                              dataSource={topPerformers}
                              rowKey={(r: any) =>
                                String(r._id ?? Math.random())
                              }
                              pagination={false}
                              size="small"
                              columns={[
                                {
                                  title: "#",
                                  key: "rank",
                                  width: 40,
                                  render: (_: any, __: any, i: number) => i + 1,
                                },
                                {
                                  title: "Learner",
                                  key: "name",
                                  render: (_: any, r: any) => learnerName(r),
                                },
                                {
                                  title: "Dept",
                                  key: "dept",
                                  render: (_: any, r: any) => learnerDept(r),
                                },
                                {
                                  title: "Assessment Score",
                                  key: "score",
                                  width: 90,
                                  align: "center",
                                  render: (_: any, r: any) => (
                                    <Text strong>
                                      {r?.stats?.avgScore ?? 0}%
                                    </Text>
                                  ),
                                },
                                {
                                  key: "action",
                                  width: 80,
                                  render: (_: any, r: any) => (
                                    <Button
                                      type="link"
                                      size="small"
                                      onClick={() =>
                                        navigate(`/lms/learners/${r._id}`)
                                      }
                                    >
                                      View
                                    </Button>
                                  ),
                                },
                              ]}
                              locale={{
                                emptyText: (
                                  <Empty description="No data yet. Assessment scores appear as learners complete assessments." />
                                ),
                              }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                          <Card
                            title={
                              <>
                                <WarningOutlined className="mr-2" /> Needs
                                Attention
                              </>
                            }
                            size="small"
                            className="lms-card"
                          >
                            <Table
                              dataSource={needsAttention}
                              rowKey={(r: any) =>
                                String(r._id ?? Math.random())
                              }
                              pagination={false}
                              size="small"
                              columns={[
                                {
                                  title: "Learner",
                                  key: "name",
                                  render: (_: any, r: any) => learnerName(r),
                                },
                                {
                                  title: "Dept",
                                  key: "dept",
                                  render: (_: any, r: any) => learnerDept(r),
                                },
                                {
                                  title: "Assessment Score",
                                  key: "score",
                                  width: 90,
                                  align: "center",
                                  render: (_: any, r: any) => (
                                    <Text type="danger">
                                      {r?.stats?.avgScore ?? 0}%
                                    </Text>
                                  ),
                                },
                                {
                                  key: "action",
                                  width: 80,
                                  render: (_: any, r: any) => (
                                    <Button
                                      type="link"
                                      size="small"
                                      onClick={() =>
                                        navigate(`/lms/learners/${r._id}`)
                                      }
                                    >
                                      View
                                    </Button>
                                  ),
                                },
                              ]}
                              locale={{
                                emptyText: (
                                  <Empty description="No learners need attention" />
                                ),
                              }}
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
                            <Button
                              type="primary"
                              size="small"
                              onClick={() => navigate("/lms/learners")}
                            >
                              View full list
                            </Button>
                          </Space>
                        }
                        size="small"
                        className="rounded-xl"
                      >
                        <Table
                          dataSource={filteredLearners}
                          rowKey={(r: any) => String(r._id ?? Math.random())}
                          pagination={{ pageSize: 15, showSizeChanger: true }}
                          size="small"
                          columns={[
                            {
                              title: "Name",
                              key: "name",
                              render: (_: any, r: any) => learnerName(r),
                            },
                            {
                              title: "Department",
                              key: "dept",
                              render: (_: any, r: any) => learnerDept(r),
                            },
                            {
                              title: "Assigned",
                              dataIndex: ["stats", "assigned"],
                              key: "assigned",
                              width: 80,
                              render: (v: number) => v ?? 0,
                            },
                            {
                              title: "Completed",
                              dataIndex: ["stats", "completed"],
                              key: "completed",
                              width: 80,
                              render: (v: number) => v ?? 0,
                            },
                            {
                              title: "Avg Assessment Score",
                              key: "score",
                              width: 100,
                              align: "center",
                              render: (_: any, r: any) =>
                                `${r?.stats?.avgScore ?? 0}%`,
                            },
                            {
                              title: "Status",
                              key: "status",
                              width: 100,
                              render: (_: any, r: any) => (
                                <Tag
                                  color={
                                    r?.stats?.status === "Completed"
                                      ? "green"
                                      : r?.stats?.status === "In Progress"
                                        ? "blue"
                                        : "default"
                                  }
                                >
                                  {r?.stats?.status ?? "—"}
                                </Tag>
                              ),
                            },
                            {
                              key: "action",
                              width: 80,
                              render: (_: any, r: any) => (
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() =>
                                    navigate(`/lms/learners/${r._id}`)
                                  }
                                >
                                  View
                                </Button>
                              ),
                            },
                          ]}
                          locale={{
                            emptyText: <Empty description="No learners" />,
                          }}
                        />
                      </Card>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ScoresAnalytics;