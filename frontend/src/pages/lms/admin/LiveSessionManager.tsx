import React, { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import {
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Row,
  Col,
  Divider,
  Empty,
  Descriptions,
  Tabs,
  Card,
  Rate,
} from "antd";
import {
  VideoCameraOutlined,
  PlusOutlined,
  CalendarOutlined,
  LinkOutlined,
  DeleteOutlined,
  EditOutlined,
  PoweroffOutlined,
  FileTextOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  UserOutlined,
  DownOutlined,
  UpOutlined,
  ClockCircleOutlined,
  LaptopOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import SessionCardList from "@/components/lms/SessionCardList";
import { LmsKpiCard } from "@/components/lms/SharedComponents";
import { lmsService } from "@/services/lmsService";
import dayjs from "dayjs";
import {
  disabledDatePast,
  disabledTimePastWhenToday,
} from "@/utils/dateTimePickerUtils";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useAppSelector } from "@/store/hooks";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const LiveSessionManager = () => {
  const { user } = useAppSelector((state: any) => state.auth);
  const currentUserId = user?.id ?? user?._id ?? undefined;
  const currentUserName =
    user?.name ??
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : (user?.firstName ?? user?.email ?? ""));

  // State
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEndConfirmModalOpen, setIsEndConfirmModalOpen] = useState(false);
  const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false);
  const [isDurationCompletedModal, setIsDurationCompletedModal] =
    useState(false); // true when modal was opened by auto-complete
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOnlySessionId, setViewOnlySessionId] = useState<string | null>(
    null,
  );
  const [endSessionId, setEndSessionId] = useState<string | null>(null);
  const [endSessionRecord, setEndSessionRecord] = useState<any>(null);
  const [sessionLogRecord, setSessionLogRecord] = useState<any | null>(null);
  const [participantRemarks, setParticipantRemarks] = useState<
    { employeeName: string; issues: string; leftAt?: string }[]
  >([]);
  const [participantRemarksLoading, setParticipantRemarksLoading] =
    useState(false);
  const [cancelSessionModalSession, setCancelSessionModalSession] = useState<
    any | null
  >(null);

  // Forms
  const [form] = Form.useForm();
  const [endSessionForm] = Form.useForm();
  const [cancelReasonForm] = Form.useForm();

  // Data for dropdowns
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // UI State for Conditional Fields
  const [assignmentType, setAssignmentType] = useState("All");
  const [sessionType, setSessionType] = useState("Online");

  // Watch assignment type for UI
  const selectedAssignmentType = Form.useWatch("assignmentType", form);

  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<string>("Scheduled");
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(
    new Set(),
  );
  const [showAgendaForSessionId, setShowAgendaForSessionId] = useState<
    string | null
  >(null);
  const [showParticipantsForSessionId, setShowParticipantsForSessionId] =
    useState<string | null>(null);
  const [remarksModalSession, setRemarksModalSession] = useState<any>(null);
  const { isMobile } = useBreakpoint();

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
        setShowAgendaForSessionId(null);
        setShowParticipantsForSessionId(null);
      } else next.add(sessionId);
      return next;
    });
  };

  const getParticipantList = (session: any): { name: string }[] => {
    if (session.assignmentType === "All") return [];
    if (session.assignmentType === "Department") return [];
    const arr = session.assignedEmployees || [];
    return arr.map((emp: any) => ({
      name:
        emp?.name ||
        [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") ||
        emp?.email ||
        "—",
    }));
  };

  // Backend status (Completed/Cancelled) = Ended so ending a session moves it to Ended tab
  const getSessionStatus = (session: any): "Upcoming" | "Live" | "Ended" => {
    if (session.status === "Completed" || session.status === "Cancelled")
      return "Ended";
    const now = dayjs();
    const start = dayjs(session.dateTime);
    const end = start.add(session.duration || 60, "minute");
    if (now.isBefore(start)) return "Upcoming";
    if (now.isBefore(end) || now.isSame(end)) return "Live";
    return "Ended";
  };
  const getCountdownMinutes = (session: any) =>
    dayjs(session.dateTime).diff(dayjs(), "minute");

  /** True when current time >= session start + duration (for auto-complete) */
  const isSessionExpired = (session: any) => {
    const start = new Date(session.dateTime).getTime();
    const durationMinutes = session.duration ?? 60;
    const sessionEnd = start + durationMinutes * 60 * 1000;
    return Date.now() >= sessionEnd;
  };

  const CATEGORY_COLORS: Record<string, string> = {
    "Normal Session": "blue",
    Training: "green",
    "Live Assessment": "orange",
    "Product Demo": "purple",
    Announcement: "cyan",
  };
  const getFilteredSessionsByTab = (tabKey: string) => {
    const list = (sessions as any[]).filter((s) => {
      const status = getSessionStatus(s);
      if (tabKey === "Scheduled")
        return status === "Upcoming" || status === "Live";
      return status === "Ended";
    });
    return tabKey === "Scheduled"
      ? list.sort(
          (a, b) =>
            new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
        )
      : list.sort(
          (a, b) =>
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
        );
  };

  const getParticipantCount = (session: any) => {
    if (session.assignmentType === "All") return "All";
    const arr = session.assignedEmployees;
    return Array.isArray(arr) ? arr.length : 0;
  };

  const isSessionHost = (session: any) => {
    const trainerId = session.trainerId?._id ?? session.trainerId;
    if (!trainerId || !currentUserId) return false;
    return String(trainerId) === String(currentUserId);
  };

  const isAdmin = user?.role === "Admin" || user?.role === "Super Admin";
  const canCancelSession = (session: any) => isSessionHost(session) || isAdmin;

  const renderExpandedSession = (session: any) => {
    const status = getSessionStatus(session);
    const isUpcoming = status === "Upcoming";
    const isLive = status === "Live";
    const isEnded = status === "Ended";
    const countdown = getCountdownMinutes(session);
    const infoText = isUpcoming
      ? countdown > 0
        ? `Session has not started yet. Starts in ${countdown} minutes`
        : "Session has not started yet."
      : isEnded
        ? "This session has ended."
        : isLive
          ? "Session is live."
          : "";
    return (
      <div
        className="session-expanded-inner pt-1 pb-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Divider className="session-card-divider" />
        <div className="session-expanded-toolbar session-expanded-single-row">
          <div className="session-expanded-left">
            <span className="session-expanded-info text-sm text-gray-600">
              {infoText}
            </span>
            {session.platform && (
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <LaptopOutlined className="text-gray-400" />
                <strong>Platform:</strong> {session.platform}
              </span>
            )}
            {isEnded && session.participantRemarks?.length > 0 && (
              <Button
                type="default"
                size="middle"
                icon={<FileTextOutlined />}
                onClick={() => setRemarksModalSession(session)}
              >
                Remarks
              </Button>
            )}
            <Button
              type={
                showAgendaForSessionId === session._id ? "primary" : "default"
              }
              size="middle"
              icon={<UnorderedListOutlined />}
              onClick={() =>
                setShowAgendaForSessionId((id) =>
                  id === session._id ? null : session._id,
                )
              }
            >
              Agenda
            </Button>
            <Button
              type={
                showParticipantsForSessionId === session._id
                  ? "primary"
                  : "default"
              }
              size="middle"
              icon={<TeamOutlined />}
              onClick={() =>
                setShowParticipantsForSessionId((id) =>
                  id === session._id ? null : session._id,
                )
              }
            >
              Participants
            </Button>
          </div>
          <div className="session-expanded-right">
            {isUpcoming && canCancelSession(session) && (
              <Space size="small" style={{ gap: 8 }}>
                {isSessionHost(session) && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleStartSession(session)}
                  >
                    Start Session
                  </Button>
                )}
                <Button
                  size="large"
                  danger
                  icon={<StopOutlined />}
                  onClick={() => handleCancelSession(session)}
                >
                  Cancel Session
                </Button>
              </Space>
            )}
            {isLive && isSessionHost(session) && (
              <Space size="small" style={{ gap: 8 }}>
                {session.meetingLink && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlayCircleOutlined />}
                    onClick={() => window.open(session.meetingLink, "_blank")}
                  >
                    Start Session
                  </Button>
                )}
                <Button
                  size="large"
                  icon={<PoweroffOutlined />}
                  className="text-orange-600 hover:text-orange-700 border-orange-300"
                  onClick={() => handleEndSession(session)}
                >
                  End Session
                </Button>
              </Space>
            )}
            {isLive && !isSessionHost(session) && session.meetingLink && (
              <Button
                type="primary"
                size="large"
                icon={<VideoCameraOutlined />}
                className="session-btn-join"
                onClick={() => window.open(session.meetingLink, "_blank")}
              >
                Join Session
              </Button>
            )}
            {isEnded && session.recordingUrl && (
              <Button
                type="default"
                size="large"
                icon={<VideoCameraOutlined />}
                onClick={() => window.open(session.recordingUrl, "_blank")}
              >
                Watch Recording
              </Button>
            )}
          </div>
        </div>
        {showAgendaForSessionId === session._id && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <Text
              type="secondary"
              className="text-xs font-semibold uppercase tracking-wider block mb-1"
            >
              Agenda
            </Text>
            {session.agenda ? (
              <Paragraph className="mb-0 text-gray-600 text-sm whitespace-pre-wrap">
                {session.agenda}
              </Paragraph>
            ) : (
              <Text type="secondary">No agenda set for this session.</Text>
            )}
          </div>
        )}
        {showParticipantsForSessionId === session._id && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-100">
            <Text
              type="secondary"
              className="text-xs font-semibold uppercase tracking-wider block mb-2"
            >
              Participants
            </Text>
            {session.assignmentType === "All" && (
              <Text className="text-gray-600">
                All employees are assigned to this session.
              </Text>
            )}
            {session.assignmentType === "Department" && (
              <Text className="text-gray-600">
                Assigned by department. Participants are not listed
                individually.
              </Text>
            )}
            {session.assignmentType === "Individual" &&
              (() => {
                const list = getParticipantList(session);
                if (list.length === 0)
                  return (
                    <Text className="text-gray-600">
                      No participants listed.
                    </Text>
                  );
                return (
                  <ul className="list-none pl-0 space-y-1.5">
                    {list.map((p: { name: string }, i: number) => (
                      <li key={i} className="flex items-center gap-2 py-1">
                        <UserOutlined className="text-gray-400" />
                        <span className="text-sm">{p.name}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
          </div>
        )}
        <Space
          direction="vertical"
          size="middle"
          className="session-card-details w-full"
        >
          {session.description && (
            <div className="flex gap-2">
              <FileTextOutlined className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <Text
                  type="secondary"
                  className="text-xs font-semibold uppercase tracking-wider block mb-0.5"
                >
                  Description
                </Text>
                <Paragraph className="mb-0 text-gray-600 text-sm">
                  {session.description}
                </Paragraph>
              </div>
            </div>
          )}
        </Space>
      </div>
    );
  };

  const adminLiveColumnHeaders = (
    <>
      <div className="session-card-header-cell session-card-header-title">
        <span
          className="session-card-chevron session-card-chevron-placeholder"
          aria-hidden
        >
          {" "}
        </span>
        <span className="session-cards-column-header-label">Session Title</span>
      </div>
      <div className="session-card-header-cell session-card-header-type">
        <span className="session-cards-column-header-label">Type</span>
      </div>
      <div className="session-card-header-cell session-card-header-sessionat">
        <span className="session-cards-column-header-label">Session At</span>
      </div>
      <div className="session-card-header-cell session-card-header-assignedat">
        <span className="session-cards-column-header-label">Assigned At</span>
      </div>
      <div className="session-card-header-cell session-card-header-duration">
        <span className="session-cards-column-header-label">Duration</span>
      </div>
      <div className="session-card-header-cell session-card-header-host">
        <span className="session-cards-column-header-label">Hosted By</span>
      </div>
      <div className="session-card-header-cell session-card-header-status">
        <span className="session-cards-column-header-label">Status</span>
      </div>
      <div className="session-card-header-cell session-card-header-action">
        <span className="session-cards-column-header-label">Action</span>
      </div>
    </>
  );

  const renderSessionList = (
    list: any[],
    emptyPrimary: string,
    emptySecondary: string,
  ) => (
    <SessionCardList
      list={list}
      getItemId={(s) => s._id}
      expandedIds={expandedSessionIds}
      onToggleExpand={toggleSessionExpand}
      columnHeaders={adminLiveColumnHeaders}
      renderCardHeader={(session, isExpanded) => {
        const status = getSessionStatus(session);
        const isLive = status === "Live";
        const isEnded = status === "Ended";
        const label =
          status === "Upcoming"
            ? "Upcoming"
            : status === "Live"
              ? "Live Now"
              : "Ended";
        const typeColor = CATEGORY_COLORS[session.category] || "blue";
        return (
          <>
            <div className="session-card-header-cell session-card-header-title">
              <span className="session-card-chevron">
                {isExpanded ? <UpOutlined /> : <DownOutlined />}
              </span>
              <Text strong className="session-card-title">
                {session.title}
              </Text>
            </div>
            <div
              className="session-card-header-cell session-card-header-type"
              data-label="Type"
            >
              <Tag color={typeColor} className="session-card-type-tag">
                {session.category || "—"}
              </Tag>
            </div>
            <div
              className="session-card-header-cell session-card-header-sessionat"
              data-label="Session At"
            >
              {session.dateTime ? (
                <div className="date-time-cell">
                  <span className="date-icon">
                    <ClockCircleOutlined className="text-gray-400" />
                  </span>
                  <span className="date-text">
                    {dayjs(session.dateTime).format("D MMM YYYY")}
                  </span>
                  <span className="time-separator"> · </span>
                  <span className="time-text">
                    {dayjs(session.dateTime).format("h:mm A")}
                  </span>
                </div>
              ) : (
                "—"
              )}
            </div>
            <div
              className="session-card-header-cell session-card-header-assignedat"
              data-label="Assigned At"
            >
              {session.createdAt ? (
                <div className="date-time-cell">
                  <span className="date-text">
                    {dayjs(session.createdAt).format("D MMM YYYY")}
                  </span>
                </div>
              ) : (
                "—"
              )}
            </div>
            <div
              className="session-card-header-cell session-card-header-duration"
              data-label="Duration"
            >
              {session.duration != null ? `${session.duration} min` : "—"}
            </div>
            <div
              className="session-card-header-cell session-card-header-host"
              data-label="Hosted By"
            >
              <span className="host-icon">
                <UserOutlined className="text-gray-400" />
              </span>{" "}
              {(session.trainerName || "—").toString()}
            </div>
            <div
              className={`session-card-header-cell session-card-header-status ${isLive ? "session-card-status-live" : ""}`}
              data-label="Status"
            >
              {label}
            </div>
            <div
              className="session-card-header-cell session-card-header-action"
              onClick={(e) => e.stopPropagation()}
              data-label="Action"
            >
              {isEnded ? (
                <Button
                  type="default"
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    setSessionLogRecord(session);
                    if (session.hasRemarks) {
                      setParticipantRemarksLoading(true);
                      setParticipantRemarks([]);
                      lmsService
                        .getParticipantRemarks(session._id)
                        .then((res: any) => {
                          setParticipantRemarks(res?.data || []);
                        })
                        .catch(() => setParticipantRemarks([]))
                        .finally(() => setParticipantRemarksLoading(false));
                    } else {
                      setParticipantRemarks([]);
                    }
                  }}
                >
                  Session Log
                </Button>
              ) : isLive ? (
                <span className="text-gray-400 text-sm">—</span>
              ) : (
                <Space size="small" style={{ gap: 8 }}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(session)}
                    title="Edit"
                  />
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(session._id)}
                    title="Delete"
                  />
                </Space>
              )}
            </div>
          </>
        );
      }}
      renderCardBody={renderExpandedSession}
      emptyPrimary={emptyPrimary}
      emptySecondary={emptySecondary}
      loading={loading}
      wrapperClassName=""
    />
  );

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchMeta();
  }, []);

  // Auto-complete live sessions when duration expires; show end-session notes modal to host only
  useEffect(() => {
    const interval = setInterval(async () => {
      const liveExpired = sessions.filter(
        (s: any) => s.status === "Live" && isSessionExpired(s),
      );
      if (liveExpired.length === 0) return;
      let hostSessionToShowNotes: any = null;
      for (const session of liveExpired) {
        try {
          await lmsService.autoCompleteSession(session._id);
          if (isSessionHost(session) && !hostSessionToShowNotes) {
            hostSessionToShowNotes = session;
          }
        } catch (_) {
          // ignore per-session errors (e.g. already completed)
        }
      }
      if (liveExpired.length > 0) {
        fetchSessions();
        setActiveTab("Ended");
      }
      if (hostSessionToShowNotes) {
        setEndSessionRecord(hostSessionToShowNotes);
        setEndSessionId(hostSessionToShowNotes._id);
        setIsDurationCompletedModal(true);
        setIsEndSessionModalOpen(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [sessions, currentUserId]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchText) params.search = searchText;
      const res = await lmsService.getLiveSessions(params);
      if (res.data) setSessions(res.data);
    } catch (error) {
      message.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await lmsService.getAllCourses();
      if (res.data) setCourses(res.data);
    } catch (error) {
      console.error("Failed to load courses");
    }
  };

  const fetchMeta = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        lmsService.getDepartments(),
        lmsService.getEmployees(),
      ]);

      // Handle Departments Response
      let deptData = [];
      if (
        deptRes?.data?.departments &&
        Array.isArray(deptRes.data.departments)
      ) {
        deptData = deptRes.data.departments;
      } else if (deptRes?.departments && Array.isArray(deptRes.departments)) {
        deptData = deptRes.departments;
      } else if (Array.isArray(deptRes?.data)) {
        deptData = deptRes.data;
      }
      setDepartments(deptData);

      // Handle Employees Response
      let empData = [];
      if (empRes?.data?.staff && Array.isArray(empRes.data.staff)) {
        empData = empRes.data.staff;
      } else if ((empRes as unknown as { staff?: any[] })?.staff && Array.isArray((empRes as unknown as { staff: any[] }).staff)) {
        empData = (empRes as unknown as { staff: any[] }).staff;
      } else if (Array.isArray((empRes as unknown as { data?: any })?.data)) {
        empData = (empRes as unknown as { data: any[] }).data;
      }
      setEmployees(empData);
    } catch (error) {
      console.error("Failed to load metadata", error);
    }
  };

  // --- Actions ---

  const handleCreate = () => {
    setEditingId(null);
    setViewOnlySessionId(null);
    form.resetFields();
    setAssignmentType("All");
    setSessionType("Online");
    if (currentUserId) {
      form.setFieldsValue({
        trainerId: currentUserId,
        trainerName: currentUserName,
      });
    }
    setIsModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setViewOnlySessionId(null);
    setEditingId(record._id);
    const type = record.assignmentType || "All";
    const sType = record.sessionType || "Online";
    setAssignmentType(type);
    setSessionType(sType);

    const trainerId = record.trainerId?._id || record.trainerId;
    const rawAssigned = record.assignedEmployees || [];
    const assignedWithoutHost = trainerId
      ? rawAssigned.filter((id: any) => String(id) !== String(trainerId))
      : rawAssigned;

    form.setFieldsValue({
      title: record.title,
      description: record.description,
      agenda: record.agenda,
      trainerId,
      trainerName: record.trainerName,
      category: record.category || "Normal Session",
      sessionType: sType,
      location: record.location,
      scheduledAt: dayjs(record.dateTime || record.scheduledAt),
      duration: record.duration,
      maxParticipants: record.maxParticipants,
      attendanceMandatory: record.attendanceMandatory,
      assignmentType: type,
      departments: record.departments,
      assignedEmployees: assignedWithoutHost,
      meetingLink: record.meetingLink,
      platform: record.platform || "Google Meet",
      courseId: record.courseId,
      notificationEnabled: record.notificationEnabled !== false, // Default true
    });
    setIsModalOpen(true);
  };

  const handleViewLog = (record: any) => {
    setEditingId(null);
    setViewOnlySessionId(record._id);
    const type = record.assignmentType || "All";
    const sType = record.sessionType || "Online";
    setAssignmentType(type);
    setSessionType(sType);
    const trainerId = record.trainerId?._id || record.trainerId;
    const rawAssigned = record.assignedEmployees || [];
    const assignedWithoutHost = trainerId
      ? rawAssigned.filter((id: any) => String(id) !== String(trainerId))
      : rawAssigned;

    form.setFieldsValue({
      title: record.title,
      description: record.description,
      agenda: record.agenda,
      trainerId,
      trainerName: record.trainerName,
      category: record.category || "Normal Session",
      sessionType: sType,
      location: record.location,
      scheduledAt: dayjs(record.dateTime || record.scheduledAt),
      duration: record.duration,
      maxParticipants: record.maxParticipants,
      attendanceMandatory: record.attendanceMandatory,
      assignmentType: type,
      departments: record.departments,
      assignedEmployees: assignedWithoutHost,
      meetingLink: record.meetingLink,
      platform: record.platform || "Google Meet",
      courseId: record.courseId,
      notificationEnabled: record.notificationEnabled !== false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: "Delete Session?",
      content:
        "Are you sure you want to delete this session? This action cannot be undone.",
      okType: "danger",
      onOk: async () => {
        try {
          await lmsService.deleteLiveSession(id);
          message.success("Session deleted");
          fetchSessions();
        } catch (error) {
          message.error("Delete failed");
        }
      },
    });
  };

  const handleStartSession = async (session: any) => {
    try {
      await lmsService.updateLiveSession(session._id, { status: "Live" });
      message.success("Session started");
      if (session.meetingLink) window.open(session.meetingLink, "_blank");
      fetchSessions();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Failed to start session",
      );
    }
  };

  const handleCancelSession = (session: any) => {
    setCancelSessionModalSession(session);
    cancelReasonForm.resetFields();
  };

  const onCancelSessionModalOk = async () => {
    try {
      const values = await cancelReasonForm.validateFields();
      const reason = values.cancellationReason?.trim() || "No reason provided";
      if (!cancelSessionModalSession) return;
      const payload: any = { status: "Cancelled", cancellationReason: reason };
      if (
        values.cancellationRating != null &&
        values.cancellationRating >= 1 &&
        values.cancellationRating <= 5
      )
        payload.cancellationRating = values.cancellationRating;
      if (values.cancellationFeedback?.trim())
        payload.cancellationFeedback = values.cancellationFeedback.trim();
      await lmsService.updateLiveSession(
        cancelSessionModalSession._id,
        payload,
      );
      message.success("Session cancelled. Participants have been notified.");
      setCancelSessionModalSession(null);
      cancelReasonForm.resetFields();
      setActiveTab("Ended");
      fetchSessions();
    } catch (err: any) {
      if (err?.errorFields) throw err; // form validation – keep modal open
      message.error(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          "Failed to cancel",
      );
      throw err;
    }
  };

  const handleEndSession = (record: any) => {
    setEndSessionRecord(record);
    setEndSessionId(record._id);
    setIsDurationCompletedModal(false);
    setIsEndConfirmModalOpen(true);
  };

  const onConfirmEndSession = () => {
    setIsEndConfirmModalOpen(false);
    endSessionForm.resetFields();
    setIsDurationCompletedModal(false);
    setIsEndSessionModalOpen(true);
  };

  const confirmEndSession = async (values: any) => {
    if (!endSessionId) return;
    try {
      await lmsService.updateLiveSession(endSessionId, {
        status: "Completed",
        outcomeSummary: values.outcomeSummary || undefined,
        outcomeIssues: values.outcomeIssues || undefined,
      });
      message.success(
        isDurationCompletedModal
          ? "Notes saved"
          : "Session ended and log saved",
      );
      setIsEndSessionModalOpen(false);
      setIsDurationCompletedModal(false);
      setEndSessionId(null);
      setEndSessionRecord(null);
      setActiveTab("Ended");
      fetchSessions();
    } catch (error) {
      message.error("Failed to end session");
    }
  };

  const onFinish = async (values: any) => {
    try {
      // Resolve trainer name (Myself = current user, else from employees list)
      let trainerName = values.trainerName;
      if (currentUserId && values.trainerId === currentUserId) {
        trainerName = currentUserName;
      } else {
        const selectedTrainer = employees.find(
          (e) => e._id === values.trainerId,
        );
        if (selectedTrainer) {
          trainerName =
            selectedTrainer.name ||
            `${selectedTrainer.firstName || ""} ${selectedTrainer.lastName || ""}`.trim();
        }
      }

      // Ensure host is never included in participants (e.g. edit mode or stale selection)
      const rawAssigned =
        Array.isArray(values.assignedEmployees) ? values.assignedEmployees : [];
      const hostIdStr = values.trainerId ? String(values.trainerId) : "";
      const assignedEmployees = hostIdStr
        ? rawAssigned.filter((id: string) => String(id) !== hostIdStr)
        : rawAssigned;

      const payload = {
        ...values,
        assignedEmployees,
        dateTime: values.scheduledAt.toISOString(),
        trainerName: trainerName || values.trainerName || "Unknown Trainer",
        notificationEnabled: true,
      };

      if (editingId) {
        await lmsService.updateLiveSession(editingId, payload);
        message.success("Session updated");
      } else {
        await lmsService.scheduleSession(payload);
        message.success("Session scheduled & notifications sent");
      }
      setIsModalOpen(false);
      fetchSessions();
    } catch (error) {
      message.error("Operation failed");
      console.error(error);
    }
  };

  return (
    <MainLayout>
      <div className="lms-page p-4 sm:p-6 w-full max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row flex-wrap justify-between items-stretch sm:items-start gap-4">
          <div>
            <Title
              level={3}
              className="!mb-1 text-gray-800 tracking-tight text-lg sm:text-xl"
            >
              Live Sessions
            </Title>
            <Text type="secondary" className="text-sm sm:text-base block">
              Manage training schedules and session logs. Click a session to see
              details.
            </Text>
          </div>
          <Space size="middle" className="w-full sm:w-auto">
            <Button
              size="large"
              onClick={() => fetchSessions()}
              loading={loading}
              icon={<ReloadOutlined />}
              className="touch-target min-h-[44px] w-full sm:w-auto"
            >
              Refresh
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 touch-target min-h-[44px] w-full sm:w-auto"
            >
              Schedule Session
            </Button>
          </Space>
        </div>

        {/* KPI Cards — Live sessions: each card explains its own purpose */}
        {(() => {
          const scheduledList = getFilteredSessionsByTab("Scheduled");
          const endedList = getFilteredSessionsByTab("Ended");
          const liveNowCount = sessions.filter((s: any) => getSessionStatus(s) === "Live").length;
          return (
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} sm={12} lg={6}>
                <LmsKpiCard
                  title="Total Sessions"
                  value={sessions.length}
                  icon={<UnorderedListOutlined />}
                  accentColor="#1e40af"
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <LmsKpiCard
                  title="Scheduled"
                  value={scheduledList.length}
                  icon={<CalendarOutlined />}
                  accentColor="#15803d"
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <LmsKpiCard
                  title="Live Now"
                  value={liveNowCount}
                  icon={<PlayCircleOutlined />}
                  accentColor="#c2410c"
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <LmsKpiCard
                  title="Ended"
                  value={endedList.length}
                  icon={<CheckCircleOutlined />}
                  accentColor="#475569"
                />
              </Col>
            </Row>
          );
        })()}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="assessment-tabs"
          items={[
            {
              key: "Scheduled",
              label: (
                <span className="flex items-center gap-2">
                  <CalendarOutlined />
                  Scheduled
                </span>
              ),
              children: renderSessionList(
                getFilteredSessionsByTab("Scheduled"),
                sessions.length === 0
                  ? "No live sessions scheduled yet."
                  : "No scheduled or live sessions.",
                "You'll see scheduled and live sessions here.",
              ),
            },
            {
              key: "Ended",
              label: (
                <span className="flex items-center gap-2">
                  <CheckCircleOutlined />
                  Ended
                </span>
              ),
              children: renderSessionList(
                getFilteredSessionsByTab("Ended"),
                "No ended sessions.",
                "Past sessions will appear here after they end.",
              ),
            },
          ]}
        />

        {/* Schedule Modal */}
        <Modal
          wrapClassName="lms-modal"
          title={
            <div className="flex items-center gap-3 py-3 border-b border-gray-100 mb-0">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                {viewOnlySessionId ? (
                  <FileTextOutlined className="text-xl" />
                ) : (
                  <VideoCameraOutlined className="text-xl" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 m-0 leading-tight">
                  {viewOnlySessionId
                    ? "View Session Log"
                    : editingId
                      ? "Edit Session"
                      : "Schedule Live Session"}
                </h3>
                <p className="text-xs text-gray-500 font-normal m-0 mt-0.5">
                  {viewOnlySessionId
                    ? "View session details (read-only)"
                    : "Create and manage external meetings"}
                </p>
              </div>
            </div>
          }
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setViewOnlySessionId(null);
            setEditingId(null);
          }}
          footer={
            viewOnlySessionId ? (
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Button
                  size="large"
                  type="primary"
                  onClick={() => {
                    setIsModalOpen(false);
                    setViewOnlySessionId(null);
                  }}
                >
                  Close
                </Button>
              </div>
            ) : (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button size="large" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => form.submit()}
                  loading={loading}
                  className="bg-primary hover:bg-primary/90 px-8 font-semibold"
                >
                  {editingId ? "Update Session" : "Schedule Session"}
                </Button>
              </div>
            )
          }
          width={isMobile ? "100%" : 800}
          destroyOnHidden
          maskClosable={false}
          centered
          className="custom-modal top-4 max-sm:!max-w-[100vw] max-sm:!top-0 max-sm:!padding-0"
          styles={
            isMobile
              ? { body: { maxHeight: "calc(100vh - 120px)", overflow: "auto" } }
              : undefined
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              assignmentType: "All",
              sessionType: "Online",
              platform: "Google Meet",
              category: "Normal Session",
              duration: 60,
              notificationEnabled: true,
            }}
            className="pt-4"
          >
            <Row gutter={[24, 0]}>
              {/* Left Column - full width on mobile */}
              <Col xs={24} md={12}>
                <div className="space-y-4">
                  <Form.Item
                    name="title"
                    label="Session Title"
                    rules={[
                      {
                        required: true,
                        min: 5,
                        message: "Title must be at least 5 characters",
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      placeholder="e.g. Q3 Sales Strategy"
                      className="font-medium"
                      disabled={!!viewOnlySessionId}
                    />
                  </Form.Item>

                  <Form.Item
                    name="trainerId"
                    label="Host"
                    rules={[
                      { required: true, message: "Please select the host" },
                    ]}
                  >
                    <Select
                      size="large"
                      placeholder="Select the Host"
                      showSearch
                      optionFilterProp="children"
                      disabled={!!viewOnlySessionId}
                      onChange={(newHostId) => {
                        const current = form.getFieldValue("assignedEmployees") || [];
                        if (newHostId && Array.isArray(current) && current.length > 0) {
                          const withoutHost = current.filter((id: any) => String(id) !== String(newHostId));
                          if (withoutHost.length !== current.length) {
                            form.setFieldsValue({ assignedEmployees: withoutHost });
                          }
                        }
                      }}
                    >
                      {currentUserId && (
                        <Option key={currentUserId} value={currentUserId}>
                          <Space>
                            <UserOutlined />
                            Myself ({currentUserName})
                          </Space>
                        </Option>
                      )}
                      {employees
                        .filter((emp) => emp._id !== currentUserId)
                        .map((emp) => (
                          <Option key={emp._id} value={emp._id}>
                            {emp.name ||
                              `${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                          </Option>
                        ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="category"
                    label="Session Type"
                    rules={[{ required: true }]}
                  >
                    <Select size="large" disabled={!!viewOnlySessionId}>
                      <Option value="Normal Session">Normal Session</Option>
                      <Option value="Training">Training</Option>
                      <Option value="Live Assessment">Live Assessment</Option>
                      <Option value="Product Demo">Product Demo</Option>
                      <Option value="Announcement">Announcement</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="sessionType" hidden>
                    <Input />
                  </Form.Item>

                  <Form.Item name="agenda" label="Agenda">
                    <TextArea
                      rows={3}
                      placeholder="e.g. 1. Intro  2. Demo  3. Q&A"
                      disabled={!!viewOnlySessionId}
                      className="resize-none"
                    />
                  </Form.Item>

                  <Form.Item
                    name="meetingLink"
                    label="Meeting Link"
                    rules={[
                      { required: true, message: "Please enter a valid URL" },
                      {
                        type: "url",
                        message: "Must be a valid URL starting with https://",
                      },
                      {
                        pattern: /^https:\/\//,
                        message: "URL must start with https://",
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={<LinkOutlined className="text-gray-400" />}
                      placeholder="https://meet.google.com/..."
                      disabled={!!viewOnlySessionId}
                    />
                  </Form.Item>
                </div>
              </Col>

              {/* Right Column */}
              <Col xs={24} md={12}>
                <div className="space-y-4 mt-3 rounded-xl h-full">
                  <Form.Item
                    name="scheduledAt"
                    label="Date & Time"
                    rules={[{ required: true }]}
                  >
                    <DatePicker
                      size="large"
                      showTime={{
                        use12Hours: true,
                        format: "h:mm A",
                        disabledTime: disabledTimePastWhenToday,
                      }}
                      format="YYYY-MM-DD h:mm A"
                      className="w-full"
                      disabledDate={disabledDatePast}
                      disabled={!!viewOnlySessionId}
                    />
                  </Form.Item>

                  <Form.Item
                    name="duration"
                    label="Duration (Minutes)"
                    rules={[
                      { required: true, message: "Please enter duration" },
                      {
                        type: "number",
                        min: 1,
                        message: "Duration must be at least 1 minute",
                      },
                    ]}
                  >
                    <InputNumber
                      size="large"
                      min={1}
                      className="w-full"
                      disabled={!!viewOnlySessionId}
                    />
                  </Form.Item>

                  <Divider className="my-2" />

                  <Form.Item
                    name="assignmentType"
                    label="Session Participants"
                    rules={[{ required: true }]}
                  >
                    <Select size="large" disabled={!!viewOnlySessionId}>
                      <Option value="All">All Employees</Option>
                      <Option value="Department">By Department</Option>
                      <Option value="Individual">
                        By Individual Employees
                      </Option>
                    </Select>
                  </Form.Item>

                  {/* Conditional Fields for Participants */}
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, current) =>
                      prev.assignmentType !== current.assignmentType ||
                      prev.trainerId !== current.trainerId
                    }
                  >
                    {({ getFieldValue }) => {
                      const type = getFieldValue("assignmentType");
                      const selectedHostId = getFieldValue("trainerId");
                      const participantsExcludingHost = selectedHostId
                        ? employees.filter(
                            (e) => String(e._id) !== String(selectedHostId)
                          )
                        : employees;
                      return type === "Department" ? (
                        <Form.Item
                          name="departments"
                          rules={[
                            {
                              required: true,
                              message: "Please select at least one department",
                            },
                          ]}
                        >
                          <Select
                            mode="multiple"
                            placeholder="Select Departments"
                            size="large"
                            className="w-full"
                            disabled={!!viewOnlySessionId}
                          >
                            {departments.map((d) => (
                              <Option key={d._id} value={d._id}>
                                {d.name}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      ) : type === "Individual" ? (
                        <Form.Item
                          name="assignedEmployees"
                          rules={[
                            {
                              required: true,
                              message: "Please select employees",
                            },
                          ]}
                        >
                          <Select
                            mode="multiple"
                            placeholder="Search & Select Employees"
                            size="large"
                            className="w-full"
                            showSearch
                            optionFilterProp="children"
                            disabled={!!viewOnlySessionId}
                          >
                            {participantsExcludingHost.map((e) => (
                              <Option key={e._id} value={e._id}>
                                {e.name ||
                                  `${e.firstName || ""} ${e.lastName || ""}`.trim() ||
                                  e.email ||
                                  String(e._id)}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      ) : null;
                    }}
                  </Form.Item>
                </div>
              </Col>
            </Row>

            {/* Hidden Fields for Compatibility */}
            <Form.Item name="platform" hidden>
              <Input />
            </Form.Item>
          </Form>
        </Modal>

        {/* Session Log view modal (ended sessions); shows host log + participant remarks when hasRemarks */}
        <Modal
          wrapClassName="lms-modal"
          title="Session Log"
          open={!!sessionLogRecord}
          onCancel={() => {
            setSessionLogRecord(null);
            setParticipantRemarks([]);
          }}
          footer={
            <div className="flex justify-end">
              <Button
                type="primary"
                onClick={() => {
                  setSessionLogRecord(null);
                  setParticipantRemarks([]);
                }}
              >
                Close
              </Button>
            </div>
          }
          width={560}
          centered
        >
          {sessionLogRecord && (
            <div className="space-y-4 pt-2">
              <Descriptions size="small" column={1} bordered>
                {(sessionLogRecord.outcomeSummary ||
                  sessionLogRecord.feedbackSummary) && (
                  <Descriptions.Item label="Session Log">
                    <Text className="whitespace-pre-wrap">
                      {sessionLogRecord.outcomeSummary ||
                        sessionLogRecord.feedbackSummary}
                    </Text>
                  </Descriptions.Item>
                )}
                {sessionLogRecord.outcomeKeyTakeaways && (
                  <Descriptions.Item label="Key Takeaways">
                    <Text className="whitespace-pre-wrap">
                      {sessionLogRecord.outcomeKeyTakeaways}
                    </Text>
                  </Descriptions.Item>
                )}
                {sessionLogRecord.outcomeIssues && (
                  <Descriptions.Item label="Issues / Remarks">
                    <Text className="whitespace-pre-wrap">
                      {sessionLogRecord.outcomeIssues}
                    </Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Ended at">
                  {sessionLogRecord.endedAt
                    ? dayjs(sessionLogRecord.endedAt).format(
                        "MMM D, YYYY h:mm A",
                      )
                    : dayjs(sessionLogRecord.updatedAt).format(
                        "MMM D, YYYY h:mm A",
                      )}
                </Descriptions.Item>
                <Descriptions.Item label="Ended by">
                  {sessionLogRecord.endedBy?.name ||
                    (sessionLogRecord.endedBy?.firstName ||
                    sessionLogRecord.endedBy?.lastName
                      ? `${sessionLogRecord.endedBy.firstName || ""} ${sessionLogRecord.endedBy.lastName || ""}`.trim()
                      : "—")}
                </Descriptions.Item>
              </Descriptions>
              {participantRemarksLoading && (
                <Text type="secondary">Loading participant remarks...</Text>
              )}
              {!participantRemarksLoading && participantRemarks.length > 0 && (
                <div className="mt-4">
                  <Text strong className="block mb-2">
                    Participant remarks
                  </Text>
                  <div className="space-y-3">
                    {participantRemarks.map((r, i) => (
                      <Card key={i} size="small" className="bg-gray-50">
                        <Text strong className="text-gray-700">
                          {r.employeeName}
                        </Text>
                        {r.leftAt && (
                          <Text type="secondary" className="block text-xs">
                            {dayjs(r.leftAt).format("MMM D, YYYY h:mm A")}
                          </Text>
                        )}
                        <Paragraph className="mb-0 mt-1 whitespace-pre-wrap text-sm">
                          {r.issues}
                        </Paragraph>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Participant remarks modal (ended sessions) */}
        <Modal
          wrapClassName="lms-modal"
          title={
            <span className="flex items-center gap-2">
              <FileTextOutlined />
              Remarks
              {remarksModalSession && (
                <span className="font-normal text-gray-500 text-sm">
                  — {remarksModalSession.title}
                </span>
              )}
            </span>
          }
          open={!!remarksModalSession}
          onCancel={() => setRemarksModalSession(null)}
          footer={
            <div className="flex justify-end">
              <Button
                type="primary"
                onClick={() => setRemarksModalSession(null)}
              >
                Close
              </Button>
            </div>
          }
          width={560}
          centered
        >
          {remarksModalSession?.participantRemarks?.length > 0 ? (
            <div className="space-y-3 pt-2">
              {remarksModalSession.participantRemarks.map(
                (pr: any, i: number) => (
                  <Card key={i} size="small" className="bg-gray-50">
                    <Text strong className="text-gray-800">
                      {pr.employeeName}
                    </Text>
                    {pr.rating != null && (
                      <Text type="secondary" className="block text-xs">
                        Rating: {pr.rating}/5
                      </Text>
                    )}
                    <div className="mt-2 space-y-1 text-sm">
                      {pr.sessionPurpose && (
                        <div>
                          <Text type="secondary">Purpose: </Text>
                          <span className="whitespace-pre-wrap text-gray-700">
                            {pr.sessionPurpose}
                          </span>
                        </div>
                      )}
                      {pr.issues && (
                        <div>
                          <Text type="secondary">Issues: </Text>
                          <span className="whitespace-pre-wrap text-gray-700">
                            {pr.issues}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                ),
              )}
            </div>
          ) : (
            <Text type="secondary">
              No participant remarks for this session.
            </Text>
          )}
        </Modal>

        {/* Cancel Session – reason required; participants are notified */}
        <Modal
          wrapClassName="lms-modal"
          title="Cancel Session"
          open={!!cancelSessionModalSession}
          onCancel={() => {
            setCancelSessionModalSession(null);
            cancelReasonForm.resetFields();
          }}
          onOk={onCancelSessionModalOk}
          okText="Cancel session"
          okType="danger"
          cancelText="Keep session"
          destroyOnHidden
          centered
          afterClose={() => {
            cancelReasonForm.resetFields();
          }}
        >
          {cancelSessionModalSession && (
            <>
              <p className="text-gray-600 mb-4">
                &quot;{cancelSessionModalSession.title}&quot; will be cancelled
                and moved to the Ended tab. Participants will be notified.
                Please provide a reason (required).
              </p>
              <Form form={cancelReasonForm} layout="vertical">
                <Form.Item
                  name="cancellationReason"
                  label="Reason for cancellation"
                  rules={[
                    {
                      required: true,
                      message: "Please enter the reason for cancellation",
                    },
                  ]}
                >
                  <TextArea
                    rows={3}
                    placeholder="e.g. Trainer unavailable, rescheduled to next week..."
                  />
                </Form.Item>
                <Form.Item
                  name="cancellationRating"
                  label="Session rating (1–5 stars)"
                >
                  <Rate allowHalf />
                </Form.Item>
                <Form.Item
                  name="cancellationFeedback"
                  label="Additional feedback"
                >
                  <TextArea
                    rows={2}
                    placeholder="Optional: session feedback, issues, or notes..."
                    className="resize-none"
                  />
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>

        {/* End Session Confirmation Modal */}
        <Modal
          wrapClassName="lms-modal"
          title="End Live Session"
          open={isEndConfirmModalOpen}
          onCancel={() => {
            setIsEndConfirmModalOpen(false);
            setEndSessionId(null);
            setEndSessionRecord(null);
          }}
          onOk={onConfirmEndSession}
          okText="Yes, end session"
          cancelText="Cancel"
          okButtonProps={{ className: "bg-primary hover:bg-primary/90" }}
          centered
        >
          <Text>
            Are you sure you want to end this session? This action cannot be
            undone.
          </Text>
        </Modal>

        {/* Session Notes Modal – Session Log (mandatory), Issues/Remarks (optional); no Skip/Cancel */}
        <Modal
          wrapClassName="lms-modal"
          title={
            <span className="text-lg font-bold">
              {isDurationCompletedModal
                ? "Session Duration Completed"
                : "Session Notes"}
            </span>
          }
          open={isEndSessionModalOpen}
          onCancel={() => {
            setIsEndSessionModalOpen(false);
            setIsDurationCompletedModal(false);
            setEndSessionId(null);
            setEndSessionRecord(null);
          }}
          footer={null}
          width={520}
          centered
        >
          {isDurationCompletedModal && (
            <p className="text-gray-600 mb-4">
              The scheduled duration for this session has ended. Please add your
              session log.
            </p>
          )}
          <Form
            form={endSessionForm}
            layout="vertical"
            onFinish={confirmEndSession}
            className="pt-2"
          >
            <Form.Item
              name="outcomeSummary"
              label="Session Log"
              rules={[
                { required: true, message: "Please enter your session log." },
              ]}
            >
              <TextArea
                rows={3}
                placeholder="Summarize what was covered in this session..."
              />
            </Form.Item>
            <Form.Item name="outcomeIssues" label="Issues / Remarks (optional)">
              <TextArea
                rows={2}
                placeholder="Any issues or follow-up remarks..."
              />
            </Form.Item>

            <div className="flex justify-end mt-6">
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                className="bg-primary hover:bg-primary/90"
              >
                Save Session Log
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default LiveSessionManager;
