import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import MainLayout from "@/components/MainLayout";
import {
  Button,
  Tag,
  Modal,
  Popconfirm,
  Form,
  Input,
  Select,
  TimePicker,
  Switch,
  Radio,
  Alert,
  message,
  Typography,
  Card,
  Row,
  Col,
  Divider,
  Avatar,
  Empty,
  Space,
  Tooltip,
  Spin,
  Skeleton,
  Tabs,
  Table,
} from "antd";
import { theme } from "antd";
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StarOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  useGetCelebrationTemplatesQuery,
  useGetCelebrationTemplateByIdQuery,
  useGetUpcomingQuery,
  useCreateCelebrationTemplateMutation,
  useUpdateCelebrationTemplateMutation,
  useDeleteCelebrationTemplateMutation,
  useGenerateCelebrationMessageMutation,
  type CelebrationType,
} from "@/store/api/celebrationApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useAllDepartmentsForDropdown } from "@/hooks/useAllDepartmentsForDropdown";

const { useToken } = theme;
const { TextArea } = Input;
const { Text } = Typography;

const VARIABLE_CHIPS: Array<{ key: string; label: string; tooltip: string; anniversaryOnly?: boolean }> = [
  { key: "staff_name", label: "{{staff_name}}", tooltip: "Staff's full name" },
  { key: "date", label: "{{date}}", tooltip: "Their special date" },
  { key: "years_of_service", label: "{{years_of_service}}", tooltip: "Years at company (anniversary only)", anniversaryOnly: true },
  { key: "company_name", label: "{{company_name}}", tooltip: "Your company name" },
  { key: "department", label: "{{department}}", tooltip: "Staff's department" },
];

const TONE_PRESETS = [
  { value: "warm_friendly", label: "Warm & Friendly" },
  { value: "professional", label: "Professional" },
  { value: "humorous", label: "Humorous" },
  { value: "heartfelt", label: "Heartfelt" },
  { value: "motivational", label: "Motivational" },
];

function renderPreviewMessage(body: string, type: CelebrationType) {
  return body
    .replace(/\{\{staff_name\}\}/gi, "Alex")
    .replace(/\{\{date\}\}/g, type === "birthday" ? "Feb 26, 2025" : "Feb 26, 2020")
    .replace(/\{\{years_of_service\}\}/gi, "5")
    .replace(/\{\{company_name\}\}/gi, "Company Name")
    .replace(/\{\{department\}\}/gi, "Engineering");
}

/** Render message body with variables as highlighted <mark> segments for preview */
function renderPreviewMessageWithMarks(body: string, type: CelebrationType, token: { colorPrimaryBg: string }) {
  const replaced = renderPreviewMessage(body, type);
  const regex = /\{\{[^}]+\}\}/g;
  const parts: Array<{ text: string; isVar: boolean }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) {
    if (m.index > lastIndex) parts.push({ text: body.slice(lastIndex, m.index), isVar: false });
    const placeholder = m[0];
    const resolved = placeholder === "{{staff_name}}" ? "Alex" : placeholder === "{{date}}" ? (type === "birthday" ? "Feb 26, 2025" : "Feb 26, 2020") : placeholder === "{{years_of_service}}" ? "5" : placeholder === "{{company_name}}" ? "Company Name" : placeholder === "{{department}}" ? "Engineering" : placeholder;
    parts.push({ text: resolved, isVar: true });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < body.length) parts.push({ text: body.slice(lastIndex), isVar: false });
  return parts.map((p, i) =>
    p.isVar ? (
      <mark key={i} style={{ background: token.colorPrimaryBg, padding: "0 2px", borderRadius: 2 }}>
        {p.text}
      </mark>
    ) : (
      <span key={i}>{p.text}</span>
    )
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Format number as ordinal (1st, 2nd, 3rd, 23rd, 35th). */
function ordinal(n: number): string {
  const s = String(n);
  const last = s.slice(-1);
  const lastTwo = s.slice(-2);
  if (lastTwo === "11" || lastTwo === "12" || lastTwo === "13") return `${n}th`;
  if (last === "1") return `${n}st`;
  if (last === "2") return `${n}nd`;
  if (last === "3") return `${n}rd`;
  return `${n}th`;
}

/** Hash name to a small integer for avatar color index (0–4). */
function nameToColorIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h << 5) - h + name.charCodeAt(i);
  return Math.abs(h % 5);
}

/** Avatar background color from name (deterministic). */
function avatarColorFromName(name: string, token: { colorPrimary: string; colorInfo: string; colorWarning: string; colorSuccess: string; colorError: string }): string {
  const colors = [token.colorPrimary, token.colorInfo, token.colorWarning, token.colorSuccess, token.colorError];
  return colors[nameToColorIndex(name)] ?? token.colorPrimary;
}

/** Day of month as ordinal (e.g. 25 -> "25th"). */
function dayOrdinal(day: number): string {
  const s = String(day);
  const last = s.slice(-1);
  const lastTwo = s.slice(-2);
  if (lastTwo === "11" || lastTwo === "12" || lastTwo === "13") return `${day}th`;
  if (last === "1") return `${day}st`;
  if (last === "2") return `${day}nd`;
  if (last === "3") return `${day}rd`;
  return `${day}th`;
}

