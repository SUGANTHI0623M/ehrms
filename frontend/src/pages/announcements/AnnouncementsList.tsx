import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, Table, Modal, Dropdown, message, Typography, Button, Tag, Space, Tabs } from "antd";
import type { MenuProps } from "antd";
import {
  PlusOutlined,
  MoreOutlined,
  UnorderedListOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  useGetAnnouncementsQuery,
  usePublishAnnouncementMutation,
  useDeleteAnnouncementMutation,
  type Announcement,
} from "@/store/api/announcementApi";
import { getDisplayStatus, DISPLAY_STATUS_CONFIG, canEditAnnouncement } from "./announcementUtils";
import type { DisplayStatus } from "./announcementUtils";
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
    if (isLocal) return "http://localhost:7001";
  }
  if (import.meta.env.VITE_API_URL) {
    return (import.meta.env.VITE_API_URL as string).replace("/api", "");
  }
  return window.location.origin;
};

const toAssetUrl = (pathOrUrl: string) =>
  /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${getApiUrl()}/uploads/${pathOrUrl}`;

const AnnouncementsList = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch all announcements (no status filter), then filter by display status on the client
  const { data, isLoading } = useGetAnnouncementsQuery({
    page: 1,
    limit: 1000,
  });
  const [publishAnnouncement] = usePublishAnnouncementMutation();
  const [deleteAnnouncement] = useDeleteAnnouncementMutation();

  const allAnnouncements = data?.data?.announcements ?? [];

  const filteredAnnouncements = useMemo(() => {
    if (!statusFilter || statusFilter === "all") return allAnnouncements;
    const tabStatus = statusFilter as DisplayStatus;
    return allAnnouncements.filter((r) => getDisplayStatus(r) === tabStatus);
  }, [allAnnouncements, statusFilter]);

  const paginatedAnnouncements = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAnnouncements.slice(start, start + pageSize);
  }, [filteredAnnouncements, page, pageSize]);

  const totalFiltered = filteredAnnouncements.length;
  const pagination = {
    page,
    limit: pageSize,
    total: totalFiltered,
    pages: Math.ceil(totalFiltered / pageSize) || 1,
  };

  const handlePublish = useCallback(
    async (record: Announcement) => {
      try {
        await publishAnnouncement(record._id).unwrap();
        message.success("Announcement published successfully");
      } catch (err: unknown) {
        const e = err as { data?: { error?: { message?: string } } };
        message.error(e?.data?.error?.message || "Failed to publish");
      }
    },
    [publishAnnouncement]
  );

  const handleDelete = useCallback(
    (record: Announcement) => {
      Modal.confirm({
        title: "Delete Announcement",
        content: `Are you sure you want to delete "${record.title}"?`,
        onOk: async () => {
          try {
            await deleteAnnouncement(record._id).unwrap();
            message.success("Announcement deleted");
          } catch (err: unknown) {
            const e = err as { data?: { error?: { message?: string } } };
            message.error(e?.data?.error?.message || "Failed to delete");
          }
        },
      });
    },
    [deleteAnnouncement]
  );

  const getStatusTag = (record: Announcement) => {
    const displayStatus = getDisplayStatus(record);
    const { color, text } = DISPLAY_STATUS_CONFIG[displayStatus];
    return <Tag color={color}>{text}</Tag>;
  };

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
          onClick={() => navigate(`/announcements/${record._id}`)}
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
      title: "Audience",
      key: "audience",
      render: (_: unknown, record: Announcement) =>
        record.audienceType === "all" ? "All Employees" : "Specific",
    },
    {
      title: "Status",
      key: "status",
      align: "center" as const,
      render: (_: unknown, record: Announcement) => getStatusTag(record),
    },
    {
      title: "Publish Date",
      dataIndex: "publishDate",
      key: "publishDate",
      render: (d: string | undefined) =>
        d ? dayjs(d).format("DD MMM YYYY") : "—",
    },
    {
      title: "Expiry Date",
      dataIndex: "expiryDate",
      key: "expiryDate",
      render: (d: string | undefined) =>
        d ? dayjs(d).format("DD MMM YYYY") : "—",
    },
    {
      title: <span style={{ whiteSpace: "nowrap" }}>Actions</span>,
      key: "action",
      align: "center" as const,
      width: 90,
      render: (_: unknown, record: Announcement) => {
        const canEdit = canEditAnnouncement(record);
        const items: MenuProps["items"] = [
          {
            key: "view",
            label: "View",
            onClick: () => navigate(`/announcements/${record._id}`),
          },
          ...(canEdit
            ? [
                {
                  key: "edit",
                  label: "Edit",
                  onClick: () => navigate(`/announcements/${record._id}/edit`),
                },
              ]
            : []),
          ...(record.status === "draft" && getDisplayStatus(record) !== "scheduled"
            ? [
                {
                  key: "publish",
                  label: "Publish",
                  onClick: () => handlePublish(record),
                },
              ]
            : []),
          {
            key: "delete",
            label: "Delete",
            danger: true,
            onClick: () => handleDelete(record),
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

  const tableContent = (
    <Table
      key={`announcements-${statusFilter ?? "all"}`}
      rowKey="_id"
      columns={columns}
      dataSource={paginatedAnnouncements}
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
  );

  return (
    <MainLayout>
      <div style={{ padding: "16px 24px", maxWidth: 1600, margin: "0 auto", width: "100%" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                Announcements
              </Typography.Title>
              <Typography.Text type="secondary">
                Create and manage announcements for employees
              </Typography.Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/announcements/new")}
            >
              New Announcement
            </Button>
          </div>

          <Card title="All Announcements">
            <Tabs
              activeKey={statusFilter ?? "all"}
              onChange={(key) => {
                setStatusFilter(key === "all" ? undefined : key);
                setPage(1);
              }}
              className="assessment-tabs"
              items={[
                {
                  key: "all",
                  label: (
                    <span className="flex items-center gap-2">
                      <UnorderedListOutlined />
                      All
                    </span>
                  ),
                  children: tableContent,
                },
                {
                  key: "draft",
                  label: (
                    <span className="flex items-center gap-2">
                      <EditOutlined />
                      Draft
                    </span>
                  ),
                  children: tableContent,
                },
                {
                  key: "scheduled",
                  label: (
                    <span className="flex items-center gap-2">
                      <CalendarOutlined />
                      Scheduled
                    </span>
                  ),
                  children: tableContent,
                },
                {
                  key: "published",
                  label: (
                    <span className="flex items-center gap-2">
                      <CheckCircleOutlined />
                      Published
                    </span>
                  ),
                  children: tableContent,
                },
                {
                  key: "expired",
                  label: (
                    <span className="flex items-center gap-2">
                      <ClockCircleOutlined />
                      Expired
                    </span>
                  ),
                  children: tableContent,
                },
              ]}
            />
          </Card>
        </Space>
      </div>
    </MainLayout>
  );
};

export default AnnouncementsList;
