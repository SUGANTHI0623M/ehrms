import React, { useState } from "react";
import {
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Card,
  Statistic,
  Row,
  Col,
  Tooltip,
  Typography,
  Empty,
  Modal,
  message,
  Badge,
  Divider,
} from "antd";
import {
  PhoneOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  PhoneFilled,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import { useGetIvrCallLogsQuery } from "@/store/api/exotelApi";
import { format } from "date-fns";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const IvrCallLogsTable = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    type: "all" as "all" | "leads" | "tickets",
    direction: "all" as "all" | "incoming" | "outgoing",
    startDate: null as string | null,
    endDate: null as string | null,
  });
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<{
    url: string;
    callFrom: string;
    callSid: string;
  } | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Fetch logs with filters
  const { data, isLoading, isFetching } = useGetIvrCallLogsQuery({
    page,
    limit,
    type: filters.type !== "all" ? filters.type : undefined,
    direction: filters.direction !== "all" ? filters.direction : undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        startDate: dates[0].format("YYYY-MM-DD"),
        endDate: dates[1].format("YYYY-MM-DD"),
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        startDate: null,
        endDate: null,
      }));
    }
    setPage(1);
  };

  // Fetch audio with authentication
  const handlePlayRecording = async (callSid: string, callFrom: string) => {
    setLoadingAudio(true);
    setAudioModalVisible(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
      const response = await fetch(
        `${apiUrl}/integrations/exotel/recording/${callSid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 410) {
        message.warning(
          "This call recording has expired or is unavailable. Please refresh the logs or try again later."
        );
        setAudioModalVisible(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch recording: ${response.status}`);
      }

      const blob = await response.blob();

      if (blob.size < 1024) {
        message.warning("Recording seems empty or invalid.");
        setAudioModalVisible(false);
        return;
      }

      const audioUrl = URL.createObjectURL(blob);

      setCurrentAudio({
        url: audioUrl,
        callFrom,
        callSid,
      });
    } catch (error) {
      console.error("Error loading audio:", error);
      message.error("Unable to load the call recording.");
      setAudioModalVisible(false);
    } finally {
      setLoadingAudio(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const columns = [
    {
      title: "S.No.",
      key: "index",
      width: 70,
      fixed: "left" as const,
      render: (_: any, __: any, index: number) => (
        <div
          style={{
            fontWeight: 600,
            color: "#8c8c8c",
            fontSize: "13px",
          }}
        >
          {(page - 1) * limit + index + 1}
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type: string) => (
        <Tag
          color={type === "leads" ? "success" : "processing"}
          style={{
            borderRadius: "6px",
            fontWeight: 500,
            fontSize: "12px",
            padding: "2px 10px",
            border: "none",
          }}
        >
          {type === "leads" ? "Lead" : "Ticket"}
        </Tag>
      ),
    },
    {
      title: "Direction",
      dataIndex: "direction",
      key: "direction",
      width: 130,
      render: (direction: string) => (
        <Tag
          icon={direction === "incoming" ? <FallOutlined /> : <RiseOutlined />}
          color={direction === "incoming" ? "cyan" : "orange"}
          style={{
            borderRadius: "6px",
            fontWeight: 500,
            fontSize: "12px",
            padding: "4px 12px",
            border: "none",
          }}
        >
          {direction === "incoming" ? "Incoming" : "Outgoing"}
        </Tag>
      ),
    },
    {
      title: "From",
      dataIndex: "callFrom",
      key: "callFrom",
      width: 150,
      render: (callFrom: string) => (
        <Space>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PhoneFilled style={{ fontSize: 18, color: "#1ea443" }} />
          </div>
          <Text strong style={{ fontSize: "14px" }}>
            {callFrom ? callFrom.slice(1) : "N/A"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Attended By",
      key: "attendedBy",
      dataIndex: "dialWhomNumber",
      width: 150,
      render: (_: any, record: any) => {
        // ✅ choose correct attended number
        const attendedNumber =
          record.dialWhomNumber && record.dialWhomNumber !== "N/A"
            ? record.dialWhomNumber
            : record.attendedBy && record.attendedBy !== "N/A"
              ? record.attendedBy
              : record.callTo || "N/A";

        // ✅ clean formatting
        const formattedNumber =
          attendedNumber && attendedNumber !== "N/A"
            ? attendedNumber.toString().replace(/^\+?0?/, "") // remove '+' or leading 0
            : "N/A";

        return (
          <Space>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f0fff4",
              }}
            >
              <UserOutlined style={{ color: "#1ea443", fontSize: 18 }} />
            </div>
            <Text style={{ fontSize: 13, fontWeight: "bold", color: "#333" }}>
              {formattedNumber !== "N/A" ? formattedNumber : "N/A"}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Duration",
      dataIndex: "callDuration",
      key: "callDuration",
      width: 120,
      render: (duration: number) => (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            background: "#fff7e6",
            borderRadius: "8px",
            border: "none",
          }}
        >
          <ClockCircleOutlined style={{ color: "#faad14", fontSize: 14 }} />
          <Text strong style={{ color: "#d48806", fontSize: "13px" }}>
            {formatDuration(parseInt(String(duration || 0)))}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "callStatus",
      key: "callStatus",
      width: 140,
      render: (status: string, record: any) => {
        const isSuccess = record.result?.success;
        return (
          <Space direction='vertical' size={4}>
            <Tag
              icon={
                status === "completed" ? (
                  <CheckCircleOutlined />
                ) : (
                  <SyncOutlined spin />
                )
              }
              color={status === "completed" ? "success" : "default"}
              style={{
                borderRadius: "6px",
                fontWeight: 500,
                fontSize: "12px",
                padding: "4px 12px",
                border: "none",
              }}
            >
              {status || "Unknown"}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: "Date & Time",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => (
        <div style={{ fontSize: "13px" }}>
          <div style={{ fontWeight: 500, color: "#262626" }}>
            {format(new Date(date), "MMM dd, yyyy")}
          </div>
          <Text type='secondary' style={{ fontSize: "12px" }}>
            {format(new Date(date), "HH:mm:ss")}
          </Text>
        </div>
      ),
    },
    {
      title: "Recording",
      dataIndex: "callSid",
      key: "recording",
      width: 130,
      fixed: "right" as const,
      render: (callSid: string, record: any) =>
        record.recordingUrl ? (
          <Button
            type='primary'
            size='middle'
            icon={<PlayCircleOutlined />}
            onClick={() => handlePlayRecording(callSid, record.callFrom)}
            style={{
              borderRadius: "8px",
              fontWeight: 500,
              boxShadow: "0 2px 8px rgba(24, 144, 255, 0.2)",
            }}
          >
            Play
          </Button>
        ) : (
          <Text type='secondary' style={{ fontSize: "12px" }}>
            No recording
          </Text>
        ),
    },
  ];

  return (
    <div
      style={{
        padding: "24px",
        minHeight: "100vh",
      }}
    >
      {/* Header Section */}
      <div style={{ marginBottom: 24 }}>
        <Title
          level={2}
          style={{
            margin: 0,
            WebkitBackgroundClip: "text",
            fontWeight: 700,
            color: "#5f5c5cff",
            fontSize: "25px",
          }}
        >
          IVR Call Management
        </Title>
        <Text type='secondary' style={{ fontSize: "14px" }}>
          Monitor and analyze your call center performance
        </Text>
      </div>

      {/* Filters */}
      <Card
        bordered={false}
        style={{
          marginBottom: 24,
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
        bodyStyle={{ padding: "20px 24px" }}
      >
        <Space size='middle' wrap style={{ width: "100%" }}>
          <div>
            <Text
              strong
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: "13px",
                color: "#8c8c8c",
              }}
            >
              Type
            </Text>
            <Select
              style={{ width: 160, borderRadius: "8px" }}
              value={filters.type}
              onChange={value => handleFilterChange("type", value)}
              size='large'
            >
              <Select.Option value='all'>All Types</Select.Option>
              <Select.Option value='leads'>Leads</Select.Option>
              <Select.Option value='tickets'>Tickets</Select.Option>
            </Select>
          </div>

          <div>
            <Text
              strong
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: "13px",
                color: "#8c8c8c",
              }}
            >
              Direction
            </Text>
            <Select
              style={{ width: 160, borderRadius: "8px" }}
              value={filters.direction}
              onChange={value => handleFilterChange("direction", value)}
              size='large'
            >
              <Select.Option value='all'>All Directions</Select.Option>
              <Select.Option value='incoming'>Incoming</Select.Option>
              <Select.Option value='outgoing'>Outgoing</Select.Option>
            </Select>
          </div>

          <div>
            <Text
              strong
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: "13px",
                color: "#8c8c8c",
              }}
            >
              Date Range
            </Text>
            <RangePicker
              style={{ borderRadius: "8px" }}
              format='YYYY-MM-DD'
              onChange={handleDateRangeChange}
              placeholder={["Start Date", "End Date"]}
              size='large'
            />
          </div>
        </Space>
      </Card>

      {/* Statistics Cards */}
      {data?.stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              style={{
                borderRadius: "16px",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              bodyStyle={{ padding: "24px" }}
            >
              <Statistic
                title={
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#666",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Total Calls
                  </span>
                }
                value={data.stats.totalCalls}
                valueStyle={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "var(--primary-color)",
                  marginTop: "8px",
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              style={{
                borderRadius: "16px",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              bodyStyle={{ padding: "24px" }}
            >
              <Statistic
                title={
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#666",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Completed
                  </span>
                }
                value={data.stats.completedCalls}
                valueStyle={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "var(--primary-color)",
                  marginTop: "8px",
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              style={{
                borderRadius: "16px",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              bodyStyle={{ padding: "24px" }}
            >
              <Statistic
                title={
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#666",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Lead Calls
                  </span>
                }
                value={data.stats.leadCalls}
                valueStyle={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "var(--primary-color)",
                  marginTop: "8px",
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              style={{
                borderRadius: "16px",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              bodyStyle={{ padding: "24px" }}
            >
              <Statistic
                title={
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#666",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Ticket Calls
                  </span>
                }
                value={data.stats.ticketCalls}
                valueStyle={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "var(--primary-color)",
                  marginTop: "8px",
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Call Logs Table */}
      <Card
        bordered={false}
        style={{
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
        title={
          <Space>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                background:
                  "linear-gradient(135deg, #f4f8f6ff 0%, #f2faf0ff 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PhoneFilled
                style={{ fontSize: 20, color: "var(--primary-color)" }}
              />
            </div>
            <div>
              <Title
                level={4}
                style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}
              >
                Call Logs
              </Title>
            </div>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey='_id'
          loading={isLoading || isFetching}
          pagination={{
            current: page,
            pageSize: limit,
            total: data?.pagination?.totalCount || 0,
            onChange: newPage => setPage(newPage),
            showSizeChanger: false,
            showTotal: total => `Total ${total} calls`,
            style: { marginTop: 24 },
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                description='No call logs found'
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          rowClassName={(record, index) =>
            index % 2 === 0 ? "table-row-light" : "table-row-dark"
          }
        />
      </Card>

      {/* Audio Player Modal */}
      <Modal
        title={
          <Space>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PlayCircleOutlined style={{ color: "#fff", fontSize: 20 }} />
            </div>
            <span style={{ fontSize: "18px", fontWeight: 600 }}>
              Call Recording
            </span>
          </Space>
        }
        open={audioModalVisible}
        onCancel={() => {
          setAudioModalVisible(false);
          if (currentAudio?.url) {
            URL.revokeObjectURL(currentAudio.url);
          }
          setCurrentAudio(null);
        }}
        footer={null}
        width={600}
        style={{ borderRadius: "16px" }}
      >
        {loadingAudio ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Space direction='vertical' size={16}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  margin: "0 auto",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SyncOutlined spin style={{ fontSize: 40, color: "#fff" }} />
              </div>
              <Text style={{ fontSize: "16px", fontWeight: 500 }}>
                Loading recording...
              </Text>
            </Space>
          </div>
        ) : currentAudio ? (
          <div style={{ padding: "8px 0" }}>
            <Card
              bordered={false}
              style={{
                background: "#f5f5f5",
                borderRadius: "12px",
                marginBottom: 20,
              }}
            >
              <Space direction='vertical' size={12} style={{ width: "100%" }}>
                <div>
                  <Text strong style={{ color: "#8c8c8c", fontSize: "12px" }}>
                    Call SID
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: "14px", fontFamily: "monospace" }}>
                      {currentAudio.callSid}
                    </Text>
                  </div>
                </div>
                <Divider style={{ margin: "8px 0" }} />
                <div>
                  <Text strong style={{ color: "#8c8c8c", fontSize: "12px" }}>
                    From
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Space>
                      <PhoneFilled style={{ color: "#1890ff" }} />
                      <Text strong style={{ fontSize: "14px" }}>
                        {currentAudio.callFrom}
                      </Text>
                    </Space>
                  </div>
                </div>
              </Space>
            </Card>

            <div
              style={{
                padding: "24px",
                background:
                  "linear-gradient(135deg, #24d17aff 0%, #25c232ff 100%)",
                borderRadius: "12px",
                marginBottom: 16,
              }}
            >
              <audio
                controls
                style={{ width: "100%" }}
                src={currentAudio.url}
                autoPlay
              >
                Your browser does not support the audio element.
              </audio>
            </div>

            <Button
              type='primary'
              size='large'
              icon={<DownloadOutlined />}
              href={currentAudio.url}
              download={`recording-${currentAudio.callSid}.mp3`}
              block
              style={{
                height: 48,
                borderRadius: "10px",
                fontWeight: 500,
                fontSize: "15px",
                boxShadow: "0 4px 12px rgba(24, 144, 255, 0.3)",
              }}
            >
              Download Recording
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default IvrCallLogsTable;

