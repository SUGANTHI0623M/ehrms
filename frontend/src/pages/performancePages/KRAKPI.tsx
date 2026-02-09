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
  Slider,
  Avatar,
  Dropdown,
  MenuProps,
  Typography,
  Collapse,
  Tooltip,
  Drawer,
  Form,
  Radio,
  DatePicker,
  Divider,
} from "antd";
import {
  PlusOutlined,
  FilterOutlined,
  MoreOutlined,
  UserOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useGetKRAsQuery, useCreateKRAMutation } from "@/store/api/kraApi";
import { format } from "date-fns";

const { Search } = Input;
const { Text, Title } = Typography;
const { Panel } = Collapse;
const { RangePicker } = DatePicker;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type KraStatus = "Pending" | "At risk" | "Needs attention" | "On track" | "Closed";

const kraStatusColor: Record<KraStatus, string> = {
  Pending: "orange",
  "At risk": "red",
  "Needs attention": "gold",
  "On track": "green",
  Closed: "blue",
};

const stageStatusColor: Record<string, "default" | "success" | "warning" | "error"> = {
  "In progress": "warning",
  Completed: "success",
};

/* ------------------------------------------------------------------ */
/* AddKRA Drawer Component                                             */
/* ------------------------------------------------------------------ */
interface AddKraDrawerProps {
  open: boolean;
  onClose: () => void;
}

