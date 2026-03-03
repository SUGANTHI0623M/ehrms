import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { Layout, Card, Typography, Empty, Spin, Button, Space, Modal, Pagination, Grid } from "antd";
import { theme } from "antd";
import { FileTextOutlined, PaperClipOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useGetEmployeeAnnouncementsQuery, useGetEmployeeAnnouncementByIdQuery } from "@/store/api/announcementApi";
import type { Announcement, AnnouncementAttachment } from "@/store/api/announcementApi";
import dayjs from "dayjs";

const { useToken } = theme;
const { Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const PAGE_SIZE = 10;

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

const getStatusTag = (status: string) => {
  const config: Record<string, { color: string; text: string }> = {
    draft: { color: "default", text: "Draft" },
    published: { color: "gold", text: "Published" },
    expired: { color: "red", text: "Expired" },
  };
  const { color, text } = config[status] ?? { color: "default", text: status };
  return <Tag color={color}>{text}</Tag>;
};

const EmployeeAnnouncements = () => {
  const { token } = useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attachmentModal, setAttachmentModal] = useState<{ url: string; att: AnnouncementAttachment } | null>(null);

  const { data: listData, isLoading: listLoading } = useGetEmployeeAnnouncementsQuery({
    page,
    limit: PAGE_SIZE,
  });
  const announcements = listData?.data?.announcements ?? [];
  const pagination = listData?.data?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, pages: 1 };

  const { data: detailData, isLoading: detailLoading } = useGetEmployeeAnnouncementByIdQuery(selectedId!, {
    skip: !selectedId,
  });
  const announcement = detailData?.data?.announcement;

  useEffect(() => {
    if (announcements.length > 0 && !selectedId && !isMobile) {
      setSelectedId(announcements[0]._id);
    }
  }, [announcements, selectedId, isMobile]);

  useEffect(() => {
    if (announcements.length > 0 && selectedId && !announcements.some((a) => a._id === selectedId)) {
      setSelectedId(announcements[0]._id);
    }
  }, [announcements, selectedId]);

  const isImage = (name: string, mime?: string) => {
    const lower = (name || "").toLowerCase();
    if (mime?.startsWith("image/")) return true;
    return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(lower);
  };

  const isPdf = (name: string, mime?: string) => {
    const lower = (name || "").toLowerCase();
    if (mime === "application/pdf") return true;
    return lower.endsWith(".pdf");
  };

  const renderAnnouncementCard = (item: Announcement) => {
    const isSelected = selectedId === item._id;
    const cardHeight = 92;
    return (
      <Card
        key={item._id}
        hoverable
        onClick={() => setSelectedId(item._id)}
        size="small"
        className="employee-announcement-card cursor-pointer"
        style={{
          width: "100%",
          borderRadius: 8,
          overflow: "hidden",
          border: isSelected ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.2s ease",
        }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-nowrap" style={{ minHeight: cardHeight }}>
          <div
            className="flex-shrink-0"
            style={{
              width: 96,
              height: cardHeight,
              background: token.colorFillTertiary,
            }}
          >
            {item.coverImage ? (
              <img src={toAssetUrl(item.coverImage)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ fontSize: 10, color: token.colorTextTertiary }}
              >
                No image
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ padding: "10px 12px" }}>
            <div className="min-w-0">
              <Typography.Text strong className="block text-sm" ellipsis={{ rows: 1 }}>
                {item.title}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }} className="block mt-0" ellipsis={{ rows: 1 }}>
                {item.subject || "—"}
              </Typography.Text>
            </div>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 10, marginTop: 6, display: "block", textAlign: "right" }}
            >
              {item.publishDate ? dayjs(item.publishDate).format("DD MMM YYYY") : "—"}
            </Typography.Text>
          </div>
        </div>
      </Card>
    );
  };

  const renderDetailContent = () => {
    if (!selectedId) return null;
    if (detailLoading)
      return (
        <div className="flex items-center justify-center min-h-[320px]">
          <Spin size="large" tip="Loading..." />
        </div>
      );
    if (!announcement)
      return (
        <div className="flex items-center justify-center min-h-[320px]">
          <Empty description="Announcement not found" />
        </div>
      );
    return (
      <div className="max-w-4xl mx-auto" style={{ transition: "opacity 0.2s ease" }}>
        <div
          className="w-full rounded-xl overflow-hidden mb-6"
          style={{ height: 280, background: token.colorFillTertiary }}
        >
          {announcement.coverImage ? (
            <img src={toAssetUrl(announcement.coverImage)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ color: token.colorTextTertiary }}
            >
              No cover image
            </div>
          )}
        </div>
        <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>
          {announcement.title}
        </Typography.Title>
        <Space size="middle" className="mb-6" wrap>
          <Typography.Text type="secondary">
            From: {announcement.fromName || "HR Team"}
          </Typography.Text>
          <Typography.Text type="secondary">
            Published: {announcement.publishDate ? dayjs(announcement.publishDate).format("DD MMM YYYY") : "—"}
          </Typography.Text>
        </Space>
        <div className="mb-6">
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12, fontWeight: 600 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            Description
          </Typography.Title>
          {announcement.description ? (
            <Typography.Paragraph
              style={{
                fontSize: 15,
                lineHeight: 1.75,
                color: token.colorTextSecondary,
                marginBottom: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {announcement.description}
            </Typography.Paragraph>
          ) : (
            <Typography.Text type="secondary">No description.</Typography.Text>
          )}
        </div>
        {announcement.attachments && announcement.attachments.length > 0 && (
          <div className="mb-6">
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12, fontWeight: 600 }}>
              <PaperClipOutlined style={{ marginRight: 8 }} />
              Attachments
            </Typography.Title>
            <Space wrap>
              {announcement.attachments.map((att, index) => (
                <Button
                  key={index}
                  type="default"
                  size="small"
                  icon={<PaperClipOutlined />}
                  onClick={() => setAttachmentModal({ url: toAssetUrl(att.path), att })}
                >
                  {att.name || "View attachment"}
                </Button>
              ))}
            </Space>
          </div>
        )}
        {announcement.subsections && announcement.subsections.length > 0 && (
          <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
            {announcement.subsections.map((sub, index) => (
              <div key={index} className="mb-8">
                <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12, fontWeight: 600 }}>
                  {sub.title || `Section ${index + 1}`}
                </Typography.Title>
                {sub.content ? (
                  <Typography.Paragraph
                    style={{
                      fontSize: 15,
                      lineHeight: 1.75,
                      color: token.colorTextSecondary,
                      marginBottom: sub.image ? 12 : 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {sub.content}
                  </Typography.Paragraph>
                ) : null}
                {sub.image && (
                  <div
                    className="rounded-xl overflow-hidden mt-2"
                    style={{ maxWidth: 560, height: 240, background: token.colorFillTertiary }}
                  >
                    <img
                      src={toAssetUrl(sub.image)}
                      alt={sub.title || "Section"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isMobile) {
    return (
      <MainLayout>
        <div
          style={{
            minHeight: "calc(100vh - 64px)",
            background: token.colorBgContainer,
            padding: 16,
          }}
        >
          {selectedId ? (
            <>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => setSelectedId(null)}
                className="mb-4"
                style={{ paddingLeft: 0 }}
              >
                Back to list
              </Button>
              <div className="overflow-y-auto">{renderDetailContent()}</div>
            </>
          ) : (
            <>
              <Typography.Title level={4} style={{ margin: 0, marginBottom: 4 }}>
                Announcements
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 24 }}>
                View company announcements
              </Typography.Text>
              {listLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spin tip="Loading..." />
                </div>
              ) : announcements.length === 0 ? (
                <Empty description="No announcements" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-8" />
              ) : (
                <>
                  <Space direction="vertical" size={10} className="w-full" style={{ width: "100%", marginTop: 8 }}>
                    {announcements.map((item) => renderAnnouncementCard(item))}
                  </Space>
                  {pagination.pages > 1 && (
                    <div className="flex justify-center mt-6">
                      <Pagination
                        current={pagination.page}
                        total={pagination.total}
                        pageSize={pagination.limit}
                        showSizeChanger={false}
                        showTotal={(total) => `Total ${total} items`}
                        onChange={(p) => setPage(p)}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        <Modal
          title={attachmentModal?.att.name ?? "Attachment"}
          open={!!attachmentModal}
          onCancel={() => setAttachmentModal(null)}
          footer={null}
          width={attachmentModal?.att ? (isImage(attachmentModal.att.name, attachmentModal.att.mimeType) ? 800 : 900) : 560}
          destroyOnClose
        >
          {attachmentModal && (
            <>
              {isImage(attachmentModal.att.name, attachmentModal.att.mimeType) ? (
                <img
                  src={attachmentModal.url}
                  alt={attachmentModal.att.name}
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              ) : isPdf(attachmentModal.att.name, attachmentModal.att.mimeType) ? (
                <iframe
                  title={attachmentModal.att.name}
                  src={attachmentModal.url}
                  style={{ width: "100%", height: "70vh", border: "none" }}
                />
              ) : (
                <p>
                  <a href={attachmentModal.url} target="_blank" rel="noopener noreferrer">
                    Open attachment
                  </a>
                </p>
              )}
            </>
          )}
        </Modal>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Layout
        className="employee-announcements-split"
        style={{
          minHeight: "calc(100vh - 64px)",
          background: token.colorBgContainer,
        }}
      >
        {/* Left: List - 25% on desktop */}
        <Sider
          width="25%"
          style={{
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            overflow: "hidden",
            minWidth: 280,
            maxWidth: 400,
            boxShadow: "4px 0 16px rgba(0,0,0,0.06)",
          }}
          className="employee-announcements-sider !min-w-0 lg:!min-w-[280px] lg:!max-w-[400px]"
        >
          <div className="h-full flex flex-col p-4">
            <Typography.Title level={4} style={{ margin: 0, marginBottom: 4 }}>
              Announcements
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 24 }}>
              View company announcements
            </Typography.Text>
            <div className="flex-1 overflow-y-auto pr-1 -mr-1" style={{ minHeight: 200, paddingTop: 8 }}>
              {listLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spin tip="Loading..." />
                </div>
              ) : announcements.length === 0 ? (
                <Empty description="No announcements" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-8" />
              ) : (
                <Space direction="vertical" size={10} className="w-full" style={{ width: "100%" }}>
                  {announcements.map((item) => renderAnnouncementCard(item))}
                </Space>
              )}
            </div>
            {!listLoading && announcements.length > 0 && pagination.pages > 1 && (
              <div className="pt-4 flex justify-center border-t" style={{ borderColor: token.colorBorderSecondary }}>
                <Pagination
                  current={pagination.page}
                  total={pagination.total}
                  pageSize={pagination.limit}
                  size="small"
                  showSizeChanger={false}
                  showTotal={(total) => `${total} items`}
                  onChange={(p) => setPage(p)}
                />
              </div>
            )}
          </div>
        </Sider>

        {/* Right: Detail - 75% on desktop */}
        <Content
          className="employee-announcements-detail flex-1 overflow-y-auto"
          style={{
            background: token.colorBgContainer,
            padding: 24,
          }}
        >
          {!selectedId ? (
            <div className="flex items-center justify-center h-full min-h-[320px]">
              <Empty description="Select an announcement" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            renderDetailContent()
          )}
        </Content>
      </Layout>

      <Modal
        title={attachmentModal?.att.name ?? "Attachment"}
        open={!!attachmentModal}
        onCancel={() => setAttachmentModal(null)}
        footer={null}
        width={attachmentModal?.att ? (isImage(attachmentModal.att.name, attachmentModal.att.mimeType) ? 800 : 900) : 560}
        destroyOnClose
      >
        {attachmentModal && (
          <>
            {isImage(attachmentModal.att.name, attachmentModal.att.mimeType) ? (
              <img
                src={attachmentModal.url}
                alt={attachmentModal.att.name}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            ) : isPdf(attachmentModal.att.name, attachmentModal.att.mimeType) ? (
              <iframe
                title={attachmentModal.att.name}
                src={attachmentModal.url}
                style={{ width: "100%", height: "70vh", border: "none" }}
              />
            ) : (
              <p>
                <a href={attachmentModal.url} target="_blank" rel="noopener noreferrer">
                  Open attachment
                </a>
              </p>
            )}
          </>
        )}
      </Modal>

      <style>{`
        @media (max-width: 992px) {
          .employee-announcements-split .ant-layout-sider {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            border-right: none;
            border-bottom: 1px solid var(--ant-color-border-secondary);
          }
          .employee-announcements-split .employee-announcements-sider {
            min-height: 320px;
            max-height: 50vh;
          }
          .employee-announcements-split .employee-announcements-detail {
            min-height: 50vh;
          }
        }
        .employee-announcement-card:hover {
          border-color: var(--ant-color-primary);
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </MainLayout>
  );
};

export default EmployeeAnnouncements;