export default function AdminCelebrationPage() {
  const { token } = useToken();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const messageBodyRef = useRef<any>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState(false);
  const [tonePreset, setTonePreset] = useState("warm_friendly");
  const [toneDescription, setToneDescription] = useState("");
  const [form] = Form.useForm<{
    name: string;
    type: string;
    customTypeName: string;
    messageBody: string;
    sendTime: any;
    autoSend: boolean;
    assignAllStaff: boolean;
    assignmentType: "all" | "department" | "specific";
    assignedDepartmentIds: string[];
    assignedStaffIds: string[];
  }>();

  const [activeTab, setActiveTab] = useState<string>("upcoming");
  const [birthdayDeptFilter, setBirthdayDeptFilter] = useState<string | null>(null);
  const [anniversaryDeptFilter, setAnniversaryDeptFilter] = useState<string | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: templatesData, isLoading } = useGetCelebrationTemplatesQuery();
  const { data: templateByIdData } = useGetCelebrationTemplateByIdQuery(editingId ?? "", {
    skip: !editingId || !modalOpen,
  });
  const { data: upcomingData, isLoading: upcomingLoading } = useGetUpcomingQuery({ year, month });
  const [createTemplate, { isLoading: creating }] = useCreateCelebrationTemplateMutation();
  const [updateTemplate, { isLoading: updating }] = useUpdateCelebrationTemplateMutation();
  const [deleteTemplate, { isLoading: deleting }] = useDeleteCelebrationTemplateMutation();
  const [generateCelebrationMessage] = useGenerateCelebrationMessageMutation();
  const { data: staffData } = useGetStaffQuery({ limit: 500, page: 1 });
  const { departments: departmentOptionsForDropdown } = useAllDepartmentsForDropdown(modalOpen);

  const templates = templatesData?.data ?? [];
  const birthdays = upcomingData?.data?.birthdays ?? [];
  const anniversaries = upcomingData?.data?.anniversaries ?? [];

  const todayCelebrations = useMemo(() => {
    const list: Array<{ name: string; type: "birthday" | "anniversary"; date: string; department: string }> = [];
    birthdays.forEach((b: any) => {
      if (b.isToday && b.staff) {
        list.push({
          name: b.staff.name,
          type: "birthday",
          date: b.date,
          department: b.staff.department ?? "",
        });
      }
    });
    anniversaries.forEach((a: any) => {
      if (a.isToday && a.staff) {
        list.push({
          name: a.staff.name,
          type: "anniversary",
          date: a.date,
          department: a.staff.department ?? "",
        });
      }
    });
    return list;
  }, [birthdays, anniversaries]);

  const TABLE_PAGE_SIZE = 10;
  const filteredBirthdays = useMemo(() => {
    let list = birthdays;
    if (birthdayDeptFilter) {
      list = list.filter((b: any) => (b.staff?.department || "").toLowerCase() === birthdayDeptFilter.toLowerCase());
    }
    return list;
  }, [birthdays, birthdayDeptFilter]);
  const filteredAnniversaries = useMemo(() => {
    let list = anniversaries;
    if (anniversaryDeptFilter) {
      list = list.filter((a: any) => (a.staff?.department || "").toLowerCase() === anniversaryDeptFilter.toLowerCase());
    }
    return list;
  }, [anniversaries, anniversaryDeptFilter]);

  const birthdayDepartments = useMemo(() => {
    const set = new Set<string>();
    birthdays.forEach((b: any) => {
      if (b.staff?.department) set.add(b.staff.department);
    });
    return Array.from(set).sort();
  }, [birthdays]);
  const anniversaryDepartments = useMemo(() => {
    const set = new Set<string>();
    anniversaries.forEach((a: any) => {
      if (a.staff?.department) set.add(a.staff.department);
    });
    return Array.from(set).sort();
  }, [anniversaries]);

  const getDaysUntil = (dateStr: string) => {
    const d = dayjs(dateStr).startOf("day");
    const today = dayjs().startOf("day");
    return d.diff(today, "day");
  };
  const getRecencyBadge = (daysUntil: number, isToday: boolean) => {
    if (isToday) return { label: "Today", color: "green" };
    if (daysUntil >= 0 && daysUntil <= 7) return { label: "This Week", color: "gold" };
    if (daysUntil >= 0 && daysUntil <= 31) return { label: "This Month", color: "blue" };
    return null;
  };

  useEffect(() => {
    if (!modalOpen || !editingId || !templateByIdData?.data) return;
    const t = templateByIdData.data;
    const typeVal = t.type === "birthday" || t.type === "work_anniversary" ? t.type : "__custom__";
    form.setFieldsValue({
      name: t.name,
      type: typeVal,
      customTypeName: typeVal === "__custom__" ? t.type : "",
      messageBody: t.messageBody,
      sendTime: t.sendTime ? dayjs(t.sendTime, "HH:mm") : dayjs("09:00", "HH:mm"),
      autoSend: t.autoSend,
      assignAllStaff: t.assignAllStaff,
      assignmentType: t.assignAllStaff ? "all" : (t.assignedDepartmentIds?.length || (t as any).assignedDepartmentNames?.length ? "department" : "specific"),
      assignedDepartmentIds: [
        ...(t.assignedDepartmentIds ?? []),
        ...((t as any).assignedDepartmentNames ?? []).map((n: string) => `name:${n}`),
      ],
      assignedStaffIds: t.assignedStaffIds ?? [],
    });
  }, [modalOpen, editingId, templateByIdData, form]);

  const staffList = useMemo(() => staffData?.data?.staff ?? [], [staffData]);
  const staffOptions = useMemo(
    () => staffList.map((s: any) => ({ label: `${s.name} (${s.department})`, value: s._id })),
    [staffList]
  );

  const avatarColors = useMemo(
    () => [
      token.colorPrimary,
      token.colorSuccess,
      token.colorWarning,
      token.colorError,
      token.colorInfo,
    ],
    [token]
  );

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setAiPanelOpen(false);
    setGeneratedSuccess(false);
    setTonePreset("warm_friendly");
    setToneDescription("");
    form.resetFields();
    form.setFieldsValue({
      sendTime: dayjs("09:00", "HH:mm"),
      autoSend: true,
      assignAllStaff: true,
      assignmentType: "all",
      assignedDepartmentIds: [],
      assignedStaffIds: [],
      customTypeName: "",
    });
    setModalOpen(true);
  }, [form]);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setAiPanelOpen(false);
    form.resetFields();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const sendTimeStr = values.sendTime ? dayjs(values.sendTime).format("HH:mm") : "09:00";
      const assignmentType = values.assignmentType || (values.assignAllStaff ? "all" : "specific");
      const resolvedType =
        values.type === "__custom__"
          ? (values.customTypeName || "").trim()
          : values.type;
      if (!resolvedType) {
        message.error("Please enter a type name for the custom type.");
        return;
      }
      const rawDepts = assignmentType === "department" ? (values.assignedDepartmentIds || []) : [];
      const assignedDepartmentIds = rawDepts.filter((v: string) => !String(v).startsWith("name:"));
      const assignedDepartmentNames = rawDepts
        .filter((v: string) => String(v).startsWith("name:"))
        .map((v: string) => String(v).replace(/^name:/, ""));
      const payload = {
        name: values.name.trim(),
        type: resolvedType,
        messageBody: values.messageBody || "",
        sendTime: sendTimeStr,
        autoSend: values.autoSend,
        assignAllStaff: assignmentType === "all",
        assignedDepartmentIds,
        assignedDepartmentNames,
        assignedStaffIds: assignmentType === "specific" ? (values.assignedStaffIds || []) : [],
      };
      if (editingId) {
        await updateTemplate({ id: editingId, data: payload }).unwrap();
        message.success("Template updated");
      } else {
        await createTemplate(payload).unwrap();
        message.success("Template created");
      }
      handleModalClose();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.data?.error?.message || "Failed to save");
    }
  }, [form, editingId, updateTemplate, createTemplate, handleModalClose]);

  const handleToggleAutoSend = useCallback(
    async (template: { _id: string; autoSend: boolean }) => {
      try {
        await updateTemplate({ id: template._id, data: { autoSend: !template.autoSend } }).unwrap();
        message.success(template.autoSend ? "Auto send disabled" : "Auto send enabled");
      } catch (e: any) {
        message.error(e?.data?.error?.message || "Failed to update");
      }
    },
    [updateTemplate]
  );

  const handleConfirmDeleteTemplate = useCallback(
    async (templateId: string) => {
      try {
        await deleteTemplate(templateId).unwrap();
        message.success("Template deleted");
      } catch (e: any) {
        message.error(e?.data?.error?.message || "Failed to delete");
      }
    },
    [deleteTemplate]
  );

  const insertVariableAtCursor = useCallback(
    (variable: string) => {
      const textarea = messageBodyRef.current?.resizableTextArea?.textArea;
      const msg = form.getFieldValue("messageBody") || "";
      if (textarea && typeof textarea.selectionStart === "number") {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd ?? start;
        const before = msg.slice(0, start);
        const after = msg.slice(end);
        const next = before + variable + after;
        form.setFieldsValue({ messageBody: next });
        setTimeout(() => {
          textarea.focus();
          const newPos = start + variable.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 0);
      } else {
        form.setFieldsValue({ messageBody: msg + variable });
      }
    },
    [form]
  );

  const handleGenerateAI = useCallback(async () => {
    const typeField = form.getFieldValue("type") || "birthday";
    const type = typeField === "__custom__" ? (form.getFieldValue("customTypeName") || "").trim() || "work_anniversary" : typeField;
    setAiLoading(true);
    setGeneratedSuccess(false);
    try {
      const res = await generateCelebrationMessage({
        type: type as CelebrationType,
        tonePreset,
        toneDescription: toneDescription || undefined,
      }).unwrap();
      const fullText = res?.data?.message ?? "";
      if (fullText) {
        let i = 0;
        const chunkSize = 2;
        const run = () => {
          if (i >= fullText.length) {
            form.setFieldsValue({ messageBody: fullText });
            setAiLoading(false);
            setGeneratedSuccess(true);
            setTimeout(() => setGeneratedSuccess(false), 2000);
            return;
          }
          const slice = fullText.slice(0, i + chunkSize);
          i += chunkSize;
          form.setFieldsValue({ messageBody: slice });
          setTimeout(run, 30);
        };
        run();
      } else {
        setAiLoading(false);
      }
    } catch (e: any) {
      message.error(e?.data?.error?.message || "Failed to generate");
      setAiLoading(false);
    }
  }, [form, tonePreset, toneDescription, generateCelebrationMessage]);

  const previewBody = Form.useWatch("messageBody", form) ?? "";
  const watchedType = Form.useWatch("type", form) ?? "birthday";
  const customTypeName = Form.useWatch("customTypeName", form) ?? "";
  const previewType = watchedType === "birthday" ? "birthday" : "work_anniversary";
  const previewGreeting =
    watchedType === "birthday"
      ? "Happy Birthday, Alex!"
      : watchedType === "work_anniversary"
        ? "Happy Anniversary, Alex!"
        : customTypeName.trim()
          ? `Happy ${customTypeName.trim()}, Alex!`
          : "Happy Anniversary, Alex!";
  const previewEmojiOrIcon = watchedType === "birthday" ? "🎂" : watchedType === "work_anniversary" ? <TrophyOutlined style={{ fontSize: 40, color: token.colorPrimary }} /> : <StarOutlined style={{ fontSize: 40, color: token.colorWarning }} />;
  const previewThemeBg = watchedType === "birthday" ? token.colorPrimaryBg : token.colorInfoBg;
  const previewSendTime = Form.useWatch("sendTime", form);
  const previewAutoSend = Form.useWatch("autoSend", form);

  return (
    <MainLayout>
      <div style={{ padding: 24, background: "#fff", minHeight: "100%" }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Typography.Title level={4} style={{ margin: 0, color: token.colorTextHeading }}>
              Celebration
            </Typography.Title>
          </Col>
        </Row>

        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Typography.Title level={4} style={{ margin: 0, color: token.colorTextHeading }}>
              Celebration
            </Typography.Title>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="celebration-page-tabs"
          size="middle"
          items={[
            {
              key: "upcoming",
              label: <span style={{ fontWeight: 500 }}>Upcoming Celebrations</span>,
              children: (
                <div style={{ paddingTop: 8 }}>
                  {/* Today's Celebrations banner */}
                  <Card
                    loading={upcomingLoading}
                    style={{
                      marginBottom: 24,
                      borderRadius: token.borderRadiusLG,
                      overflow: "hidden",
                      border: `1px solid ${token.colorBorderSecondary}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      background: todayCelebrations.length > 0
                        ? `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorSuccessBg} 50%, ${token.colorWarningBg} 100%)`
                        : token.colorBgContainer,
                    }}
                    styles={{ body: { padding: 0 } }}
                  >
                    <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 32 }}>🎉</span>
                        <div>
                          <Typography.Text strong style={{ fontSize: 16, color: token.colorTextHeading }}>
                            Today&apos;s Celebrations
                          </Typography.Text>
                          {todayCelebrations.length > 0 && (
                            <div style={{ marginTop: 4 }}>
                              {todayCelebrations.map((c, i) => (
                                <Tag
                                  key={i}
                                  color={c.type === "birthday" ? "gold" : "cyan"}
                                  style={{ marginRight: 8, marginBottom: 4 }}
                                >
                                  {c.type === "birthday" ? "🎂" : "🌟"} {c.name}
                                  {c.department ? ` · ${c.department}` : ""}
                                </Tag>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {todayCelebrations.length === 0 && !upcomingLoading && (
                        <Typography.Text type="secondary">No celebrations today</Typography.Text>
                      )}
                    </div>
                  </Card>

                  {/* Tables side by side */}
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                  {/* Table 1: Upcoming Birthdays */}
                  <Card
                    title={
                      <span style={{ fontWeight: 600, fontSize: 16 }}>Upcoming Birthdays</span>
                    }
                    style={{
                      marginBottom: 0,
                      borderRadius: token.borderRadiusLG,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      border: `1px solid ${token.colorBorderSecondary}`,
                      height: "100%",
                    }}
                    extra={
                      birthdayDepartments.length > 0 && (
                        <Select
                          placeholder="Filter by department"
                          allowClear
                          style={{ width: 200 }}
                          value={birthdayDeptFilter ?? ""}
                          onChange={(v) => setBirthdayDeptFilter(v || null)}
                          options={[{ value: "", label: "All departments" }, ...birthdayDepartments.map((d) => ({ value: d, label: d }))]}
                        />
                      )
                    }
                  >
                    {filteredBirthdays.length === 0 ? (
                      <Empty description="No upcoming birthdays" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />
                    ) : (
                      <>
                        <Table
                          dataSource={filteredBirthdays.slice(0, TABLE_PAGE_SIZE)}
                          rowKey={(r: any) => `b-${r.staff?._id}`}
                          loading={upcomingLoading}
                          pagination={false}
                          size="small"
                          rowClassName={(r: any) => {
                            const days = getDaysUntil(r.date);
                            if (r.isToday || (days >= 0 && days <= 7)) return "celebration-row-highlight";
                            return "";
                          }}
                          columns={[
                            {
                              title: "Employee",
                              key: "employee",
                              width: 220,
                              render: (_: any, r: any) => (
                                <Space>
                                  <Avatar size="small" style={{ background: avatarColorFromName(r.staff?.name ?? "", token) }}>
                                    {getInitials(r.staff?.name ?? "?")}
                                  </Avatar>
                                  <span>{r.staff?.name ?? "—"}</span>
                                </Space>
                              ),
                            },
                            { title: "Department", dataIndex: ["staff", "department"], key: "dept", width: 140, render: (v: string) => v || "—" },
                            {
                              title: "Birthday Date",
                              key: "date",
                              width: 130,
                              render: (_: any, r: any) => (r.date ? dayjs(r.date).format("DD MMM YYYY") : "—"),
                            },
                            {
                              title: "Days Until",
                              key: "daysUntil",
                              width: 100,
                              render: (_: any, r: any) => {
                                const days = getDaysUntil(r.date);
                                if (days < 0) return "—";
                                if (days === 0) return <Tag color="green">Today</Tag>;
                                return days;
                              },
                            },
                            {
                              title: "",
                              key: "badge",
                              width: 120,
                              render: (_: any, r: any) => {
                                const days = getDaysUntil(r.date);
                                const badge = getRecencyBadge(days, r.isToday);
                                if (!badge) return null;
                                return <Tag color={badge.color}>{badge.label}</Tag>;
                              },
                            },
                          ]}
                        />
                        {filteredBirthdays.length > TABLE_PAGE_SIZE && (
                          <div style={{ marginTop: 12, textAlign: "center" }}>
                            <Typography.Text type="secondary">
                              Showing {TABLE_PAGE_SIZE} of {filteredBirthdays.length}. View all in list.
                            </Typography.Text>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                  {/* Table 2: Upcoming Anniversaries */}
                  <Card
                    title={
                      <span style={{ fontWeight: 600, fontSize: 16 }}>Upcoming Anniversaries</span>
                    }
                    style={{
                      marginBottom: 0,
                      borderRadius: token.borderRadiusLG,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      border: `1px solid ${token.colorBorderSecondary}`,
                      height: "100%",
                    }}
                    extra={
                      anniversaryDepartments.length > 0 && (
                        <Select
                          placeholder="Filter by department"
                          allowClear
                          style={{ width: 200 }}
                          value={anniversaryDeptFilter ?? ""}
                          onChange={(v) => setAnniversaryDeptFilter(v || null)}
                          options={[{ value: "", label: "All departments" }, ...anniversaryDepartments.map((d) => ({ value: d, label: d }))]}
                        />
                      )
                    }
                  >
                    {filteredAnniversaries.length === 0 ? (
                      <Empty description="No upcoming anniversaries" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />
                    ) : (
                      <>
                        <Table
                          dataSource={filteredAnniversaries.slice(0, TABLE_PAGE_SIZE)}
                          rowKey={(r: any) => `a-${r.staff?._id}`}
                          loading={upcomingLoading}
                          pagination={false}
                          size="small"
                          rowClassName={(r: any) => {
                            const days = getDaysUntil(r.date);
                            if (r.isToday || (days >= 0 && days <= 7)) return "celebration-row-highlight";
                            return "";
                          }}
                          columns={[
                            {
                              title: "Employee",
                              key: "employee",
                              width: 220,
                              render: (_: any, r: any) => (
                                <Space>
                                  <Avatar size="small" style={{ background: avatarColorFromName(r.staff?.name ?? "", token) }}>
                                    {getInitials(r.staff?.name ?? "?")}
                                  </Avatar>
                                  <span>{r.staff?.name ?? "—"}</span>
                                </Space>
                              ),
                            },
                            { title: "Department", dataIndex: ["staff", "department"], key: "dept", width: 140, render: (v: string) => v || "—" },
                            {
                              title: "Anniversary Date",
                              key: "date",
                              width: 140,
                              render: (_: any, r: any) => (r.date ? dayjs(r.date).format("DD MMM YYYY") : "—"),
                            },
                            {
                              title: "Years Completing",
                              key: "years",
                              width: 120,
                              render: (_: any, r: any) =>
                                r.yearsOfService != null ? (
                                  <Tag color="success">{r.yearsOfService} {r.yearsOfService === 1 ? "yr" : "yrs"}</Tag>
                                ) : (
                                  "—"
                                ),
                            },
                            {
                              title: "Days Until",
                              key: "daysUntil",
                              width: 100,
                              render: (_: any, r: any) => {
                                const days = getDaysUntil(r.date);
                                if (days < 0) return "—";
                                if (days === 0) return <Tag color="green">Today</Tag>;
                                return days;
                              },
                            },
                            {
                              title: "",
                              key: "badge",
                              width: 120,
                              render: (_: any, r: any) => {
                                const days = getDaysUntil(r.date);
                                const badge = getRecencyBadge(days, r.isToday);
                                if (!badge) return null;
                                return <Tag color={badge.color}>{badge.label}</Tag>;
                              },
                            },
                          ]}
                        />
                        {filteredAnniversaries.length > TABLE_PAGE_SIZE && (
                          <div style={{ marginTop: 12, textAlign: "center" }}>
                            <Typography.Text type="secondary">
                              Showing {TABLE_PAGE_SIZE} of {filteredAnniversaries.length}. View all in list.
                            </Typography.Text>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: "templates",
              label: <span style={{ fontWeight: 500 }}>Templates</span>,
              children: (
                <div style={{ marginTop: 8 }}>
        {/* Templates list in card view */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
            paddingBottom: 16,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Text strong style={{ fontSize: 18, color: token.colorTextHeading }}>
              Your templates
            </Text>
            {templates.length > 0 && (
              <Tag style={{ margin: 0 }}>{templates.length} template{templates.length !== 1 ? "s" : ""}</Tag>
            )}
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Create Template
          </Button>
        </div>
        {templates.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No templates yet. Create one to send birthday or anniversary wishes."
            style={{ padding: "48px 24px", background: token.colorFillQuaternary, borderRadius: token.borderRadiusLG }}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large">
              Create Template
            </Button>
          </Empty>
        ) : (
          <Row gutter={[20, 20]}>
            {templates.map((t: any) => {
              const isBirthday = t.type === "birthday";
              const isAnniversary = t.type === "work_anniversary";
              const accentColor = isBirthday ? token.colorWarning : isAnniversary ? token.colorPrimary : token.colorTextSecondary;
              const TypeIcon = isBirthday ? StarOutlined : isAnniversary ? TrophyOutlined : FileTextOutlined;
              const typeLabel = isBirthday ? "Birthday" : isAnniversary ? "Anniversary" : t.type || "—";
              const messagePreview = (t.messageBody || "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 60);
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={t._id}>
                  <Card
                    hoverable
                    size="small"
                    style={{
                      height: "100%",
                      minHeight: 260,
                      borderRadius: token.borderRadiusLG,
                      overflow: "hidden",
                      border: `1px solid ${token.colorBorderSecondary}`,
                      boxShadow: "none",
                      transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                    }}
                    styles={{
                      body: { padding: 0, display: "flex", flexDirection: "column", flex: 1, minHeight: 260 },
                    }}
                    className="celebration-template-card"
                  >
                    {/* Accent bar */}
                    <div
                      style={{
                        height: 4,
                        background: `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}40 100%)`,
                        width: "100%",
                        flexShrink: 0,
                      }}
                    />
                    {/* Main content */}
                    <div
                      style={{
                        padding: "20px 20px 16px",
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: token.borderRadius,
                            background: `${accentColor}18`,
                            color: accentColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 22,
                            flexShrink: 0,
                          }}
                        >
                          <TypeIcon />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong ellipsis style={{ fontSize: 16, display: "block", lineHeight: 1.35, marginBottom: 6 }}>
                            {t.name}
                          </Text>
                          <Tag color={isBirthday ? "gold" : isAnniversary ? "blue" : "default"} style={{ margin: 0, fontSize: 11 }}>
                            {typeLabel}
                          </Tag>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 10px",
                          borderRadius: token.borderRadius,
                          background: token.colorFillTertiary,
                          width: "fit-content",
                        }}
                      >
                        <ClockCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 12 }} />
                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
                          Sends at {t.sendTime || "09:00"}
                        </Text>
                      </div>
                      {messagePreview ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: token.colorTextSecondary,
                            lineHeight: 1.45,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            flex: 1,
                            minHeight: 0,
                          }}
                        >
                          {messagePreview}
                          {(t.messageBody || "").trim().length > 60 ? "…" : ""}
                        </div>
                      ) : (
                        <div style={{ flex: 1, minHeight: 20 }} />
                      )}
                    </div>
                    {/* Footer: toggle + actions */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "12px 20px 16px",
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        background: token.colorFillQuaternary,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <Switch
                          size="small"
                          checked={t.autoSend}
                          onChange={() => handleToggleAutoSend(t)}
                          disabled={updating}
                        />
                        <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Auto send on day
                        </Text>
                      </div>
                      <Space size={4}>
                        <Tooltip title="Edit template">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setEditingId(t._id);
                              setModalOpen(true);
                            }}
                            className="celebration-template-card-action-icon"
                            style={{ color: token.colorTextSecondary }}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Delete template"
                          description={
                            <>
                              Are you sure you want to delete &quot;{t.name}&quot;? This cannot be undone.
                            </>
                          }
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleConfirmDeleteTemplate(t._id)}
                        >
                          <Tooltip title="Delete template (click to confirm)">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              loading={deleting}
                              className="celebration-template-card-action-icon celebration-template-card-action-icon-delete"
                              style={{ color: token.colorTextSecondary }}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        title={editingId ? "Edit Template" : "Create Template"}
        width={920}
        open={modalOpen}
        onCancel={handleModalClose}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: token.marginSM }}>
            <Button onClick={handleModalClose}>Cancel</Button>
            <Button type="primary" loading={creating || updating} onClick={handleSubmit}>
              Save Template
            </Button>
          </div>
        }
        destroyOnHidden
        styles={{
          body: { maxHeight: "72vh", overflow: "auto", paddingTop: token.paddingLG },
          header: { borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: token.paddingMD },
          footer: { borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: token.paddingMD },
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ autoSend: true, assignAllStaff: true, assignmentType: "all", assignedDepartmentIds: [], assignedStaffIds: [], customTypeName: "", sendTime: dayjs("09:00", "HH:mm") }}>
          <Row gutter={32}>
            <Col span={13}>
              <div style={{ marginBottom: token.marginLG }}>
                <Form.Item name="name" label="Template Name" rules={[{ required: true, message: "Required" }]} style={{ marginBottom: token.marginMD }}>
                  <Input placeholder="e.g. Birthday Wishes" size="large" />
                </Form.Item>
                <Form.Item name="type" label="Type" rules={[{ required: true, message: "Select or add a type" }]} style={{ marginBottom: token.marginXS }}>
                  <Select
                    size="large"
                    placeholder="Select type"
                    options={[
                      { value: "birthday", label: "Birthday", subtitle: "Sends on staff's birthday" },
                      { value: "work_anniversary", label: "Work Anniversary", subtitle: "Sends on joining date anniversary" },
                      { value: "__custom__", label: "Add new type", subtitle: "Define a custom celebration type" },
                    ]}
                    optionRender={(option) => {
                      const v = (option as any).value;
                      const icon = v === "birthday" ? <StarOutlined style={{ marginRight: 8, color: token.colorWarning }} /> : v === "work_anniversary" ? <TrophyOutlined style={{ marginRight: 8, color: token.colorPrimary }} /> : <PlusOutlined style={{ marginRight: 8 }} />;
                      return (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          {icon}
                          <div>
                            <div style={{ fontWeight: 500 }}>{(option as any).label}</div>
                            {(option as any).subtitle && <Text type="secondary" style={{ fontSize: 12 }}>{(option as any).subtitle}</Text>}
                          </div>
                        </div>
                      );
                    }}
                    onChange={(val) => {
                      if (val !== "__custom__") form.setFieldsValue({ customTypeName: "" });
                    }}
                  />
                </Form.Item>
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, curr) => prev.type !== curr.type}
                >
                  {({ getFieldValue }) =>
                    getFieldValue("type") === "__custom__" ? (
                      <Form.Item
                        name="customTypeName"
                        label="Type name"
                        rules={[{ required: true, message: "Enter the new type name" }, { whitespace: true, message: "Type name cannot be blank" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="e.g. Promotion, Retirement" size="large" maxLength={50} showCount />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </div>

              <div style={{ marginBottom: token.marginLG, padding: token.paddingMD, background: token.colorFillQuaternary, borderRadius: token.borderRadius, border: `1px solid ${token.colorBorderSecondary}` }}>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: token.marginSM }}>Insert Variables</Text>
                <Space wrap size={[8, 8]}>
                  {VARIABLE_CHIPS.map((chip) => {
                    const disabled = chip.anniversaryOnly && previewType === "birthday";
                    return (
                      <Tooltip key={chip.key} title={chip.tooltip}>
                        <Tag
                          color="processing"
                          style={{
                            cursor: disabled ? "not-allowed" : "pointer",
                            margin: 0,
                            opacity: disabled ? 0.5 : 1,
                            padding: "4px 10px",
                          }}
                          className="celebration-variable-chip"
                          onClick={() => !disabled && insertVariableAtCursor(chip.label)}
                        >
                          <PlusOutlined style={{ marginRight: 4 }} />
                          {chip.label}
                        </Tag>
                      </Tooltip>
                    );
                  })}
                </Space>
              </div>

              <div style={{ marginBottom: token.marginLG }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: token.marginXS }}>
                  <Text strong style={{ fontSize: token.fontSize }}>Message</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<ThunderboltOutlined />}
                    onClick={() => setAiPanelOpen((o) => !o)}
                    style={{ padding: 0, height: "auto", fontSize: token.fontSizeSM }}
                  >
                    Generate with AI
                  </Button>
                </div>
                <div
                  className="celebration-ai-panel"
                  style={{
                    maxHeight: aiPanelOpen ? 200 : 0,
                    marginBottom: aiPanelOpen ? token.marginMD : 0,
                    overflow: "hidden",
                    transition: "max-height 0.3s ease",
                    padding: aiPanelOpen ? token.paddingMD : 0,
                    background: token.colorFillQuaternary,
                    borderRadius: token.borderRadius,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <Input
                    size="small"
                    placeholder="Describe the tone (e.g. formal, fun, heartfelt)"
                    value={toneDescription}
                    onChange={(e) => setToneDescription(e.target.value)}
                    style={{ marginBottom: token.marginSM }}
                  />
                  <Select
                    size="small"
                    placeholder="Tone preset"
                    value={tonePreset}
                    onChange={setTonePreset}
                    options={TONE_PRESETS}
                    style={{ width: "100%", marginBottom: token.marginSM }}
                  />
                  <Button size="small" type="primary" loading={aiLoading} onClick={handleGenerateAI}>
                    Generate
                  </Button>
                </div>
                <Form.Item name="messageBody" style={{ marginBottom: token.marginXS }}>
                  <TextArea
                    ref={messageBodyRef}
                    rows={5}
                    showCount
                    maxLength={500}
                    placeholder="Hi {{staff_name}}, wishing you a wonderful {{date}}!..."
                    style={{ resize: "none" }}
                  />
                </Form.Item>
                <div style={{ marginTop: token.marginXS, minHeight: 20 }}>
                  {aiLoading && <Spin size="small" />}
                  {generatedSuccess && <Text type="success" style={{ fontSize: token.fontSizeSM }}>✓ Generated</Text>}
                  {!aiLoading && (previewBody || "").length > 0 && (
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      <a onClick={() => handleGenerateAI()}>Regenerate</a>
                    </Text>
                  )}
                </div>
              </div>

              <Divider style={{ margin: `${token.marginLG}px 0` }} />

              <div style={{ marginBottom: token.marginLG }}>
                <Text strong style={{ display: "block", marginBottom: token.marginMD, fontSize: token.fontSize }}>Schedule</Text>
                <Form.Item name="sendTime" label="Send Time" style={{ marginBottom: token.marginMD }}>
                  <TimePicker format="HH:mm" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="autoSend" valuePropName="checked" label="Automatically send on the day" style={{ marginBottom: 0 }}>
                  <Switch />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.autoSend !== curr.autoSend}>
                  {({ getFieldValue }) =>
                    getFieldValue("autoSend") === false ? (
                      <Alert type="info" showIcon message="You can manually trigger sends from the dashboard" style={{ marginTop: token.marginMD }} />
                    ) : null
                  }
                </Form.Item>
              </div>

              <Divider style={{ margin: `${token.marginLG}px 0` }} />

              <div>
                <Text strong style={{ display: "block", marginBottom: token.marginMD, fontSize: token.fontSize }}>Assign Staff</Text>
                <Form.Item name="assignmentType" style={{ marginBottom: token.marginMD }}>
                  <Radio.Group
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { value: "all", label: "All Staff" },
                      { value: "department", label: "By Department" },
                      { value: "specific", label: "Specific Staff" },
                    ]}
                    onChange={() => form.setFieldsValue({ assignedDepartmentIds: [], assignedStaffIds: [] })}
                  />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.assignmentType !== curr.assignmentType}>
                  {({ getFieldValue }) => {
                    const assignmentType = getFieldValue("assignmentType") || "all";
                    const byDept = assignmentType === "department";
                    const byStaff = assignmentType === "specific";
                    const assignedDepartments = getFieldValue("assignedDepartmentIds") || [];
                    const staffIds = getFieldValue("assignedStaffIds") || [];
                    const deptOptions = departmentOptionsForDropdown.map((d) => ({ label: d.label, value: d.value }));
                    return (
                      <>
                        <div className="celebration-assign-staff-expand" style={{ maxHeight: byDept ? 140 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
                          {byDept && (
                            <>
                              <Form.Item name="assignedDepartmentIds" label="Select departments" rules={[{ required: true, message: "Select at least one department" }]}>
                                <Select mode="multiple" placeholder="Search departments..." options={deptOptions} allowClear showSearch optionFilterProp="label" listHeight={400} dropdownStyle={{ maxHeight: 400, overflowY: "auto" }} />
                              </Form.Item>
                              {assignedDepartments.length > 0 && <Tag color="processing">{assignedDepartments.length} department{assignedDepartments.length !== 1 ? "s" : ""} selected</Tag>}
                            </>
                          )}
                        </div>
                        <div className="celebration-assign-staff-expand" style={{ maxHeight: byStaff ? 220 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
                          {byStaff && (
                            <>
                              <Form.Item name="assignedStaffIds" label="Select staff" rules={[{ required: true, message: "Select at least one staff" }]}>
                                <Select
                                  mode="multiple"
                                  placeholder="Search employees"
                                  options={staffOptions}
                                  allowClear
                                  showSearch
                                  optionFilterProp="label"
                                  optionRender={(opt) => {
                                    const s = staffList.find((x: any) => x._id === opt.value);
                                    return (
                                      <Space>
                                        <Avatar size="small" style={{ background: avatarColors[nameToColorIndex(s?.name ?? "")] }}>{getInitials(s?.name ?? "?")}</Avatar>
                                        <span>{s?.name}</span>
                                        <Text type="secondary">{s?.department}</Text>
                                      </Space>
                                    );
                                  }}
                                />
                              </Form.Item>
                              {staffIds.length > 0 && <Tag color="processing">{staffIds.length} staff selected</Tag>}
                            </>
                          )}
                        </div>
                      </>
                    );
                  }}
                </Form.Item>
              </div>
            </Col>
            <Col span={10}>
              <div style={{ position: "sticky", top: 0, paddingLeft: token.paddingMD }}>
                <Text type="secondary" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: token.marginSM }}>
                  Live Preview
                </Text>
                <Card
                  size="small"
                  style={{
                    boxShadow: token.boxShadowTertiary,
                    borderRadius: token.borderRadiusLG,
                    overflow: "hidden",
                    border: `1px solid ${token.colorBorder}`,
                  }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div
                    style={{
                      background: previewThemeBg,
                      padding: token.paddingLG,
                      textAlign: "center",
                    }}
                  >
                    <span className="celebration-preview-emoji" style={{ fontSize: 40, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {previewEmojiOrIcon}
                    </span>
                  </div>
                  <div style={{ padding: token.paddingLG }}>
                    <Typography.Title level={4} style={{ margin: "0 0 12px", color: token.colorTextHeading, fontSize: token.fontSizeHeading4 }}>
                      {previewGreeting}
                    </Typography.Title>
                    {!(previewBody || "").trim() ? (
                      <Skeleton active paragraph={{ rows: 3 }} />
                    ) : (
                      <div style={{ color: token.colorTextSecondary, whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: token.fontSize }}>
                        {renderPreviewMessageWithMarks(previewBody, previewType, token)}
                      </div>
                    )}
                    <Row justify="space-between" align="middle" style={{ marginTop: token.marginMD, fontSize: token.fontSizeSM, color: token.colorTextSecondary }}>
                      <span>From: Company Name</span>
                      <span>Sends at {previewSendTime ? dayjs(previewSendTime).format("HH:mm") : "09:00"}</span>
                    </Row>
                    <Divider style={{ margin: `${token.marginMD}px 0` }} />
                    <Row align="middle" gutter={8} wrap={false}>
                      {watchedType === "birthday" ? (
                        <Tag icon={<StarOutlined />} color="gold" style={{ margin: 0 }}>Birthday</Tag>
                      ) : watchedType === "work_anniversary" ? (
                        <Tag icon={<TrophyOutlined />} color="blue" style={{ margin: 0 }}>Anniversary</Tag>
                      ) : (
                        <Tag color="purple" style={{ margin: 0 }}>{customTypeName.trim() || "Custom"}</Tag>
                      )}
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>Auto-send: {previewAutoSend ? "ON" : "OFF"}</Text>
                    </Row>
                  </div>
                </Card>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: token.marginSM, lineHeight: 1.4 }}>
                  This is how the notification will appear to the staff member.
                </Text>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>
      <style>{`
        .celebration-page-tabs.ant-tabs .ant-tabs-ink-bar { background: var(--ant-color-primary); }
        .celebration-page-tabs.ant-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn { color: var(--ant-color-primary); }
        .celebration-row-highlight { background: rgba(46, 125, 50, 0.08) !important; }
      `}</style>
    </MainLayout>
  );
}