const AddKraDrawer: React.FC<AddKraDrawerProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();

  return (
    <Drawer
      title="Add KRA"
      placement="right"
      width={640}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="What do you want to achieve?"
          name="title"
          rules={[{ required: true, message: "Please enter KRA title" }]}
        >
          <Input placeholder="Eg: Improve customer satisfaction" />
        </Form.Item>

        <Form.Item label="Add description (Optional)" name="description">
          <Input.TextArea rows={3} placeholder="Description" />
        </Form.Item>

        <Divider />
        <Title level={5}>KRA details</Title>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Type" name="type" initialValue="Individual">
              <Radio.Group>
                <Radio.Button value="Individual">Individual</Radio.Button>
                <Radio.Button value="Team">Team</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Owner" name="owner" initialValue="Lakshmi">
              <Select
                options={[
                  { label: "Lakshmi Kumari", value: "Lakshmi" },
                  { label: "Rahul Sharma", value: "Rahul" },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Timeframe" name="timeframe">
              <Select
                placeholder="Select timeframe"
                options={[
                  { label: "2024", value: "2024" },
                  { label: "2025", value: "2025" },
                ]}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Start and end date" name="dateRange">
              <RangePicker format="DD MMM YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Progress metric type" name="metricType" initialValue="Percentage">
              <Select
                options={[
                  { label: "Percentage", value: "Percentage" },
                  { label: "Number", value: "Number" },
                  { label: "Currency", value: "Currency" },
                ]}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Target is to increase from">
              <Input.Group compact>
                <Input style={{ width: "45%" }} placeholder="0" />
                <Input style={{ width: "10%", borderLeft: 0, borderRight: 0 }} disabled value="to" />
                <Input style={{ width: "45%" }} placeholder="100" />
              </Input.Group>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Add metric name (Optional)" name="metricName">
          <Input placeholder="Eg: Leads Generated" />
        </Form.Item>

        <Divider />

        <Form.Item label="More details" name="moreDetails">
          <Input.TextArea placeholder="Additional details" />
        </Form.Item>

        <Divider />

        <Title level={5}>Alignment</Title>
        <Form.Item name="alignment">
          <Input.TextArea placeholder="Align to company / team goals" />
        </Form.Item>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <Button onClick={onClose}>Save as draft</Button>
          <Button type="primary" onClick={onClose}>
            Publish
          </Button>
        </div>
      </Form>
    </Drawer>
  );
};

/* ------------------------------------------------------------------ */
/* MAIN PAGE                                                           */
/* ------------------------------------------------------------------ */
const KRAKPI: React.FC = () => {
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [activeTab, setActiveTab] = useState("Me");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<KraStatus | "All">("All");

  const { data: krasData, isLoading } = useGetKRAsQuery({
    status: statusFilter === "All" ? undefined : statusFilter,
    page: 1,
    limit: 50
  });
  const [createKRA] = useCreateKRAMutation();

  const apiKras = krasData?.data?.kras || [];
  
  // Transform API data to match component structure
  const filteredKras = useMemo(
    () => {
      const transformed = apiKras.map((k) => ({
        id: k._id,
        title: k.title,
        kpiCount: 1,
        taskCount: k.milestones?.length || 0,
        weight: 0,
        status: k.status as KraStatus,
        type: k.timeframe,
        ownerName: k.employeeId?.name || "Unassigned",
        dueDate: new Date(k.endDate).toLocaleDateString(),
        minValue: 0,
        maxValue: 100,
        currentValue: k.overallPercent,
        unitLabel: "%",
        overallPercent: k.overallPercent,
        stageStatusLabel: k.status,
        timeframeLabel: k.timeframe
      }));

      return transformed.filter((k) => {
        const matchSearch =
          !search || k.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "All" || k.status === statusFilter;
        return matchSearch && matchStatus;
      });
    },
    [apiKras, search, statusFilter]
  );

  const groupedByTimeframe = useMemo(() => {
    const groups: Record<string, KRAItem[]> = {};
    filteredKras.forEach((k) => {
      if (!groups[k.timeframeLabel]) groups[k.timeframeLabel] = [];
      groups[k.timeframeLabel].push(k);
    });
    return groups;
  }, [filteredKras]);

  const avgProgress = useMemo(() => {
    if (!filteredKras.length) return 0;
    const sum = filteredKras.reduce((acc, k) => acc + k.overallPercent, 0);
    return +(sum / filteredKras.length).toFixed(2);
  }, [filteredKras]);

  const statusCounts = useMemo(() => {
    const counts: Record<KraStatus, number> = {
      Pending: 0,
      "At risk": 0,
      "Needs attention": 0,
      "On track": 0,
      Closed: 0,
    };
    filteredKras.forEach((k) => (counts[k.status] += 1));
    return counts;
  }, [filteredKras]);

  const menuItems: MenuProps["items"] = [
    { key: "edit", label: "Edit" },
    { key: "delete", label: "Delete" },
    { key: "publish", label: "Publish" },
  ];

  return (
    <MainLayout>
      <div style={{ padding: 24 }}>

        {/* HEADER WITH TABS + FILTER BUTTON + ADD KRA */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space size={12}>
              <h2 className="text-2xl font-bold">KRA / KPIs</h2>
              <Select
                size="middle"
                defaultValue="all"
                options={[
                  { label: "All timeframes", value: "all" },
                  { label: "2024", value: "2024" },
                  { label: "2025", value: "2025" },
                ]}
              />
            </Space>
          </Col>

          <Col>
            <Space size={12}>
              {/* CUSTOM TABS */}
              <Space size={28} style={{ fontSize: 14 }}>
                {["Me", "My Team", "Department"].map((tab) => (
                  <div
                    key={tab}
                    style={{
                      cursor: "pointer",
                      borderBottom:
                        activeTab === tab ? "2px solid #1DA54F" : "2px solid transparent",
                      paddingBottom: 4,
                    }}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </div>
                ))}
              </Space>

              {/* Filter Toggle */}
              <Button onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? "Hide Filter" : "Filter"}
              </Button>

              {/* Add KRA */}
              <Button type="primary" style={{ backgroundColor: "#1DA54F" }} icon={<PlusOutlined />} onClick={() => setAddDrawerOpen(true)}>
                Add KRA
              </Button>
            </Space>
          </Col>
        </Row>

        {/* FILTER CARD - Visible only when showFilters === true */}
        {showFilters && (
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={5}>
                <Text>KRA Type</Text>
                <Select mode="multiple" style={{ width: "100%" }} placeholder="3 selected" />
              </Col>

              <Col xs={24} sm={12} md={5}>
                <Text>Status</Text>
                <Select
                  style={{ width: "100%" }}
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as any)}
                  options={[
                    { label: "All", value: "All" },
                    ...Object.keys(kraStatusColor).map((s) => ({
                      label: s,
                      value: s,
                    })),
                  ]}
                />
              </Col>

              <Col xs={24} sm={12} md={5}>
                <Text>Tags</Text>
                <Select mode="multiple" allowClear style={{ width: "100%" }} placeholder="Select" />
              </Col>

              <Col xs={24} sm={12} md={7}>
                <Text>Search</Text>
                <Search
                  placeholder="Search KRA, owner, etc."
                  allowClear
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* ANALYTICS CARDS */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12}>
            <Card>
              <Text type="secondary">Average progress</Text>
              <Row align="middle">
                <Col span={8}>
                  <Title level={3}>{avgProgress}%</Title>
                </Col>
                <Col span={16}>
                  <div
                    style={{
                      height: 70,
                      background: "#f5f5f5",
                      borderRadius: 8,
                      marginTop: 6,
                    }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card>
              <Text strong>KRA by status</Text>
              <div style={{ marginTop: 8 }}>
                {(Object.keys(statusCounts) as KraStatus[]).map((s) => (
                  <div key={s} style={{ marginBottom: 4 }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: kraStatusColor[s],
                        marginRight: 8,
                      }}
                    />
                    {s} &nbsp;
                    <Text type="secondary">({statusCounts[s]})</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>

        {/* KRA LIST */}
        {isLoading ? (
          <Card>
            <div style={{ textAlign: "center", padding: 40 }}>
              <Text type="secondary">Loading KRAs...</Text>
            </div>
          </Card>
        ) : Object.keys(groupedByTimeframe).length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: 40 }}>
              <Text type="secondary">No KRAs found</Text>
            </div>
          </Card>
        ) : (
          <Collapse defaultActiveKey={Object.keys(groupedByTimeframe)} ghost>
            {Object.entries(groupedByTimeframe).map(([timeframe, items]) => {
            const avg = items.reduce((a, b) => a + b.overallPercent, 0) / items.length;
            return (
              <Panel
                key={timeframe}
                header={
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Text strong>{timeframe}</Text>
                    <div style={{ flex: 1 }}>
                      <Progress percent={Math.round(avg)} showInfo={false} strokeColor="#B37FEB" />
                    </div>
                    <Tooltip title="Overall progress">
                      <ExclamationCircleOutlined style={{ color: "#aaa" }} />
                    </Tooltip>
                    <Button type="link" style={{ color: "#1DA54F" }} size="small">
                      Expand all kras
                    </Button>
                  </div>
                }
              >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                  {items.map((kra) => (
                    <Card key={kra.id} bodyStyle={{ padding: 16 }}>
                      <Row gutter={12} align="middle">
                        <Col xs={2} sm={1}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              border: "1px solid #d9d9d9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            K
                          </div>
                        </Col>

                        <Col xs={22} sm={8}>
                          <Space direction="vertical" size={2}>
                            <Space>
                              <Text strong>{kra.title}</Text>
                              {kra.status === "Pending" && (
                                <Tag color={kraStatusColor[kra.status]}>{kra.status}</Tag>
                              )}
                            </Space>
                            <Text type="secondary">
                              {kra.kpiCount} KPIs | {kra.taskCount} Tasks | {kra.weight}%
                            </Text>
                          </Space>
                        </Col>

                        <Col xs={24} sm={7}>
                          <Space size={12} wrap>
                            <Tag>{kra.type}</Tag>
                            <Space>
                              <Avatar size={28} icon={<UserOutlined />} />
                              <Text>{kra.ownerName}</Text>
                            </Space>
                            <Space>
                              <CalendarOutlined />
                              <Text type="secondary">Due {kra.dueDate}</Text>
                            </Space>
                          </Space>
                        </Col>

                        <Col xs={24} sm={7}>
                          <Space direction="vertical" style={{ width: "100%" }} size={4}>
                            <Space style={{ justifyContent: "space-between", width: "100%" }}>
                              <Text type="secondary">
                                {kra.minValue.toLocaleString()} {kra.unitLabel}
                              </Text>
                              <Text type="secondary">
                                {kra.maxValue.toLocaleString()} {kra.unitLabel}
                              </Text>
                            </Space>
                            <Slider
                              min={kra.minValue}
                              max={kra.maxValue}
                              value={kra.currentValue}
                              tooltip={{ open: false }}
                            />
                            <Space style={{ width: "100%", justifyContent: "space-between" }}>
                              <Text type="secondary">
                                {kra.unitLabel}
                                {kra.currentValue.toLocaleString()}
                              </Text>
                              <Text strong>{kra.overallPercent}%</Text>
                            </Space>
                          </Space>
                        </Col>

                        <Col xs={24} sm={3}>
                          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                            <Tag color={stageStatusColor[kra.stageStatusLabel] || "default"}>
                              {kra.stageStatusLabel}
                            </Tag>
                            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                              <Button type="text" icon={<MoreOutlined />} />
                            </Dropdown>
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </Space>
              </Panel>
            );
          })}
          </Collapse>
        )}

        {/* ADD KRA DRAWER */}
        <AddKraDrawer open={addDrawerOpen} onClose={() => setAddDrawerOpen(false)} />
      </div>
    </MainLayout>
  );
};

export default KRAKPI;
