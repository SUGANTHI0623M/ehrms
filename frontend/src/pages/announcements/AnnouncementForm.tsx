import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import {
  message,
  Card,
  Form,
  Select as AntSelect,
  DatePicker,
  Button as AntDButton,
  Input as AntInput,
  Space,
  Upload,
  Typography,
} from "antd";
import type { UploadProps } from "antd";
import { PlusOutlined, ArrowLeftOutlined, UploadOutlined, DeleteOutlined, PictureOutlined } from "@ant-design/icons";
import { Sparkles } from "lucide-react";
import {
  useGetAnnouncementByIdQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useGenerateAIDescriptionMutation,
} from "@/store/api/announcementApi.ts";
import { canEditAnnouncement } from "./announcementUtils";
import { useGetStaffQuery } from "@/store/api/staffApi";
import dayjs from "dayjs";
import { disabledDatePast, disabledTimePastWhenToday } from "@/utils/dateTimePickerUtils";

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

/** Use URL as-is if absolute (e.g. Cloudinary), else prepend uploads base for local. */
const toAssetUrl = (pathOrUrl: string) =>
  /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${getApiUrl()}/uploads/${pathOrUrl}`;

const AnnouncementForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id && id !== "new");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [description, setDescription] = useState("");
  const [audienceType, setAudienceType] = useState<"all" | "specific">("all");
  const [targetStaffIds, setTargetStaffIds] = useState<string[]>([]);
  const [publishDate, setPublishDate] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [removedExistingPaths, setRemovedExistingPaths] = useState<string[]>([]);
  const [aiDescriptionLinesInput, setAiDescriptionLinesInput] = useState<string>("3");
  const [aiLoading, setAiLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  type SubsectionEntry = {
    id: string;
    title: string;
    imageFile?: File | null;
    imagePreview?: string;
    content: string;
    lines: number;
  };
  const [subsections, setSubsections] = useState<SubsectionEntry[]>([]);
  const [subsectionAiLoadingIndex, setSubsectionAiLoadingIndex] = useState<number | null>(null);

  const { data: announcementData } = useGetAnnouncementByIdQuery(id!, { skip: !isEdit || !id });
  const { data: staffData } = useGetStaffQuery({ status: "Active", limit: 500, page: 1 });
  const [createAnnouncement] = useCreateAnnouncementMutation();
  const [updateAnnouncement] = useUpdateAnnouncementMutation();
  const [generateAIDescription] = useGenerateAIDescriptionMutation();

  const announcement = announcementData?.data?.announcement;
  const staffList = staffData?.data?.staff ?? [];

  useEffect(() => {
    if (isEdit && announcement) {
      setTitle(announcement.title);
      setSubject(announcement.subject || "");
      setFromName(announcement.fromName || "");
      setDescription(announcement.description || "");
      setAudienceType(announcement.audienceType || "all");
      setTargetStaffIds(
        (announcement.targetStaffIds ?? []).map((s: { _id: string }) => s._id)
      );
      setPublishDate(
        announcement.publishDate
          ? dayjs(announcement.publishDate).format("YYYY-MM-DDTHH:mm:ss")
          : ""
      );
      setExpiryDate(
        announcement.expiryDate
          ? dayjs(announcement.expiryDate).format("YYYY-MM-DDTHH:mm:ss")
          : ""
      );
      if (announcement.coverImage) {
        setCoverImagePreview(toAssetUrl(announcement.coverImage));
      }
      if (announcement.subsections?.length) {
        setSubsections(
          announcement.subsections.map((s) => ({
            id: crypto.randomUUID(),
            title: s.title || "",
            imagePreview: s.image ? toAssetUrl(s.image) : undefined,
            content: s.content || "",
            lines: 2,
          }))
        );
      }
      setRemovedExistingPaths([]);
    }
  }, [isEdit, announcement]);

  // Redirect to view if editing a published or expired announcement (only draft/scheduled are editable)
  useEffect(() => {
    if (isEdit && id && announcement && !canEditAnnouncement(announcement)) {
      message.warning("Only draft and scheduled announcements can be edited.");
      navigate(`/announcements/${id}`, { replace: true });
    }
  }, [isEdit, id, announcement, navigate]);

  const getAiDescriptionLines = () =>
    Math.min(10, Math.max(1, parseInt(aiDescriptionLinesInput, 10) || 3));

  const handleGenerateAI = async () => {
    if (!title.trim()) {
      message.warning("Enter a title first to generate description");
      return;
    }
    setAiLoading(true);
    try {
      const res = await generateAIDescription({
        title: title.trim(),
        lines: getAiDescriptionLines(),
        attachments: attachmentFiles.length > 0 ? attachmentFiles : undefined,
      }).unwrap();
      if (res.data?.description) {
        setDescription(res.data.description);
        message.success("Description generated. You can edit it below.");
      }
    } catch (err: any) {
      message.error(
        err?.data?.error?.message || "Failed to generate description"
      );
    } finally {
      setAiLoading(false);
    }
  };

  const buildFormData = (status: "draft" | "published"): FormData => {
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("subject", subject.trim());
    formData.append("fromName", fromName.trim());
    formData.append("description", description);
    formData.append("audienceType", audienceType);
    formData.append("targetStaffIds", JSON.stringify(targetStaffIds));
    formData.append("status", status);
    formData.append("publishDate", publishDate);
    formData.append("expiryDate", expiryDate);
    if (coverImageFile) formData.append("coverImage", coverImageFile);
    attachmentFiles.forEach((file) => formData.append("attachments", file));
    if (subsections.length > 0) {
      formData.append(
        "subsectionsData",
        JSON.stringify(
          subsections.map((s) => ({
            title: s.title,
            content: s.content,
            hasImage: !!s.imageFile,
          }))
        )
      );
      subsections.forEach((s) => {
        if (s.imageFile) formData.append("subsectionImages", s.imageFile);
      });
    }
    return formData;
  };

  const addSubsection = () => {
    setSubsections((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", content: "", lines: 2 },
    ]);
  };

  const removeSubsection = (index: number) => {
    setSubsections((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSubsection = (index: number, patch: Partial<SubsectionEntry>) => {
    setSubsections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  };

  const handleGenerateSubsectionAI = async (index: number) => {
    const sub = subsections[index];
    if (!sub.title.trim()) {
      message.warning("Enter subsection title first");
      return;
    }
    setSubsectionAiLoadingIndex(index);
    try {
      const res = await generateAIDescription({
        title: sub.title.trim(),
        lines: sub.lines ?? 2,
      }).unwrap();
      if (res.data?.description) {
        updateSubsection(index, { content: res.data.description });
        message.success("Content generated. You can edit it below.");
      }
    } catch (err: any) {
      message.error(err?.data?.error?.message || "Failed to generate content");
    } finally {
      setSubsectionAiLoadingIndex(null);
    }
  };

  /** When publishDate is set, we save as draft (scheduled); otherwise primary action can publish immediately. */
  const hasScheduledPublish = Boolean(publishDate && publishDate.trim());

  const handleSubmit = async (asDraft: boolean) => {
    if (!title.trim()) {
      message.error("Title is required");
      return;
    }
    if (!subject.trim()) {
      message.error("Subject is required");
      return;
    }
    if (!description.trim()) {
      message.error("Description is required");
      return;
    }
    if (audienceType === "specific" && targetStaffIds.length === 0) {
      message.error("Select at least one employee when audience is Specific");
      return;
    }
    if (publishDate && expiryDate) {
      const publish = dayjs(publishDate);
      const expiry = dayjs(expiryDate);
      if (expiry.isBefore(publish)) {
        message.error("Expiry date & time must be on or after the publish date & time.");
        return;
      }
    }
    setSubmitLoading(true);
    try {
      const status = asDraft ? "draft" : "published";
      const body = buildFormData(status);
      if (isEdit && id) {
        await updateAnnouncement({ id, body }).unwrap();
        const isScheduled = asDraft && hasScheduledPublish;
        message.success(
          isScheduled
            ? "Announcement saved. It will be published at the scheduled date & time."
            : asDraft
              ? "Announcement saved as draft"
              : "Announcement published"
        );
        navigate("/announcements");
      } else {
        const res = await createAnnouncement(body).unwrap();
        const isScheduled = asDraft && hasScheduledPublish;
        message.success(
          isScheduled
            ? "Announcement saved. It will be published at the scheduled date & time."
            : asDraft
              ? "Announcement saved as draft"
              : "Announcement published"
        );
        const createdId = res?.data?.announcement?._id;
        navigate(createdId ? `/announcements/${createdId}` : "/announcements");
      }
    } catch (err: any) {
      message.error(
        err?.data?.error?.message || "Failed to save announcement"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const removeCoverImage = () => {
    setCoverImageFile(null);
    setCoverImagePreview("");
  };

  const removeFile = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const coverUploadProps: UploadProps = {
    accept: "image/*",
    showUploadList: false,
    maxCount: 1,
    beforeUpload: (file) => {
      if (file.size > 5 * 1024 * 1024) {
        message.error("Cover image must be under 5MB");
        return Upload.LIST_IGNORE;
      }
      if (!file.type.startsWith("image/")) {
        message.error("Only image files are allowed for cover poster");
        return Upload.LIST_IGNORE;
      }
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      return false;
    },
  };

  const attachmentUploadProps: UploadProps = {
    accept: ".pdf,image/*",
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      setAttachmentFiles((prev) => [...prev, file]);
      return false;
    },
  };

  const existingAttachments = (announcement?.attachments ?? []).filter(
    (a) => !removedExistingPaths.includes(a.path)
  );

  const openPreview = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  };
  const openExistingPreview = (path: string) => {
    window.open(toAssetUrl(path), "_blank");
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full">
        <Space direction="vertical" size="large" className="w-full">
          <div className="flex items-center gap-4">
            <AntDButton
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate("/announcements")}
            />
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {isEdit ? "Edit Announcement" : "New Announcement"}
              </Typography.Title>
              <Typography.Text type="secondary">
                {isEdit
                  ? "Update announcement details"
                  : "Create an announcement for employees"}
              </Typography.Text>
            </div>
          </div>

          <Card title="Details">
            <Form layout="vertical" className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Form.Item label="Title" required>
                  <AntInput
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Announcement title"
                  />
                </Form.Item>
                <Form.Item label="From" tooltip="Who is sending this announcement (e.g. HR Team, Manager name)">
                  <AntInput
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="e.g. HR Team, John Doe"
                  />
                </Form.Item>
                <Form.Item label="Cover Poster (optional, max 5MB)" className="sm:col-span-2">
                  {coverImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={coverImagePreview}
                        alt="Cover preview"
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      <AntDButton
                        type="primary"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        className="absolute top-1 right-1"
                        onClick={removeCoverImage}
                      />
                    </div>
                  ) : (
                    <Upload {...coverUploadProps}>
                      <AntDButton icon={<PictureOutlined />}>
                        Click to upload cover image
                      </AntDButton>
                    </Upload>
                  )}
                </Form.Item>
              </div>

              <Form.Item label="Audience">
                <AntSelect
                  value={audienceType}
                  onChange={(v) => setAudienceType(v as "all" | "specific")}
                  options={[
                    { value: "all", label: "All Employees" },
                    { value: "specific", label: "Specific Employees" },
                  ]}
                  className="w-full"
                />
              </Form.Item>

              {audienceType === "specific" && (
                <Form.Item label="Select Employees">
                  <AntSelect
                    mode="multiple"
                    placeholder="Search and select employees"
                    value={targetStaffIds}
                    onChange={setTargetStaffIds}
                    optionFilterProp="label"
                    className="w-full"
                    options={staffList.map((s) => ({
                      value: s._id,
                      label: `${s.name} (${s.employeeId})`,
                    }))}
                  />
                  <Typography.Text type="secondary" className="text-sm">
                    {targetStaffIds.length} selected
                  </Typography.Text>
                </Form.Item>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Form.Item
                  label="Publish Date (optional)"
                  help={publishDate && dayjs(publishDate).isBefore(dayjs().startOf("day")) ? "Publish date cannot be in the past." : "Announcement will be published at 12:00 AM (midnight) on the selected date."}
                  validateStatus={publishDate && dayjs(publishDate).isBefore(dayjs().startOf("day")) ? "error" : undefined}
                >
                  <DatePicker
                    className="w-full"
                    format="DD/MM/YYYY"
                    value={publishDate ? dayjs(publishDate).startOf("day") : null}
                    onChange={(date) =>
                      setPublishDate(date ? date.startOf("day").format("YYYY-MM-DDTHH:mm:ss") : "")
                    }
                    disabledDate={disabledDatePast}
                    placeholder="Select publish date (will publish at midnight)"
                  />
                </Form.Item>
                <Form.Item
                  label="Expiry Date (optional)"
                  help={publishDate && expiryDate && dayjs(expiryDate).isBefore(dayjs(publishDate)) ? "Expiry must be on or after publish date." : "Announcement will expire on the selected date."}
                  validateStatus={publishDate && expiryDate && dayjs(expiryDate).isBefore(dayjs(publishDate)) ? "error" : undefined}
                >
                  <DatePicker
                    className="w-full"
                    format="DD/MM/YYYY"
                    value={expiryDate ? dayjs(expiryDate).startOf("day") : null}
                    onChange={(date) =>
                      setExpiryDate(date ? date.startOf("day").format("YYYY-MM-DDTHH:mm:ss") : "")
                    }
                    disabledDate={(current) =>
                      current && publishDate ? current.isBefore(dayjs(publishDate).startOf("day")) : false
                    }
                    placeholder="Select expiry date"
                  />
                </Form.Item>
                <Form.Item label="Attachments (PDF, images)">
                  <div className="flex flex-col items-center w-full">
                    <Upload {...attachmentUploadProps}>
                      <AntDButton icon={<UploadOutlined />}>Add files</AntDButton>
                    </Upload>
                    <div className="w-full mt-3 space-y-2 max-w-md mx-auto">
                      {attachmentFiles.map((file, index) => (
                        <div
                          key={`new-${index}`}
                          className="flex items-center justify-between gap-2 p-2 rounded border border-gray-200 bg-gray-50/50"
                        >
                          <Typography.Text ellipsis className="flex-1 min-w-0">
                            {file.name}
                          </Typography.Text>
                          <Space size="small">
                            <AntDButton
                              type="link"
                              size="small"
                              className="p-0"
                              onClick={() => openPreview(file)}
                            >
                              Preview
                            </AntDButton>
                            <AntDButton
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => removeFile(index)}
                            />
                          </Space>
                        </div>
                      ))}
                      {existingAttachments.map((a) => (
                        <div
                          key={a.path}
                          className="flex items-center justify-between gap-2 p-2 rounded border border-gray-200 bg-gray-50/50"
                        >
                          <Typography.Text ellipsis className="flex-1 min-w-0">
                            {a.name}
                          </Typography.Text>
                          <Space size="small">
                            <AntDButton
                              type="link"
                              size="small"
                              className="p-0"
                              onClick={() => openExistingPreview(a.path)}
                            >
                              Preview
                            </AntDButton>
                            <AntDButton
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() =>
                                setRemovedExistingPaths((prev) => [...prev, a.path])
                              }
                            />
                          </Space>
                        </div>
                      ))}
                    </div>
                  </div>
                </Form.Item>
              </div>

              <Form.Item label="Subject" required>
                <AntInput
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short subject line for list and cards"
                />
              </Form.Item>

              <Form.Item
                required
                label={
                  <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                    <span>Description</span>
                    <Space size="small">
                      <Typography.Text type="secondary">Lines</Typography.Text>
                      <Space.Compact>
                        <AntInput
                          value={aiDescriptionLinesInput}
                          onChange={(e) => setAiDescriptionLinesInput(e.target.value)}
                          onBlur={() => {
                            const n = getAiDescriptionLines();
                            setAiDescriptionLinesInput(String(n));
                          }}
                          style={{ width: 44, textAlign: "center" }}
                        />
                        <AntDButton
                          type="default"
                          htmlType="button"
                          icon={aiLoading ? undefined : <Sparkles className="w-3 h-3" />}
                          loading={aiLoading}
                          onClick={handleGenerateAI}
                          disabled={aiLoading || !title.trim()}
                          className="!text-[#efaa1f] hover:!text-[#d97706] hover:!border-[#efaa1f] [&.ant-btn]:!h-8 [&.ant-btn]:!leading-[30px]"
                        >
                          {aiLoading ? "Generating…" : "Generate with AI"}
                        </AntDButton>
                      </Space.Compact>
                    </Space>
                  </div>
                }
              >
                <AntInput.TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write or generate announcement content..."
                  rows={6}
                  className="resize-y"
                />
              </Form.Item>

              {subsections.map((sub, index) => (
                <Card
                  key={sub.id}
                  size="small"
                  title={`Subsection ${index + 1}`}
                  extra={
                    <AntDButton
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeSubsection(index)}
                    />
                  }
                  className="mb-4"
                >
                  <Form layout="vertical">
                    <Form.Item label="Subsection Title">
                      <AntInput
                        value={sub.title}
                        onChange={(e) =>
                          updateSubsection(index, { title: e.target.value })
                        }
                        placeholder="Subsection title"
                      />
                    </Form.Item>
                    <Form.Item label="Subsection Image (optional)">
                      {sub.imagePreview ? (
                        <div className="flex justify-center w-full">
                          <div className="relative inline-block">
                            <img
                              src={sub.imagePreview}
                              alt="Subsection"
                              className="max-h-52 w-auto max-w-full object-contain rounded-lg border bg-neutral-100"
                            />
                            <AntDButton
                              type="primary"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              className="absolute top-1 right-1"
                              onClick={() =>
                                updateSubsection(index, {
                                  imageFile: null,
                                  imagePreview: undefined,
                                })
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <Upload
                          accept="image/*"
                          showUploadList={false}
                          beforeUpload={(file) => {
                            if (file.size > 5 * 1024 * 1024) {
                              message.error("Subsection image must be under 5MB");
                              return Upload.LIST_IGNORE;
                            }
                            if (!file.type.startsWith("image/")) {
                              message.error("Only image files allowed");
                              return Upload.LIST_IGNORE;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              updateSubsection(index, {
                                imageFile: file,
                                imagePreview: reader.result as string,
                              });
                            };
                            reader.readAsDataURL(file);
                            return false;
                          }}
                        >
                          <AntDButton icon={<PictureOutlined />}>
                            Upload image
                          </AntDButton>
                        </Upload>
                      )}
                    </Form.Item>
                    <Form.Item
                      label={
                        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                          <span>Subsection Content</span>
                          <Space size="small">
                            <Typography.Text type="secondary">
                              Lines
                            </Typography.Text>
                            <Space.Compact>
                              <AntInput
                                value={String(sub.lines ?? 2)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === "") {
                                    updateSubsection(index, { lines: 2 });
                                    return;
                                  }
                                  const v = parseInt(raw, 10);
                                  if (!Number.isNaN(v))
                                    updateSubsection(index, {
                                      lines: Math.min(10, Math.max(1, v)),
                                    });
                                }}
                                style={{ width: 44, textAlign: "center" }}
                              />
                              <AntDButton
                                type="default"
                                htmlType="button"
                                icon={subsectionAiLoadingIndex === index ? undefined : <Sparkles className="w-3 h-3" />}
                                loading={subsectionAiLoadingIndex === index}
                                onClick={() =>
                                  handleGenerateSubsectionAI(index)
                                }
                                disabled={
                                  subsectionAiLoadingIndex !== null ||
                                  !sub.title.trim()
                                }
                                className="!text-[#efaa1f] hover:!text-[#d97706] hover:!border-[#efaa1f] [&.ant-btn]:!h-8 [&.ant-btn]:!leading-[30px]"
                              >
                                {subsectionAiLoadingIndex === index
                                  ? "Generating…"
                                  : "Generate with AI"}
                              </AntDButton>
                            </Space.Compact>
                          </Space>
                        </div>
                      }
                    >
                      <AntInput.TextArea
                        value={sub.content}
                        onChange={(e) =>
                          updateSubsection(index, {
                            content: e.target.value,
                          })
                        }
                        placeholder="Content for this subsection..."
                        rows={3}
                        className="resize-y"
                      />
                    </Form.Item>
                  </Form>
                </Card>
              ))}

              <Form.Item className="mb-6">
                <AntDButton
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={addSubsection}
                  className="h-12 text-gray-500 hover:text-[#efaa1f] hover:border-[#efaa1f]"
                >
                  Add Subsection
                </AntDButton>
              </Form.Item>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
                <AntDButton
                  danger
                  onClick={() => navigate("/announcements")}
                  disabled={submitLoading}
                >
                  Cancel
                </AntDButton>
                <Space wrap>
                  <AntDButton
                    onClick={() => handleSubmit(true)}
                    disabled={submitLoading}
                  >
                    Save as Draft
                  </AntDButton>
                  <AntDButton
                    type="primary"
                    onClick={() => handleSubmit(hasScheduledPublish)}
                    loading={submitLoading}
                  >
                    {hasScheduledPublish ? "Schedule Announcement" : "Publish"}
                  </AntDButton>
                </Space>
              </div>
            </Form>
          </Card>
        </Space>
      </div>
    </MainLayout>
  );
};

export default AnnouncementForm;
