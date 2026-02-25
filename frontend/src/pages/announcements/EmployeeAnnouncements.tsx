import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import {
  Card,
  Table,
  Typography,
  Button,
  Tag,
  Empty,
  Spin,
  Dropdown,
} from "antd";
import type { MenuProps } from "antd";
import { MoreOutlined, EyeOutlined } from "@ant-design/icons";
import { useGetEmployeeAnnouncementsQuery } from "@/store/api/announcementApi";
import type { Announcement } from "@/store/api/announcementApi";
import dayjs from "dayjs";

const getApiUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.");
    if (isLocal) return "http://localhost:9000";
  }
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace("/api", "");
  }
  return window.location.origin;
};

const toAssetUrl = (pathOrUrl: string) =>
  /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${getApiUrl()}/uploads/${pathOrUrl}`;

const getStatusTag = (status: string) => {
  const config: Record<string, { color: string; text: string }> = {
    draft: { color: "default", text: "Draft" },
    published: { color: "green", text: "Published" },
    expired: { color: "red", text: "Expired" },
  };
  const { color, text } = config[status] ?? { color: "default", text: status };
  return <Tag color={color}>{text}</Tag>;
};

const EmployeeAnnouncements = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useGetEmployeeAnnouncementsQuery({ page, limit: pageSize });
  const announcements = data?.data?.announcements ?? [];
  const pagination = data?.data?.pagination ?? { page: 1, limit: 10, total: 0, pages: 0 };

  const columns = [
    {
      title: "Cover",
      key: "cover",
      width: 80,
      render: (_: unknown, record: Announcement) => {
        if (record.coverImage) {
          return (
            <img
              src={toAssetUrl(record.coverImage)}
              alt="Cover"
              style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, border: "1px solid #d9d9d9" }}
            />
          );
        }
        return (
          <div
            style={{
              width: 48,
              height: 48,
              background: "#f5f5f5",
              borderRadius: 4,
              border: "1px solid #d9d9d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: "#8c8c8c",
            }}
          >
            No image
          </div>
        );
      },
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Announcement) => (
        <Button
          type="link"
          className="p-0 h-auto font-semibold"
          onClick={() => navigate(`/employee/announcements/${record._id}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      ellipsis: true,
      render: (text: string | undefined) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {text || "—"}
        </Typography.Text>
      ),
    },
    {
      title: "Assigned",
      key: "assigned",
      render: (_: unknown, record: Announcement) =>
        record.audienceType === "all" ? "All Employees" : "Specific",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      align: "center" as const,
      render: (status: string) => getStatusTag(status || "published"),
    },
    {
      title: "Published",
      dataIndex: "publishDate",
      key: "publishDate",
      render: (d: string | undefined) =>
        d ? dayjs(d).format("DD MMM YYYY h:mm A") : "—",
    },
    {
      title: "Expiry Date",
      dataIndex: "expiryDate",
      key: "expiryDate",
      render: (d: string | undefined) => (d ? dayjs(d).format("DD MMM YYYY h:mm A") : null),
    },
    {
      title: "Actions",
      key: "action",
      align: "center" as const,
      width: 72,
      render: (_: unknown, record: Announcement) => {
        const items: MenuProps["items"] = [
          {
            key: "view",
            label: "View",
            icon: <EyeOutlined />,
            onClick: () => navigate(`/employee/announcements/${record._id}`),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <MainLayout>
      <div style={{ padding: "16px 24px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Announcements
          </Typography.Title>
          <Typography.Text type="secondary">
            View company announcements relevant to you
          </Typography.Text>
        </div>

        <Card title="All Announcements">
          {isLoading ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <Spin size="large" tip="Loading..." />
            </div>
          ) : announcements.length === 0 ? (
            <Empty description="No announcements at the moment." style={{ padding: 48 }} />
          ) : (
            <Table
              rowKey="_id"
              columns={columns}
              dataSource={announcements}
              loading={isLoading}
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (t) => `Total ${t} items`,
                onChange: (p, size) => {
                  setPage(p);
                  setPageSize(size || 10);
                },
              }}
            />
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default EmployeeAnnouncements;
