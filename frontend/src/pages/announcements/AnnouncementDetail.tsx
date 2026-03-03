import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import {
  Button,
  Typography,
  Tag,
  Space,
  Divider,
  Spin,
  Empty,
  Modal,
  Row,
  Col,
} from "antd";
import { theme } from "antd";
import { ArrowLeftOutlined, EditOutlined, FileTextOutlined, PaperClipOutlined } from "@ant-design/icons";
import { useGetAnnouncementByIdQuery } from "@/store/api/announcementApi";
import type { AnnouncementAttachment } from "@/store/api/announcementApi";
import { getDisplayStatus, DISPLAY_STATUS_CONFIG, canEditAnnouncement } from "./announcementUtils";
import dayjs from "dayjs";

const { useToken } = theme;

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

const getStatusTag = (announcement: { status?: string; publishDate?: string | null }) => {
  const displayStatus = getDisplayStatus(announcement);
  const { color, text } = DISPLAY_STATUS_CONFIG[displayStatus];
  return <Tag color={color}>{text}</Tag>;
};

const AnnouncementDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const [attachmentModal, setAttachmentModal] = useState<{ url: string; att: AnnouncementAttachment } | null>(null);

  const { data, isLoading } = useGetAnnouncementByIdQuery(id!, { skip: !id });

  const announcement = data?.data?.announcement;

  const attachmentUrl = (pathOrUrl: string) => toAssetUrl(pathOrUrl);

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

  if (!id) {
    navigate("/announcements");
    return null;
  }

  if (isLoading || !announcement) {
    return (
      <MainLayout>
        <div className="w-full px-12 pt-12 text-center" style={{ background: token.colorBgContainer, minHeight: 200 }}>
          {isLoading ? (
            <Spin size="large" tip="Loading..." />
          ) : (
            <Empty description="Announcement not found." />
          )}
        </div>
      </MainLayout>
    );
  }

  const audienceLabel = announcement.audienceType === "all" ? "All Employees" : "Specific";
  const canEdit = canEditAnnouncement(announcement);

  return (
    <MainLayout>
      <div
        className="w-full max-w-none px-12 pb-12"
        style={{ background: token.colorBgContainer }}
      >
        {/* Top bar: Back only */}
        <div
          className="flex items-center justify-between py-3"
          style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/announcements")}
          />
        </div>

        {/* Full-width hero header */}
        <div className="w-full pt-8 pb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <Typography.Title level={1} style={{ marginTop: 0, marginBottom: 24, fontWeight: 700 }}>
                {announcement.title}
              </Typography.Title>
              <Space wrap size="middle" className="mb-4">
                <Typography.Text type="secondary">
                  From: {announcement.fromName || announcement.createdBy?.name || "—"}
                </Typography.Text>
                <Typography.Text type="secondary">·</Typography.Text>
                <Typography.Text type="secondary">
                  Published: {announcement.publishDate ? dayjs(announcement.publishDate).format("DD MMM YYYY") : "—"}
                </Typography.Text>
                <Typography.Text type="secondary">·</Typography.Text>
                <Typography.Text type="secondary">
                  Expires: {announcement.expiryDate ? dayjs(announcement.expiryDate).format("DD MMM YYYY") : "—"}
                </Typography.Text>
                <Typography.Text type="secondary">·</Typography.Text>
                <Tag>{audienceLabel}</Tag>
                {getStatusTag(announcement)}
              </Space>
            </div>
            {canEdit && (
              <Button type="default" icon={<EditOutlined />} onClick={() => navigate(`/announcements/${id}/edit`)}>
                Edit
              </Button>
            )}
          </div>
          <Divider style={{ margin: 0 }} />
        </div>

        {/* Description section */}
        <div className="w-full pt-6 pb-8">
          {/* Cover poster at top of description, centered */}
          {announcement.coverImage ? (
            <div className="flex justify-center mb-8">
              <div
                className="overflow-hidden rounded-xl"
                style={{
                  maxWidth: 960,
                  width: "100%",
                  height: 320,
                  background: token.colorFillTertiary,
                }}
              >
                <img
                  src={toAssetUrl(announcement.coverImage)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div
              className="flex justify-center items-center mx-auto mb-8 rounded-xl"
              style={{
                maxWidth: 960,
                width: "100%",
                height: 200,
                background: token.colorFillTertiary,
                color: token.colorTextTertiary,
              }}
            >
              No cover image
            </div>
          )}
          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            Description
          </Typography.Title>
          {announcement.description ? (
            <Typography.Paragraph style={{ fontSize: 15, lineHeight: 1.75, color: token.colorTextSecondary, marginBottom: 0, whiteSpace: "pre-wrap" }}>
              {announcement.description}
            </Typography.Paragraph>
          ) : (
            <Typography.Text type="secondary">No description.</Typography.Text>
          )}
          {announcement.attachments && announcement.attachments.length > 0 && (
            <Space wrap className="mt-4">
              {announcement.attachments.map((att, index) => (
                <Button
                  key={index}
                  type="default"
                  size="small"
                  icon={<PaperClipOutlined />}
                  onClick={() => setAttachmentModal({ url: attachmentUrl(att.path), att })}
                >
                  View Attachment
                </Button>
              ))}
            </Space>
          )}
        </div>

        {/* Separator between description and subsections */}
        {announcement.subsections && announcement.subsections.length > 0 && (
          <>
            <Divider style={{ margin: 0 }} />
            <div className="w-full pt-8 pb-8">
            {announcement.subsections.map((sub, index) => {
              const isOdd = index % 2 === 0;
              const textContent = (
                <div className="flex flex-col justify-center">
                  <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>
                    {sub.title || `Subsection ${index + 1}`}
                  </Typography.Title>
                  {sub.content ? (
                    <Typography.Paragraph style={{ fontSize: 15, lineHeight: 1.75, color: token.colorTextSecondary, marginBottom: 0, whiteSpace: "pre-wrap" }}>
                      {sub.content}
                    </Typography.Paragraph>
                  ) : null}
                </div>
              );
              const imageContent = sub.image ? (
                <div
                  className="w-full overflow-hidden rounded-xl"
                  style={{ height: 320, background: token.colorFillTertiary }}
                >
                  <img
                    src={toAssetUrl(sub.image)}
                    alt={sub.title || "Subsection"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null;

              return (
                <Row
                  key={index}
                  gutter={48}
                  align="middle"
                  style={{
                    marginTop: index > 0 ? 48 : 0,
                    marginBottom: index < announcement.subsections!.length - 1 ? 48 : 0,
                  }}
                >
                  <Col xs={24} md={12}>
                    {isOdd ? textContent : imageContent}
                  </Col>
                  <Col xs={24} md={12}>
                    {isOdd ? imageContent : textContent}
                  </Col>
                </Row>
              );
            })}
            </div>
          </>
        )}

        <Modal
          title={attachmentModal?.att.name ?? "Attachment"}
          open={!!attachmentModal}
          onCancel={() => setAttachmentModal(null)}
          footer={null}
          width={attachmentModal?.att ? (isImage(attachmentModal.att.name, attachmentModal.att.mimeType) ? 800 : 900) : 560}
          destroyOnHidden
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
      </div>
    </MainLayout>
  );
};

export default AnnouncementDetail;
