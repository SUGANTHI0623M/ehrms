import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  message,
  Row,
  Col,
  Divider,
  Empty,
  Tabs,
  Avatar,
  DatePicker,
  InputNumber,
  Descriptions,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  LinkOutlined,
  DownOutlined,
  UpOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  LaptopOutlined,
  EditOutlined,
  DeleteOutlined,
  FormOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import MainLayout from "@/components/MainLayout";
import SessionCardList from "@/components/lms/SessionCardList";
import {
  useGetAssessmentRequestsQuery,
  useUpdateAssessmentRequestMutation,
  useGetStandardAssessmentResultsQuery,
  useResetCourseAssessmentMutation,
} from "@/store/api/lmsApi";
import { LmsPageLayout } from "@/components/lms/SharedComponents";
import { lmsApi } from "@/store/api/lmsApi";
import { lmsService } from "@/services/lmsService";
import {
  disabledDatePast,
  disabledTimePastWhenToday,
} from "@/utils/dateTimePickerUtils";
import dayjs from "dayjs";
import {
  getActionsForRequest,
  isScheduledTimeReached,
  getMinutesUntilScheduled,
  ASSESSMENT_TAB_KEYS,
  STATUS_TAG_COLOR,
  type AssessmentTabKey,
} from "./assessmentWorkflow";
import { useAppSelector, useAppDispatch } from "@/store/hooks";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AssessmentManagement = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state: any) => state.auth);
  const currentUserId = user?.id ?? user?._id ?? undefined;
  const currentUserName =
    user?.name ??
    (user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : (user?.firstName ?? user?.email ?? ""));
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<AssessmentTabKey>(
    ASSESSMENT_TAB_KEYS.SCHEDULED,
  );
  const [completedSubTab, setCompletedSubTab] = useState<
    "live" | "standardized"
  >("live");

  // Modals
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [endSessionModalOpen, setEndSessionModalOpen] = useState(false);
  const [isAssessmentDurationCompleted, setIsAssessmentDurationCompleted] =
    useState(false);
  const [schedulingRequest, setSchedulingRequest] = useState<any>(null);
  const [endSessionRequest, setEndSessionRequest] = useState<any>(null);
  const [cancelAssessmentModalRecord, setCancelAssessmentModalRecord] =
    useState<any>(null);
  const [cancelAssessmentReasonForm] = Form.useForm();
  const [assessmentLogRecord, setAssessmentLogRecord] = useState<any>(null);
  const [learnerRemarksModalRecord, setLearnerRemarksModalRecord] =
    useState<any>(null);

  const [scheduleForm] = Form.useForm();
  const [endSessionForm] = Form.useForm();
  const [employees, setEmployees] = useState<any[]>([]);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [endSessionSubmitting, setEndSessionSubmitting] = useState(false);
  const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedStandardizedIds, setExpandedStandardizedIds] = useState<
    Set<string>
  >(new Set());
  const toggleRequestExpand = (id: string) => {
    setExpandedRequestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleStandardizedExpand = (id: string) => {
    setExpandedStandardizedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const {
    data: requestData,
    isLoading: isRequestsLoading,
    isFetching: isRequestsFetching,
    refetch: refetchRequests,
  } = useGetAssessmentRequestsQuery();
  const [updateRequest] = useUpdateAssessmentRequestMutation();
  const {
    data: resultData,
    isLoading: isResultsLoading,
    isFetching: isResultsFetching,
    refetch: refetchResults,
  } = useGetStandardAssessmentResultsQuery();
  const [resetAssessment] = useResetCourseAssessmentMutation();

  const [attemptReportData, setAttemptReportData] = useState<{
    data?: any;
  } | null>(null);
  const [isAttemptLoading, setIsAttemptLoading] = useState(false);
  const [isAttemptError, setIsAttemptError] = useState(false);
  useEffect(() => {
    if (!assessmentLogRecord) {
      setAttemptReportData(null);
      setIsAttemptError(false);
      return;
    }
    const cid =
      assessmentLogRecord.courseId?._id ?? assessmentLogRecord.courseId;
    const eid =
      assessmentLogRecord.employeeId?._id ?? assessmentLogRecord.employeeId;
    if (!cid || !eid) {
      setAttemptReportData(null);
      setIsAttemptError(true);
      return;
    }
    let cancelled = false;
    setIsAttemptLoading(true);
    setIsAttemptError(false);
    dispatch(
      lmsApi.endpoints.getCourseAssessmentAttemptReport.initiate({
        courseId: cid,
        employeeId: eid,
      }),
    )
      .then((result: any) => {
        if (cancelled) return;
        setIsAttemptLoading(false);
        if (result.error) {
          setIsAttemptError(true);
          setAttemptReportData(null);
        } else {
          setAttemptReportData(result.data);
          setIsAttemptError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAttemptLoading(false);
          setIsAttemptError(true);
          setAttemptReportData(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [assessmentLogRecord, dispatch]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await lmsService.getEmployees();
        let list: any[] = [];
        if (res?.data?.staff) list = res.data.staff;
        else if (res?.staff) list = res.staff;
        else if (Array.isArray(res?.data)) list = res.data;
        setEmployees(list);
      } catch (e) {
        console.error("Failed to load employees", e);
      }
    };
    load();
  }, []);

  const allRequests: any[] = requestData?.data || [];
  const requestedList = allRequests.filter(
    (r: any) => r.status === "Requested",
  );
  const upcomingList = allRequests.filter(
    (r: any) => r.status === "Scheduled" || r.status === "Live",
  );
  const completedRequestsList = allRequests.filter((r: any) =>
    ["Completed", "Cancelled", "Rejected"].includes(r.status),
  );

  /** True when assessment is Live and scheduled duration has passed */
  const isAssessmentDurationExpired = (record: any) => {
    if (record.status !== "Live" || !record.scheduledAt) return false;
    const start = new Date(record.scheduledAt).getTime();
    const durationMinutes = record.liveSessionId?.duration ?? 60;
    const end = start + durationMinutes * 60 * 1000;
    return Date.now() >= end;
  };

  /** Only the assigned host can start/cancel/end; admins who are not the host have no access to these actions. */
  const isAssessmentHost = (record: any) => {
    const trainerId =
      record.liveSessionId?.trainerId?._id ?? record.liveSessionId?.trainerId;
    if (!trainerId || !currentUserId) return false;
    return String(trainerId) === String(currentUserId);
  };

  // Auto-complete live assessments when duration expires; show end-assessment modal to host only
  useEffect(() => {
    const interval = setInterval(async () => {
      const requests = requestData?.data || [];
      const liveExpired = requests.filter(
        (r: any) => r.status === "Live" && isAssessmentDurationExpired(r),
      );
      if (liveExpired.length === 0) return;
      let hostRecordToShow: any = null;
      for (const record of liveExpired) {
        const liveSessionId = record.liveSessionId?._id ?? record.liveSessionId;
        try {
          if (liveSessionId) {
            await lmsService.autoCompleteSession(liveSessionId);
          }
          await updateRequest({ id: record._id, status: "Completed" }).unwrap();
          if (isAssessmentHost(record) && !hostRecordToShow)
            hostRecordToShow = record;
        } catch (_) {}
      }
      if (liveExpired.length > 0) {
        refetchRequests();
        setActiveTab(ASSESSMENT_TAB_KEYS.COMPLETED);
      }
      if (hostRecordToShow) {
        setEndSessionRequest(hostRecordToShow);
        endSessionForm.resetFields();
        setIsAssessmentDurationCompleted(true);
        setEndSessionModalOpen(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [requestData?.data, currentUserId]);

  const getEmployeeDisplayName = (record: any): string => {
    if (!record) return "—";
    const emp = record.employeeId;
    if (emp && typeof emp === "object") {
      const name =
        emp.name ||
        (emp.firstName || emp.lastName
          ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
          : null);
      if (name) return name;
    }
    const id = record.employeeId?._id || record.employeeId;
    if (id && employees.length) {
      const found = employees.find((e: any) => e._id === id);
      if (found)
        return (
          found.name ||
          `${found.firstName || ""} ${found.lastName || ""}`.trim() ||
          "—"
        );
    }
    return "—";
  };

  const handleScheduleAssessment = (record: any) => {
    setSchedulingRequest(record);
    const courseTitle = record.courseId?.title || "Assessment";
    const isReschedule = record.status === "Scheduled" && record.liveSessionId;
    scheduleForm.setFieldsValue({
      title: `Live Assessment: ${courseTitle}`,
      scheduledAt: record.scheduledAt ? dayjs(record.scheduledAt) : undefined,
      duration: record.liveSessionId?.duration ?? 60,
      platform: record.liveSessionId?.platform || "Google Meet",
      meetingLink: record.liveSessionId?.meetingLink || "",
      description: record.description || "",
      category: "Live Assessment",
      trainerId:
        record.liveSessionId?.trainerId?._id ||
        record.liveSessionId?.trainerId ||
        currentUserId,
    });
    if (currentUserId && !record.liveSessionId?.trainerId)
      scheduleForm.setFieldsValue({ trainerId: currentUserId });
    setScheduleModalOpen(true);
  };

  const handleEditAssessment = (record: any) => {
    handleScheduleAssessment(record);
  };

  const handleDeleteAssessment = (record: any) => {
    const status = record.status;
    if (["Completed", "Cancelled", "Rejected"].includes(status)) {
      messageApi.warning("This assessment is already ended or rejected.");
      return;
    }
    const isRequested = status === "Requested";
    if (isRequested) {
      Modal.confirm({
        title: "Reject request?",
        content: "The assessment request will be rejected.",
        okType: "danger",
        okText: "Reject",
        onOk: async () => {
          await handleRejectRequest(record);
        },
      });
    } else {
      setCancelAssessmentModalRecord(record);
      cancelAssessmentReasonForm.resetFields();
    }
  };

  const onScheduleModalFinish = async (values: any) => {
    if (!schedulingRequest) return;
    setScheduleSubmitting(true);
    try {
      const employeeId =
        schedulingRequest.employeeId?._id || schedulingRequest.employeeId;
      const selectedTrainer = employees.find(
        (e: any) => e._id === values.trainerId,
      );
      let trainerName = selectedTrainer
        ? `${selectedTrainer.firstName || ""} ${selectedTrainer.lastName || ""}`.trim() ||
          selectedTrainer.name
        : "";
      if (!trainerName && currentUserId && values.trainerId === currentUserId)
        trainerName = currentUserName || "Assessor";
      if (!trainerName) trainerName = "Assessor";

      const existingSessionId =
        schedulingRequest.liveSessionId?._id || schedulingRequest.liveSessionId;
      const scheduledAtIso = values.scheduledAt.toISOString();

      if (existingSessionId) {
        await lmsService.updateLiveSession(existingSessionId, {
          title: values.title,
          description: values.description?.trim() || undefined,
          dateTime: scheduledAtIso,
          duration: values.duration,
          trainerId: values.trainerId,
          trainerName,
          meetingLink: values.meetingLink || undefined,
          platform: values.platform || "Google Meet",
        });
        const wasCompleted = schedulingRequest.status === "Completed";
        await updateRequest({
          id: schedulingRequest._id,
          scheduledAt: scheduledAtIso,
          ...(wasCompleted && { status: "Scheduled" }),
        }).unwrap();
        messageApi.success(
          wasCompleted
            ? "Assessment reset and rescheduled. Learner has been notified."
            : "Assessment rescheduled successfully",
        );
      } else {
        const payload = {
          title: values.title,
          description:
            values.description?.trim() ||
            `Live assessment for ${schedulingRequest.courseId?.title || "course"}.`,
          category: "Live Assessment",
          sessionType: "Online",
          assignmentType: "Individual",
          assignedEmployees: [employeeId],
          departments: [],
          dateTime: scheduledAtIso,
          duration: values.duration,
          trainerId: values.trainerId,
          trainerName,
          meetingLink: values.meetingLink,
          platform: values.platform || "Google Meet",
          notificationEnabled: true,
          attendanceMandatory: false,
        };
        const res = await lmsService.scheduleSession(payload);
        const session = res?.data;
        if (!session?._id) throw new Error("Session not created");
        await updateRequest({
          id: schedulingRequest._id,
          status: "Scheduled",
          scheduledAt: scheduledAtIso,
          liveSessionId: session._id,
        }).unwrap();
        messageApi.success("Assessment scheduled successfully");
      }

      setScheduleModalOpen(false);
      setSchedulingRequest(null);
      scheduleForm.resetFields();
      refetchRequests();
      setActiveTab(ASSESSMENT_TAB_KEYS.UPCOMING);
    } catch (err: any) {
      messageApi.error(
        err?.data?.message || err?.message || "Failed to schedule assessment",
      );
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleStartAssessment = async (record: any) => {
    const liveSessionId = record.liveSessionId?._id || record.liveSessionId;
    const meetingLink = record.liveSessionId?.meetingLink;
    if (!liveSessionId) {
      messageApi.error("No session linked. Please schedule again.");
      return;
    }
    if (!meetingLink?.trim()) {
      messageApi.error(
        "Meeting link is required. Please edit the session and add the meeting link, then start the assessment.",
      );
      return;
    }
    try {
      await updateRequest({ id: record._id, status: "Live" }).unwrap();
      messageApi.success("Assessment started");
      refetchRequests();
      window.open(meetingLink.trim(), "_blank", "noopener,noreferrer");
    } catch (err: any) {
      messageApi.error(err?.data?.message || "Failed to start assessment");
    }
  };

  const handleCancelAssessment = async (
    record: any,
    cancellationReason?: string,
  ) => {
    try {
      await updateRequest({ id: record._id, status: "Cancelled" }).unwrap();
      const liveSessionId = record.liveSessionId?._id || record.liveSessionId;
      if (liveSessionId) {
        try {
          await lmsService.updateLiveSession(liveSessionId, {
            status: "Cancelled",
            cancellationReason: cancellationReason || "No reason provided",
          });
        } catch (_) {}
      }
      messageApi.success(
        "Assessment cancelled. Participants have been notified.",
      );
      refetchRequests();
      if (activeTab === ASSESSMENT_TAB_KEYS.UPCOMING)
        setActiveTab(ASSESSMENT_TAB_KEYS.COMPLETED);
    } catch (err: any) {
      messageApi.error(err?.data?.message || "Failed to cancel");
    }
  };

  const onCancelAssessmentModalOk = async () => {
    try {
      const values = await cancelAssessmentReasonForm.validateFields();
      const reason = values.cancellationReason?.trim() || "No reason provided";
      if (!cancelAssessmentModalRecord) return;
      await handleCancelAssessment(cancelAssessmentModalRecord, reason);
      setCancelAssessmentModalRecord(null);
      cancelAssessmentReasonForm.resetFields();
    } catch (err: any) {
      if (err?.errorFields) throw err;
      throw err;
    }
  };

  const handleEndSessionClick = (record: any) => {
    setEndSessionRequest(record);
    endSessionForm.resetFields();
    setIsAssessmentDurationCompleted(false);
    setEndSessionModalOpen(true);
  };

  const onEndSessionModalFinish = async (values: any) => {
    if (!endSessionRequest) return;
    setEndSessionSubmitting(true);
    try {
      const qualificationScore =
        endSessionRequest.courseId?.qualificationScore ?? 80;
      const score =
        values.performancePercentage != null
          ? Number(values.performancePercentage)
          : undefined;
      const isPassed = score != null ? score >= qualificationScore : undefined;
      await updateRequest({
        id: endSessionRequest._id,
        status: "Completed",
        sessionNotes: values.sessionSummary,
        sessionSummary: values.sessionSummary,
        ...(score != null && { score }),
        ...(isPassed != null && { isPassed }),
      }).unwrap();
      const liveSessionId =
        endSessionRequest.liveSessionId?._id || endSessionRequest.liveSessionId;
      if (liveSessionId) {
        await lmsService.updateLiveSession(liveSessionId, {
          status: "Completed",
          outcomeSummary: values.sessionSummary,
          outcomeKeyTakeaways: values.sessionNotes,
        });
      }
      messageApi.success(
        isAssessmentDurationCompleted
          ? "Notes and score saved"
          : "Session ended and saved",
      );
      setEndSessionModalOpen(false);
      setIsAssessmentDurationCompleted(false);
      setEndSessionRequest(null);
      endSessionForm.resetFields();
      refetchRequests();
      setActiveTab(ASSESSMENT_TAB_KEYS.COMPLETED);
    } catch (err: any) {
      messageApi.error(err?.data?.message || "Failed to end session");
    } finally {
      setEndSessionSubmitting(false);
    }
  };

  const handleRejectRequest = async (record: any) => {
    try {
      await updateRequest({ id: record._id, status: "Rejected" }).unwrap();
      messageApi.success("Request rejected");
      refetchRequests();
    } catch (err: any) {
      messageApi.error(err?.data?.message || "Failed to reject");
    }
  };

  /** Start, Cancel (Scheduled/Live), and End Session are shown only to the assigned host. If the host is an admin, they have access; if the admin is not the host, they do not. */
  const renderActionButtons = (record: any) => {
    const actions = getActionsForRequest(record);
    const scheduledReached = isScheduledTimeReached(record.scheduledAt);
    const isHost = isAssessmentHost(record);
    const primaryButtons: React.ReactNode[] = [];
    const secondaryButtons: React.ReactNode[] = [];

    if (actions.primary?.visible) {
      const label = actions.primary.label;
      if (actions.primary.key === "schedule") {
        primaryButtons.push(
          <Button
            key="schedule"
            type="primary"
            size="large"
            onClick={() => handleScheduleAssessment(record)}
          >
            {label}
          </Button>,
        );
      } else if (actions.primary.key === "start") {
        if (isHost) {
          const disabled = record.status === "Scheduled" && !scheduledReached;
          primaryButtons.push(
            <Button
              key="start"
              type="primary"
              size="large"
              disabled={disabled}
              onClick={() => handleStartAssessment(record)}
            >
              {label}
            </Button>,
          );
        }
      } else if (actions.primary.key === "end_session") {
        if (isHost) {
          primaryButtons.push(
            <Button
              key="end"
              type="primary"
              size="large"
              danger
              onClick={() => handleEndSessionClick(record)}
            >
              {label}
            </Button>,
          );
        }
      }
    }

    actions.secondary.forEach((a) => {
      if (!a.visible) return;
      if (a.key === "cancel" || a.key === "reject") {
        const isReject = record.status === "Requested" && a.key === "cancel";
        // Reject (Requested) = any admin; Cancel (Scheduled/Live) = host only
        if (isReject || isHost) {
          secondaryButtons.push(
            <Button
              key={a.key}
              danger={a.danger}
              ghost
              size="large"
              onClick={() =>
                isReject
                  ? handleRejectRequest(record)
                  : handleCancelAssessment(record)
              }
            >
              {isReject ? "Reject" : a.label}
            </Button>,
          );
        }
      } else if (a.key === "end_session") {
        if (isHost) {
          secondaryButtons.push(
            <Button
              key="end"
              type="primary"
              size="large"
              danger
              onClick={() => handleEndSessionClick(record)}
            >
              {a.label}
            </Button>,
          );
        }
      }
    });

    if (primaryButtons.length === 0 && secondaryButtons.length === 0)
      return null;
    return (
      <Space
        size="middle"
        wrap
        style={{ gap: 8 }}
        className="assessment-action-buttons"
      >
        {primaryButtons}
        {secondaryButtons}
      </Space>
    );
  };

  const formatCountdown = (scheduledAt: string | Date | undefined) => {
    const mins = getMinutesUntilScheduled(scheduledAt);
    if (mins == null || mins < 0) return null;
    if (mins < 60) return `Starts in ${mins} minute${mins !== 1 ? "s" : ""}`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m
      ? `Starts in ${h} hour${h !== 1 ? "s" : ""} ${m} minute${m !== 1 ? "s" : ""}`
      : `Starts in ${h} hour${h !== 1 ? "s" : ""}`;
  };

  /** Expanded body: single row — info + Platform on left, action buttons on right only. */
  const renderExpandedAssessmentRequest = (record: any) => {
    const countdown =
      record.status === "Scheduled" &&
      !isScheduledTimeReached(record.scheduledAt)
        ? formatCountdown(record.scheduledAt)
        : null;
    const platform = record.liveSessionId?.platform;
    const infoText =
      record.status === "Requested"
        ? "Assessment requested. Schedule to set date and time."
        : record.status === "Scheduled" && countdown
          ? countdown
          : record.status === "Scheduled"
            ? "Assessment scheduled."
            : record.status === "Live"
              ? "Session is live."
              : ["Completed", "Cancelled", "Rejected"].includes(record.status)
                ? `Assessment ${record.status.toLowerCase()}.`
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
            {platform && (
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <LaptopOutlined className="text-gray-400" />
                <strong>Platform:</strong> {platform}
              </span>
            )}
            {record.learnerRemarks &&
              (record.learnerRemarks.sessionPurpose ||
                record.learnerRemarks.issues ||
                record.learnerRemarks.rating != null) && (
                <Button
                  type="default"
                  size="middle"
                  icon={<FileTextOutlined />}
                  onClick={() => setLearnerRemarksModalRecord(record)}
                >
                  Learner remarks
                </Button>
              )}
          </div>
          <div className="session-expanded-right">
            {["Completed", "Cancelled", "Rejected"].includes(record.status) ? (
              <Button
                type="default"
                size="large"
                icon={<FileTextOutlined />}
                onClick={() => setAssessmentLogRecord({ ...record, _isLiveLog: true })}
              >
                Assessment Log
              </Button>
            ) : (
              renderActionButtons(record)
            )}
          </div>
        </div>
      </div>
    );
  };

  /* Assessment Requests tab: LEARNER | COURSE | REQUESTED AT | STATUS | ACTION */
  const assessmentRequestsColumnHeaders = (
    <>
      <div className="session-card-header-cell session-card-header-title">
        <span
          className="session-card-chevron session-card-chevron-placeholder"
          aria-hidden
        >
          {" "}
        </span>
        <span className="session-cards-column-header-label">Learner</span>
      </div>
      <div className="session-card-header-cell session-card-header-course">
        <span className="session-cards-column-header-label">Course</span>
      </div>
      <div className="session-card-header-cell session-card-header-sessionat">
        <span className="session-cards-column-header-label">Requested at</span>
      </div>
      <div className="session-card-header-cell session-card-header-status">
        <span className="session-cards-column-header-label">Status</span>
      </div>
      <div className="session-card-header-cell session-card-header-action">
        <span className="session-cards-column-header-label">Action</span>
      </div>
    </>
  );

  /* Upcoming/Completed: LEARNER | COURSE | SESSION AT | ASSIGNED AT | DURATION | HOSTED BY | STATUS | ACTION */
  const assessmentColumnHeaders = (
    <>
      <div className="session-card-header-cell session-card-header-title">
        <span
          className="session-card-chevron session-card-chevron-placeholder"
          aria-hidden
        >
          {" "}
        </span>
        <span className="session-cards-column-header-label">Learner</span>
      </div>
      <div className="session-card-header-cell session-card-header-course">
        <span className="session-cards-column-header-label">Course</span>
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

  const renderAssessmentRequestsCardList = (
    list: any[],
    emptyPrimary: string,
    emptySecondary: string,
  ) => (
    <SessionCardList
      list={list}
      getItemId={(r) => r._id}
      expandedIds={expandedRequestIds}
      onToggleExpand={toggleRequestExpand}
      columnHeaders={assessmentRequestsColumnHeaders}
      renderCardHeader={(record, isExpanded) => (
        <>
          <div className="session-card-header-cell session-card-header-title">
            <span className="session-card-chevron">
              {isExpanded ? <UpOutlined /> : <DownOutlined />}
            </span>
            <div className="session-card-title flex items-center gap-2 min-w-0">
              <Avatar
                src={record.employeeId?.profilePicture}
                icon={<UserOutlined />}
                size="small"
              />
              <span className="truncate">{getEmployeeDisplayName(record)}</span>
            </div>
          </div>
          <div
            className="session-card-header-cell session-card-header-course"
            data-label="Course"
          >
            <span className="truncate text-sm">
              {record.courseId?.title ?? "—"}
            </span>
          </div>
          <div
            className="session-card-header-cell session-card-header-sessionat"
            data-label="Requested at"
          >
            {record.createdAt ? (
              <div className="date-time-cell">
                <span className="date-icon">
                  <CalendarOutlined className="text-emerald-500" />
                </span>
                <span className="date-text">
                  {new Date(record.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="time-separator"> · </span>
                <span className="time-text">
                  {new Date(record.createdAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
          <div
            className="session-card-header-cell session-card-header-status"
            data-label="Status"
          >
            <Tag color={STATUS_TAG_COLOR[record.status] || "default"}>
              {record.status}
            </Tag>
          </div>
          <div
            className="session-card-header-cell session-card-header-action"
            onClick={(e) => e.stopPropagation()}
            data-label="Action"
          >
            <Space size="small" style={{ gap: 8 }}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleScheduleAssessment(record)}
                title="Schedule"
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteAssessment(record)}
                title="Reject"
              />
            </Space>
          </div>
        </>
      )}
      renderCardBody={renderExpandedAssessmentRequest}
      emptyPrimary={emptyPrimary}
      emptySecondary={emptySecondary}
      loading={isRequestsLoading}
      wrapperClassName="assessment-requests-cards"
    />
  );

  const renderAssessmentCardList = (
    list: any[],
    emptyPrimary: string,
    emptySecondary: string,
  ) => (
    <SessionCardList
      list={list}
      getItemId={(r) => r._id}
      expandedIds={expandedRequestIds}
      onToggleExpand={toggleRequestExpand}
      columnHeaders={assessmentColumnHeaders}
      renderCardHeader={(record, isExpanded) => (
        <>
          <div className="session-card-header-cell session-card-header-title">
            <span className="session-card-chevron">
              {isExpanded ? <UpOutlined /> : <DownOutlined />}
            </span>
            <div className="session-card-title flex items-center gap-2 min-w-0">
              <Avatar
                src={record.employeeId?.profilePicture}
                icon={<UserOutlined />}
                size="small"
              />
              <span className="truncate">{getEmployeeDisplayName(record)}</span>
            </div>
          </div>
          <div
            className="session-card-header-cell session-card-header-course"
            data-label="Course"
          >
            <span className="truncate text-sm">
              {record.courseId?.title ?? "—"}
            </span>
          </div>
          <div
            className="session-card-header-cell session-card-header-sessionat"
            data-label="Session At"
          >
            {record.scheduledAt ? (
              <div className="date-time-cell">
                <span className="date-icon">
                  <CalendarOutlined className="text-emerald-500" />
                </span>
                <span className="date-text">
                  {new Date(record.scheduledAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="time-separator"> · </span>
                <span className="time-text">
                  {new Date(record.scheduledAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">&nbsp;</span>
            )}
          </div>
          <div
            className="session-card-header-cell session-card-header-assignedat"
            data-label="Assigned At"
          >
            {record.createdAt ? (
              <div className="date-time-cell">
                <span className="date-text">
                  {new Date(record.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            ) : (
              ""
            )}
          </div>
          <div
            className="session-card-header-cell session-card-header-duration"
            data-label="Duration"
          >
            {record.liveSessionId?.duration
              ? `${record.liveSessionId.duration} min`
              : "—"}
          </div>
          <div
            className="session-card-header-cell session-card-header-host"
            data-label="Hosted By"
          >
            <span className="host-icon">
              <UserOutlined className="text-gray-400" />
            </span>{" "}
            {record.liveSessionId?.trainerName || "—"}
          </div>
          <div
            className="session-card-header-cell session-card-header-status"
            data-label="Status"
          >
            <Tag color={STATUS_TAG_COLOR[record.status] || "default"}>
              {record.status}
            </Tag>
          </div>
          <div
            className="session-card-header-cell session-card-header-action"
            onClick={(e) => e.stopPropagation()}
            data-label="Action"
          >
            {["Completed", "Cancelled", "Rejected"].includes(record.status) ? (
              <Button
                type="link"
                size="small"
                danger
                icon={<ReloadOutlined />}
                title="Reset & reschedule assessment"
                onClick={() => handleScheduleAssessment(record)}
              />
            ) : (
              <Space size="small" style={{ gap: 8 }}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditAssessment(record)}
                  title="Edit"
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteAssessment(record)}
                  title="Delete"
                />
              </Space>
            )}
          </div>
        </>
      )}
      renderCardBody={renderExpandedAssessmentRequest}
      emptyPrimary={emptyPrimary}
      emptySecondary={emptySecondary}
      loading={isRequestsLoading}
      wrapperClassName="assessment-live-cards"
    />
  );

  /* Standardized Assessment: same expandable card list UI as Live – LEARNER | COURSE | ASSIGNED | COMPLETED | SCORE | STATUS | ACTION */
  const standardizedColumnHeaders = (
    <>
      <div className="session-card-header-cell session-card-header-title">
        <span
          className="session-card-chevron session-card-chevron-placeholder"
          aria-hidden
        >
          {" "}
        </span>
        <span className="session-cards-column-header-label">Learner</span>
      </div>
      <div className="session-card-header-cell session-card-header-course">
        <span className="session-cards-column-header-label">Course</span>
      </div>
      <div className="session-card-header-cell session-card-header-assignedat">
        <span className="session-cards-column-header-label">Assigned</span>
      </div>
      <div className="session-card-header-cell session-card-header-duration">
        <span className="session-cards-column-header-label">Completed</span>
      </div>
      <div className="session-card-header-cell session-card-header-host">
        <span className="session-cards-column-header-label">Score</span>
      </div>
      <div className="session-card-header-cell session-card-header-status">
        <span className="session-cards-column-header-label">Status</span>
      </div>
      <div className="session-card-header-cell session-card-header-action">
        <span className="session-cards-column-header-label">Action</span>
      </div>
    </>
  );

  const renderExpandedStandardizedBody = (record: any) => (
    <div
      className="session-expanded-inner pt-1 pb-1"
      onClick={(e) => e.stopPropagation()}
    >
      <Divider className="session-card-divider" />
      {record.assessmentRemarks && (
        <div className="mb-3">
          <Text
            type="secondary"
            className="text-xs font-semibold uppercase tracking-wider block mb-1"
          >
            Learner remarks
          </Text>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-800 whitespace-pre-wrap">
            {record.assessmentRemarks}
          </div>
        </div>
      )}
      <div className="session-expanded-toolbar session-expanded-single-row">
        <div className="session-expanded-left">
          <span className="session-expanded-info text-sm text-gray-600">
            Course assessment completed. View log for question-level details or
            reset to allow another attempt.
          </span>
        </div>
        <div className="session-expanded-right">
          <Button
            type="default"
            size="large"
            icon={<FileTextOutlined />}
            onClick={() => setAssessmentLogRecord({ ...record, _isLiveLog: false })}
          >
            Assessment Log
          </Button>
        </div>
      </div>
    </div>
  );

  const standardizedList = resultData?.data || [];
  const renderStandardizedCardList = () => (
    <SessionCardList
      list={standardizedList}
      getItemId={(r) => r._id}
      expandedIds={expandedStandardizedIds}
      onToggleExpand={toggleStandardizedExpand}
      columnHeaders={standardizedColumnHeaders}
      renderCardHeader={(record, isExpanded) => (
        <>
          <div className="session-card-header-cell session-card-header-title">
            <span className="session-card-chevron">
              {isExpanded ? <UpOutlined /> : <DownOutlined />}
            </span>
            <div className="session-card-title flex items-center gap-2 min-w-0">
              <Avatar
                src={record.employeeId?.profilePicture}
                icon={<UserOutlined />}
                size="small"
              />
              <span className="truncate">{record.employeeId?.name || "—"}</span>
            </div>
          </div>
          <div
            className="session-card-header-cell session-card-header-course"
            data-label="Course"
          >
            <span className="truncate text-sm">
              {record.courseId?.title ?? "—"}
            </span>
          </div>
          <div
            className="session-card-header-cell session-card-header-assignedat"
            data-label="Assigned"
          >
            {record.createdAt ? (
              <span className="text-sm text-gray-600">
                {dayjs(record.createdAt).format("MMM D, YYYY")}
              </span>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
          <div
            className="session-card-header-cell session-card-header-duration"
            data-label="Completed"
          >
            {record.lastAssessmentDate ? (
              <span className="text-sm text-gray-600">
                {dayjs(record.lastAssessmentDate).format("MMM D, YYYY")}
              </span>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
          <div
            className="session-card-header-cell session-card-header-host"
            data-label="Score"
          >
            <Tag
              color={
                record.assessmentScore >= 80
                  ? "green"
                  : record.assessmentScore >= 50
                    ? "orange"
                    : "red"
              }
            >
              {record.assessmentScore ?? 0}%
            </Tag>
          </div>
          <div
            className="session-card-header-cell session-card-header-status"
            data-label="Status"
          >
            <Tag
              color={
                record.assessmentStatus === "Passed"
                  ? "success"
                  : record.assessmentStatus === "Failed"
                    ? "error"
                    : "processing"
              }
            >
              {record.assessmentStatus ?? "—"}
            </Tag>
          </div>
          <div
            className="session-card-header-cell session-card-header-action"
            onClick={(e) => e.stopPropagation()}
            data-label="Action"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<ReloadOutlined />}
              title="Reset assessment"
              onClick={() => {
                resetAssessment({
                  courseId: record.courseId?._id ?? record.courseId,
                  employeeId: record.employeeId?._id ?? record.employeeId,
                });
                messageApi.success("Assessment reset successfully");
                refetchResults();
              }}
            />
          </div>
        </>
      )}
      renderCardBody={renderExpandedStandardizedBody}
      emptyPrimary="No standardized assessment results found."
      emptySecondary="Course assessment attempts and scores will appear here."
      loading={isResultsLoading}
      wrapperClassName="assessment-standardized-cards assessment-live-cards"
    />
  );

  const tabItems = [
    {
      key: ASSESSMENT_TAB_KEYS.SCHEDULED,
      label: (
        <span className="flex items-center gap-2">
          <ClockCircleOutlined />
          Assessment Requests
        </span>
      ),
      children: renderAssessmentRequestsCardList(
        requestedList,
        "No assessment requests.",
        "Schedule a request to move it to Upcoming.",
      ),
    },
    {
      key: ASSESSMENT_TAB_KEYS.UPCOMING,
      label: (
        <span className="flex items-center gap-2">
          <CalendarOutlined />
          Upcoming Assessments
        </span>
      ),
      children: renderAssessmentCardList(
        upcomingList,
        "No upcoming or live assessments.",
        "Scheduled and live assessments appear here.",
      ),
    },
    {
      key: ASSESSMENT_TAB_KEYS.COMPLETED,
      label: (
        <span className="flex items-center gap-2">
          <CheckCircleOutlined />
          Completed Assessments
        </span>
      ),
      children: (
        <Tabs
          activeKey={completedSubTab}
          onChange={(k) => setCompletedSubTab(k as "live" | "standardized")}
          size="middle"
          items={[
            {
              key: "live",
              label: (
                <span className="flex items-center gap-2">
                  <VideoCameraOutlined />
                  Live Assessment
                </span>
              ),
              children: renderAssessmentCardList(
                completedRequestsList,
                "No completed or cancelled live assessments.",
                "Past live assessment requests and session notes appear here.",
              ),
            },
            {
              key: "standardized",
              label: (
                <span className="flex items-center gap-2">
                  <FormOutlined />
                  Standardized Assessment
                </span>
              ),
              children: renderStandardizedCardList(),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MainLayout>
      {contextHolder}
      <LmsPageLayout
        header={
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-stretch sm:items-start gap-4">
            <div>
              <Title level={4} className="!m-0 text-gray-800 tracking-tight">
                Assessment Management
              </Title>
              <Text type="secondary" className="text-xs sm:text-sm block mt-1">
                Status-driven workflow: Requested → Scheduled → Live →
                Completed. Click a row to expand details.
              </Text>
            </div>
            <Space size="middle" className="w-full sm:w-auto">
              <Button
                size="large"
                onClick={async () => {
                  await Promise.all([refetchRequests(), refetchResults()]);
                }}
                loading={isRequestsLoading || isResultsLoading || isRequestsFetching || isResultsFetching}
                icon={<ReloadOutlined />}
                className="min-h-[44px] w-full sm:w-auto px-6 border-gray-200"
              >
                Refresh
              </Button>
            </Space>
          </div>
        }
      >
        <div className="space-y-6">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as AssessmentTabKey)}
            items={tabItems}
            className="assessment-tabs"
          />
        </div>

        {/* Schedule Assessment Modal — same UI as Schedule Session, Live Assessment only, participants read-only */}
        {/* Cancel Assessment – reason required; participants notified via linked session */}
        <Modal
          wrapClassName="lms-modal"
          title="Cancel Assessment"
          open={!!cancelAssessmentModalRecord}
          onCancel={() => {
            setCancelAssessmentModalRecord(null);
            cancelAssessmentReasonForm.resetFields();
          }}
          onOk={onCancelAssessmentModalOk}
          okText="Cancel assessment"
          okType="danger"
          cancelText="Keep assessment"
          destroyOnClose
          centered
          afterClose={() => cancelAssessmentReasonForm.resetFields()}
        >
          {cancelAssessmentModalRecord && (
            <>
              <p className="text-gray-600 mb-4">
                This scheduled assessment will be cancelled and moved to the
                Completed tab. The linked session will be cancelled and
                participants will be notified. Please provide a reason
                (required).
              </p>
              <Form form={cancelAssessmentReasonForm} layout="vertical">
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
                    placeholder="e.g. Assessor unavailable, rescheduled..."
                  />
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>

        <Modal
          wrapClassName="lms-modal"
          title={
            <div className="flex items-center gap-3 py-3 border-b border-gray-100 mb-0">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <VideoCameraOutlined className="text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 m-0 leading-tight">
                  Schedule Assessment
                </h3>
                <p className="text-xs text-gray-500 font-normal m-0 mt-0.5">
                  Set date, time, and meeting link. Participant is the employee
                  who requested.
                </p>
              </div>
            </div>
          }
          open={scheduleModalOpen}
          onCancel={() => {
            setScheduleModalOpen(false);
            setSchedulingRequest(null);
            scheduleForm.resetFields();
          }}
          footer={null}
          width={800}
          destroyOnClose
          centered
          className="custom-modal top-4"
        >
          {schedulingRequest && (
            <Form
              form={scheduleForm}
              layout="vertical"
              onFinish={onScheduleModalFinish}
              initialValues={{
                title: `Live Assessment: ${schedulingRequest.courseId?.title || "Assessment"}`,
                duration: 60,
                platform: "Google Meet",
                category: "Live Assessment",
                meetingLink: "",
                description: "",
              }}
              className="pt-4"
            >
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <div className="space-y-4">
                    <Form.Item
                      name="title"
                      label="Session Title"
                      rules={[
                        {
                          required: true,
                          min: 3,
                          message: "Title must be at least 3 characters",
                        },
                      ]}
                    >
                      <Input
                        size="large"
                        placeholder="e.g. Live Assessment: Course Name"
                        className="font-medium"
                      />
                    </Form.Item>
                    <Form.Item label="Session Type">
                      <Input
                        size="large"
                        value="Live Assessment"
                        disabled
                        className="bg-gray-50 text-gray-600"
                      />
                    </Form.Item>
                    <Form.Item label="Session Participants">
                      <Input
                        size="large"
                        value={getEmployeeDisplayName(schedulingRequest)}
                        disabled
                        className="bg-gray-50 text-gray-600"
                      />
                    </Form.Item>
                    <Form.Item
                      name="trainerId"
                      label="Host / Assessor"
                      rules={[
                        { required: true, message: "Please select the host" },
                      ]}
                    >
                      <Select
                        size="large"
                        placeholder="Select host or assessor"
                        showSearch
                        optionFilterProp="children"
                      >
                        {currentUserId && (
                          <Option key={currentUserId} value={currentUserId}>
                            <Space>
                              <UserOutlined />
                              {currentUserName
                                ? `Myself (${currentUserName})`
                                : "Myself"}
                            </Space>
                          </Option>
                        )}
                        {employees
                          .filter((e: any) => e._id !== currentUserId)
                          .map((e: any) => (
                            <Option key={e._id} value={e._id}>
                              {e.name ||
                                `${e.firstName || ""} ${e.lastName || ""}`.trim()}
                            </Option>
                          ))}
                      </Select>
                    </Form.Item>
                    <Form.Item
                      name="meetingLink"
                      label="Meeting Link"
                      rules={[
                        {
                          required: true,
                          message: "Meeting link is required to schedule the assessment",
                        },
                        {
                          type: "url",
                          message: "Please enter a valid meeting URL (e.g. https://meet.google.com/...)",
                        },
                      ]}
                    >
                      <Input
                        size="large"
                        prefix={<LinkOutlined className="text-gray-400" />}
                        placeholder="https://meet.google.com/... or Zoom/Teams link"
                      />
                    </Form.Item>
                    <Form.Item name="description" label="Description / Notes">
                      <Input.TextArea
                        rows={3}
                        placeholder="Optional notes for this assessment session"
                        className="resize-none"
                      />
                    </Form.Item>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100 h-full">
                    <Form.Item
                      name="scheduledAt"
                      label="Date & Time"
                      rules={[
                        {
                          required: true,
                          message: "Please select date and time",
                        },
                      ]}
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
                      <InputNumber size="large" min={1} className="w-full" />
                    </Form.Item>
                    <Divider className="my-2" />
                    <Form.Item
                      name="platform"
                      label="Platform"
                      rules={[{ required: true }]}
                    >
                      <Select size="large">
                        <Option value="Google Meet">Google Meet</Option>
                        <Option value="Zoom">Zoom</Option>
                        <Option value="Teams">Microsoft Teams</Option>
                      </Select>
                    </Form.Item>
                  </div>
                </Col>
              </Row>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                <Button
                  size="large"
                  onClick={() => {
                    setScheduleModalOpen(false);
                    setSchedulingRequest(null);
                    scheduleForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={scheduleSubmitting}
                  className="bg-primary hover:bg-primary/90 px-8 font-semibold"
                >
                  Schedule Assessment
                </Button>
              </div>
            </Form>
          )}
        </Modal>

        {/* End Assessment Session — review required (or duration completed, add notes) */}
        <Modal
          wrapClassName="lms-modal"
          title={
            <div className="flex items-center gap-3 py-3 border-b border-gray-100 mb-0">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                <FileTextOutlined className="text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 m-0 leading-tight">
                  {isAssessmentDurationCompleted
                    ? "Assessment Duration Completed"
                    : "End Assessment Session"}
                </h3>
                <p className="text-xs text-gray-500 font-normal m-0 mt-0.5">
                  {isAssessmentDurationCompleted
                    ? "The scheduled duration has ended. Please add performance and notes below."
                    : "Please provide feedback about this assessment session."}
                </p>
              </div>
            </div>
          }
          open={endSessionModalOpen}
          onCancel={() => {
            setEndSessionModalOpen(false);
            setIsAssessmentDurationCompleted(false);
            setEndSessionRequest(null);
            endSessionForm.resetFields();
          }}
          footer={null}
          width={560}
          destroyOnClose
          centered
          className="custom-modal top-4"
        >
          {endSessionRequest && (
            <Form
              form={endSessionForm}
              layout="vertical"
              onFinish={onEndSessionModalFinish}
              className="pt-4"
            >
              <Form.Item label="Session Title">
                <Input
                  value={
                    endSessionRequest.liveSessionId?.title ||
                    endSessionRequest.courseId?.title ||
                    "Assessment"
                  }
                  readOnly
                  className="bg-gray-50"
                />
              </Form.Item>
              <Form.Item label="Learner">
                <Input
                  value={getEmployeeDisplayName(endSessionRequest)}
                  readOnly
                  className="bg-gray-50"
                />
              </Form.Item>
              <Form.Item
                name="performancePercentage"
                label="Assessment performance (%)"
                rules={
                  isAssessmentDurationCompleted
                    ? []
                    : [
                        {
                          required: true,
                          message:
                            "Please enter the assessment performance percentage.",
                        },
                      ]
                }
                extra={
                  endSessionRequest.courseId?.qualificationScore != null
                    ? `Qualification score for this course: ${endSessionRequest.courseId.qualificationScore}%`
                    : "Qualification score for this course: 80% (default)"
                }
              >
                <InputNumber
                  min={0}
                  max={100}
                  placeholder="e.g. 85"
                  className="w-full"
                  size="large"
                  addonAfter="%"
                />
              </Form.Item>
              <Form.Item
                name="sessionSummary"
                label="Session Review / Notes"
                rules={
                  isAssessmentDurationCompleted
                    ? []
                    : [
                        {
                          required: true,
                          message:
                            "Please enter how the assessment went and any observations or notes.",
                        },
                      ]
                }
              >
                <TextArea
                  rows={4}
                  placeholder="How did the assessment go? Any observations, issues, or notes?"
                  className="resize-none"
                />
              </Form.Item>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  size="large"
                  onClick={() => {
                    setEndSessionModalOpen(false);
                    setIsAssessmentDurationCompleted(false);
                    setEndSessionRequest(null);
                    endSessionForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={endSessionSubmitting}
                  className="bg-primary hover:bg-primary/90 px-8 font-semibold"
                >
                  Save & Complete
                </Button>
              </div>
            </Form>
          )}
        </Modal>

        {/* Learner remarks modal — Live Assessment */}
        <Modal
          wrapClassName="lms-modal"
          title={
            <span className="flex items-center gap-2">
              <FileTextOutlined />
              Learner remarks
              {learnerRemarksModalRecord && (
                <span className="font-normal text-gray-500 text-sm">
                  — {getEmployeeDisplayName(learnerRemarksModalRecord)}
                </span>
              )}
            </span>
          }
          open={!!learnerRemarksModalRecord}
          onCancel={() => setLearnerRemarksModalRecord(null)}
          footer={
            <div className="flex justify-end">
              <Button
                type="primary"
                onClick={() => setLearnerRemarksModalRecord(null)}
              >
                Close
              </Button>
            </div>
          }
          width={520}
          centered
        >
          {learnerRemarksModalRecord?.learnerRemarks && (
            <Descriptions size="small" column={1} bordered className="mt-2">
              {learnerRemarksModalRecord.learnerRemarks.sessionPurpose && (
                <Descriptions.Item label="Session purpose">
                  <span className="whitespace-pre-wrap">
                    {learnerRemarksModalRecord.learnerRemarks.sessionPurpose}
                  </span>
                </Descriptions.Item>
              )}
              {learnerRemarksModalRecord.learnerRemarks.issues && (
                <Descriptions.Item label="Issues faced">
                  <span className="whitespace-pre-wrap">
                    {learnerRemarksModalRecord.learnerRemarks.issues}
                  </span>
                </Descriptions.Item>
              )}
              {learnerRemarksModalRecord.learnerRemarks.rating != null && (
                <Descriptions.Item label="Rating">
                  {learnerRemarksModalRecord.learnerRemarks.rating}/5
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Modal>

        {/* Standardized Assessment Log — questions, answers, scores (read-only) */}
        <Modal
          wrapClassName="lms-modal"
          title={
            <span className="flex items-center gap-2">
              <FileTextOutlined />
              Assessment Log
              {assessmentLogRecord && (
                <span className="font-normal text-gray-500 text-sm">
                  — {assessmentLogRecord.courseId?.title || "Assessment"} ·{" "}
                  {assessmentLogRecord.employeeId?.name || "Employee"}
                </span>
              )}
            </span>
          }
          open={!!assessmentLogRecord}
          onCancel={() => setAssessmentLogRecord(null)}
          footer={
            <div className="flex justify-end">
              <Button
                type="primary"
                onClick={() => setAssessmentLogRecord(null)}
              >
                Close
              </Button>
            </div>
          }
          width={720}
          centered
          destroyOnClose
        >
          {assessmentLogRecord && (() => {
            const isLiveLog = assessmentLogRecord._isLiveLog === true;
            const noteReviewBlock = (assessmentLogRecord.sessionSummary ||
              assessmentLogRecord.sessionNotes) ? (
              <div className={isLiveLog ? "mt-4" : "mb-4"}>
                <Text
                  strong
                  className="text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2"
                >
                  Note / Review
                </Text>
                <div className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 text-sm text-gray-800 whitespace-pre-wrap">
                  {assessmentLogRecord.sessionSummary ||
                    assessmentLogRecord.sessionNotes}
                </div>
              </div>
            ) : null;

            return (
              <div className="pt-2">
                {/* Standardized: Note/Review at top. Live: table first, then Note/Review below. */}
                {!isLiveLog && noteReviewBlock}
                {isAttemptLoading && (
                  <div className="py-8 text-center text-gray-500">
                    Loading attempt report...
                  </div>
                )}
                {!isAttemptLoading &&
                  (isAttemptError || !attemptReportData?.data) && (
                    <>
                      <div className="py-6 text-center">
                        <Text type="secondary">
                          No attempt data available. This may be an older assessment
                          completed before detailed logging was enabled.
                        </Text>
                      </div>
                      {isLiveLog && noteReviewBlock}
                    </>
                  )}
                {!isAttemptLoading &&
                  attemptReportData?.data &&
                  (() => {
                    const attempt = attemptReportData.data as any;
                    const snapByQid = (attempt.questionSnapshots || []).reduce(
                      (acc: any, s: any) => {
                        acc[s.questionId] = s;
                        return acc;
                      },
                      {},
                    );
                    const tableBlock = (
                      <Descriptions size="small" column={1} bordered>
                        <Descriptions.Item label="Employee">
                          {attempt.employeeId?.name ??
                            assessmentLogRecord.employeeId?.name ??
                            "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Assessment">
                          {attempt.courseId?.title ??
                            assessmentLogRecord.courseId?.title ??
                            "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Attempted date">
                          {attempt.submittedAt
                            ? dayjs(attempt.submittedAt).format(
                                "MMM D, YYYY h:mm A",
                              )
                            : "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Duration">
                          {attempt.durationMinutes != null
                            ? `${attempt.durationMinutes} min`
                            : "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Total score">
                          <Tag
                            color={
                              attempt.scorePercentage >= 80
                                ? "green"
                                : attempt.scorePercentage >= 50
                                  ? "orange"
                                  : "red"
                            }
                          >
                            {attempt.earnedMarks} / {attempt.totalMarks} (
                            {attempt.scorePercentage}%)
                          </Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    );
                    if (isLiveLog) {
                      return (
                        <div className="space-y-4">
                          {tableBlock}
                          {noteReviewBlock}
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-4">
                        {tableBlock}
                        <Divider className="my-3">
                          Questions &amp; answers
                        </Divider>
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                          {(attempt.questionResults || []).map(
                            (r: any, idx: number) => {
                              const snap = snapByQid[r.questionId];
                              const qText =
                                snap?.questionText || `Question ${idx + 1}`;
                              const userAns = Array.isArray(r.userAnswer)
                                ? r.userAnswer.join(", ")
                                : (r.userAnswer ?? "—");
                              const correctAns = Array.isArray(r.correctAnswer)
                                ? r.correctAnswer.join(", ")
                                : (r.correctAnswer ?? "—");
                              return (
                                <div
                                  key={r.questionId || idx}
                                  className="p-3 rounded-lg border border-gray-100 bg-gray-50/50"
                                >
                                  <div className="font-medium text-gray-800 mb-2">
                                    {qText}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-500">
                                        Selected:{" "}
                                      </span>
                                      <span
                                        className={
                                          r.isCorrect
                                            ? "text-green-700"
                                            : "text-red-700"
                                        }
                                      >
                                        {userAns || "—"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">
                                        Correct:{" "}
                                      </span>
                                      <span className="text-gray-800">
                                        {correctAns}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-500">
                                    Score: {r.marksAwarded} / {r.marksTotal}
                                    {r.isCorrect ? (
                                      <Tag color="success" className="ml-2">
                                        Correct
                                      </Tag>
                                    ) : (
                                      <Tag color="error" className="ml-2">
                                        Incorrect
                                      </Tag>
                                    )}
                                  </div>
                                  {r.aiFeedback && (
                                    <div className="mt-2 text-xs text-gray-600 italic border-l-2 border-primary/30 pl-2">
                                      AI: {r.aiFeedback}
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            );
          })()}
        </Modal>
      </LmsPageLayout>
    </MainLayout>
  );
};

export default AssessmentManagement;
