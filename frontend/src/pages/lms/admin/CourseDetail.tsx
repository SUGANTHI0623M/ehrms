import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import {
  LmsPageLayout,
  LmsSectionHeader,
  LmsCard,
  ArchiveIcon,
  PublishIcon,
  LmsLoadingState,
} from "@/components/lms/SharedComponents";
import CourseCurriculumSection from "@/components/lms/CourseCurriculumSection";
import type { Lesson, Material } from "@/components/lms/LmsCourseSidebar";
import {
  Typography,
  Progress,
  Button,
  Tag,
  Space,
  Card,
  List,
  Avatar,
  Result,
  message,
  Empty,
  Table,
  Input,
  Select,
  Badge,
  InputNumber,
  DatePicker,
  Row,
  Col,
  Alert,
  Statistic,
  Divider,
  Tooltip,
  Popconfirm,
  Modal,
  Form,
  Tabs,
  Descriptions,
  Dropdown,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  TeamOutlined,
  RiseOutlined,
  TrophyOutlined,
  BookOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  VideoCameraOutlined,
  YoutubeOutlined,
  GlobalOutlined,
  CloudSyncOutlined,
  FileOutlined,
  ExportOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  UserOutlined,
  UserAddOutlined,
  ReloadOutlined,
  CalendarOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { lmsService } from "@/services/lmsService";
import dayjs from "dayjs";
import CourseFormWizard from "../components/CourseFormWizard";
import { AssignLearnersDialog } from "@/components/lms/AssignLearnersDialog";
import { getFileUrl } from "@/utils/url";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useAppDispatch } from "@/store/hooks";
import { lmsApi } from "@/store/api/lmsApi";

const { Title, Text, Paragraph } = Typography;

interface LearnerProgress {
  employeeId: string;
  progressId?: string;
  name: string;
  email: string;
  profilePicture?: string;
  enrolledDate: string;
  completedLessons: string[];
  totalLessons: number;
  progressPercentage: number;
  currentLesson?: string;
  status: "Not Started" | "In Progress" | "Completed" | "Expired";
  lastAccessed?: string;
  completionDate?: string;
  assessmentScore?: number;
  isAccessBlocked?: boolean;
  dueDate?: string;
  isExpired?: boolean;
}

const CourseDetail = () => {
  const { courseId, id } = useParams(); // Support both 'courseId' and 'id' params for flexibility
  const actualCourseId = courseId || id; // Use courseId if available, otherwise fall back to id
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Learner Progress States
  const [learnerProgress, setLearnerProgress] = useState<LearnerProgress[]>([]);
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [playlistCollapsed, setPlaylistCollapsed] = useState(false);

  const { isDesktop } = useBreakpoint();

  const dispatch = useAppDispatch();
  const [logModalLearner, setLogModalLearner] = useState<LearnerProgress | null>(null);
  const [attemptReportData, setAttemptReportData] = useState<{ data?: any } | null>(null);
  const [isAttemptLoading, setIsAttemptLoading] = useState(false);
  const [isAttemptError, setIsAttemptError] = useState(false);

  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Extend deadline modal
  const [extendDeadlineModalOpen, setExtendDeadlineModalOpen] = useState(false);
  const [extendDeadlineRecord, setExtendDeadlineRecord] =
    useState<LearnerProgress | null>(null);
  const [extendDeadlineForm] = Form.useForm();
  const [extendDeadlineSubmitting, setExtendDeadlineSubmitting] =
    useState(false);

  // State for pagination (learner analytics table)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const learnerFetchIdRef = useRef(0);
  const courseFetchedForIdRef = useRef<string | null>(null);
  const learnersLoadedForCourseIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!actualCourseId) return;
    if (courseFetchedForIdRef.current === actualCourseId) return;
    courseFetchedForIdRef.current = actualCourseId;
    fetchCourseDetails();
  }, [actualCourseId]);

  // Refetch when user returns to the browser tab after being away (e.g. edited course elsewhere).
  // Only refetch if tab was hidden for at least 1.5s to avoid refresh on accidental tab switch or dev tools.
  const lastVisibleAtRef = useRef<number>(Date.now());
  useEffect(() => {
    if (!actualCourseId) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const hiddenDuration = Date.now() - lastVisibleAtRef.current;
        if (hiddenDuration >= 1500 && !isEditModalOpen) fetchCourseDetails();
      } else {
        lastVisibleAtRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [actualCourseId, isEditModalOpen]);

  const groupMaterialsByLesson = (materials: any[]): Lesson[] => {
    const grouped: any[] = [];
    materials.forEach((material) => {
      const lessonTitle = material.lessonTitle || "Introduction";
      let lesson = grouped.find((l) => l.title === lessonTitle);
      if (!lesson) {
        lesson = {
          id: lessonTitle,
          title: lessonTitle,
          materials: [],
        };
        grouped.push(lesson);
      }
      lesson.materials.push(material);
    });
    return grouped;
  };

  const fetchCourseDetails = async () => {
    if (!actualCourseId) return;
    setLoading(true);
    try {
      const res = await lmsService.getCourseById(actualCourseId);
      if (res.data) {
        const courseData = res.data.course;
        const normalizeMaterial = (m: any, lessonTitle?: string) => {
          const rawUrl = m.url ?? m.filePath ?? m.link ?? m.externalUrl ?? (m as any).contentUrl ?? (m as any).secure_url ?? "";
          const url = typeof rawUrl === "string" ? rawUrl.trim() : String(rawUrl || "").trim();
          return {
            ...m,
            lessonTitle: m.lessonTitle ?? lessonTitle,
            url,
            type: (m.type && String(m.type).toUpperCase()) || "URL",
            title: (m.title ?? "").toString().trim(),
          };
        };
        const fromLessons = (courseData.lessons || []).flatMap((l: any) =>
          (l.materials || []).map((m: any) => normalizeMaterial(m, l.title)),
        );
        const fromApi = (courseData.materials || []).map((m: any) => normalizeMaterial(m));
        const materialsList = fromLessons.length > 0 ? fromLessons : fromApi;
        const withContents = [
          ...materialsList,
          ...(courseData.contents || []).map((m: any) => normalizeMaterial(m)),
        ];
        setCourse({ ...courseData, materials: withContents });
        const groupedLessons = groupMaterialsByLesson(withContents);
        setLessons(groupedLessons);
        if (groupedLessons.length > 0) {
          setActiveLesson(groupedLessons[0].title);
          if (groupedLessons[0].materials.length > 0) {
            setSelectedMaterial(groupedLessons[0].materials[0]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch course details", error);
      message.error("Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  const fetchLearnerProgress = async (page = 1, limit = 10, requestId?: number, silent = false, statusOverride?: string) => {
    if (!actualCourseId) return;
    const id = requestId ?? ++learnerFetchIdRef.current;
    if (!silent) setLoadingLearners(true);
    try {
      const params: any = { page, limit };
      if (searchText) params.search = searchText;
      const status = statusOverride !== undefined ? statusOverride : statusFilter;
      if (status !== "All") params.status = status;
      const res = await lmsService.getCourseAnalytics(actualCourseId, params);
      if (id !== learnerFetchIdRef.current) return;
      if (res.success && res.data.learners) {
        const normalized = (res.data.learners as any[]).map((l: any) => ({
          ...l,
          progressPercentage: typeof l.progress === "number" ? l.progress : (l.completionPercentage ?? 0),
          enrolledDate: l.assignedDate ?? l.enrolledDate ?? l.createdAt,
          completedLessons: Array.isArray(l.completedLessons) ? l.completedLessons : Array(l.lessonsCompleted ?? 0).fill(""),
          assessmentScore: l.assessmentScore ?? l.score,
        }));
        setLearnerProgress(normalized);
        setAnalytics(res.data.analytics);
        setPagination({
          current: res.data.pagination.page,
          pageSize: res.data.pagination.limit,
          total: res.data.pagination.total,
        });
      }
    } catch (error) {
      if (id !== learnerFetchIdRef.current) return;
      console.error("Failed to fetch learner progress:", error);
      if (!silent) message.error("Failed to load learner progress");
    } finally {
      if (id === learnerFetchIdRef.current && !silent) setLoadingLearners(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!course) return;
    const newStatus = course.status === "Published" ? "Archived" : "Published";
    try {
      await lmsService.updateCourseStatus(course._id, newStatus);
      message.success(`Course ${newStatus} successfully`);
      fetchCourseDetails();
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to update course status");
    }
  };

  // Load assigned learners once when course is opened (in background). Do not fetch when switching to the tab.
  useEffect(() => {
    if (!actualCourseId || !course) return;
    if (course.status === "Draft") return; // no assigned learners for draft
    if (learnersLoadedForCourseIdRef.current === actualCourseId) return;
    learnersLoadedForCourseIdRef.current = actualCourseId;
    const requestId = ++learnerFetchIdRef.current;
    fetchLearnerProgress(1, 10, requestId, true);
  }, [actualCourseId, course]);

  const excludeEmployeeIdsForAssign = React.useMemo(() => {
    const fromCourse = (course?.assignedEmployees ?? [])
      .map((id: any) => (id && (typeof id === 'string' ? id : (id._id ?? id).toString())))
      .filter((s: string) => /^[a-fA-F0-9]{24}$/.test(s));
    const fromLearners = learnerProgress
      .map((l: any) => String(l.employeeId ?? l._id ?? ""))
      .filter((s: string) => /^[a-fA-F0-9]{24}$/.test(s));
    return [...new Set([...fromCourse, ...fromLearners])];
  }, [course?.assignedEmployees, learnerProgress]);

  useEffect(() => {
    if (!logModalLearner || !actualCourseId) {
      setAttemptReportData(null);
      setIsAttemptError(false);
      return;
    }
    const eid = (logModalLearner as any)._id ?? logModalLearner.employeeId;
    if (!eid) {
      setAttemptReportData(null);
      setIsAttemptError(true);
      return;
    }
    let cancelled = false;
    setIsAttemptLoading(true);
    setIsAttemptError(false);
    dispatch(
      lmsApi.endpoints.getCourseAssessmentAttemptReport.initiate({
        courseId: actualCourseId,
        employeeId: String(eid),
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
  }, [logModalLearner, actualCourseId, dispatch]);

  const handleTableChange = (newPagination: any) => {
    fetchLearnerProgress(newPagination.current, newPagination.pageSize);
  };

  const handleToggleAccess = async (progressId: string, currentStatus?: boolean) => {
    try {
      await lmsService.toggleCourseAccess(progressId, !currentStatus);
      message.success(!currentStatus ? "Learner access paused" : "Learner access restored");
      fetchLearnerProgress(pagination.current);
    } catch (error) {
      message.error("Failed to update access status");
    }
  };

  const handleUnenroll = async (progressId: string) => {
    try {
      await lmsService.unenrollLearner(progressId);
      message.success("Learner removed from course");
      fetchLearnerProgress(pagination.current);
      await fetchCourseDetails(); // Refresh course so removed learner appears again in Assign Learners dropdown
    } catch (error) {
      message.error("Failed to remove learner");
    }
  };

  const handleResetProgress = async (employeeId: string) => {
    try {
      await lmsService.resetLearnerProgress(actualCourseId!, employeeId);
      message.success("Course reset successfully. Learner can start from the beginning.");
      fetchLearnerProgress(pagination.current);
    } catch (error) {
      message.error("Failed to reset learner progress");
    }
  };

  const openExtendDeadlineModal = (record: LearnerProgress) => {
    setExtendDeadlineRecord(record);
    extendDeadlineForm.setFieldsValue({
      extendByDays: 7,
      dueDate: record.dueDate ? dayjs(record.dueDate) : undefined,
    });
    setExtendDeadlineModalOpen(true);
  };

  const handleExtendDeadline = async () => {
    if (!extendDeadlineRecord || !actualCourseId) return;
    try {
      const values = await extendDeadlineForm.getFieldsValue();
      const hasDate = values.dueDate && dayjs(values.dueDate).isValid();
      const hasDays = values.extendByDays != null && values.extendByDays >= 1;
      if (!hasDate && !hasDays) {
        message.warning("Enter extend by days (e.g. 7) or pick a new deadline date.");
        return;
      }
      setExtendDeadlineSubmitting(true);
      const employeeId = (extendDeadlineRecord as any)._id ?? extendDeadlineRecord.employeeId;
      const body: { dueDate?: string; extendByDays?: number } = {};
      if (hasDate) body.dueDate = dayjs(values.dueDate).toISOString();
      else if (hasDays) body.extendByDays = values.extendByDays;
      await lmsService.extendEnrollmentDeadline(actualCourseId, employeeId, body);
      message.success("Deadline extended.");
      setExtendDeadlineModalOpen(false);
      setExtendDeadlineRecord(null);
      fetchLearnerProgress(pagination.current);
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || "Failed to extend deadline");
    } finally {
      setExtendDeadlineSubmitting(false);
    }
  };

  const handleMaterialClick = (material: Material, _globalIndex?: number) => {
    setSelectedMaterial(material);
    setActiveLesson(material.lessonTitle || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const allMaterials: Material[] = course ? (course.materials || []) : [];

  const getIconForType = (type: string) => {
    switch (type) {
      case "PDF":
        return <FilePdfOutlined className="text-red-500" />;
      case "VIDEO":
        return <VideoCameraOutlined className="text-primary" />;
      case "YOUTUBE":
        return <YoutubeOutlined className="text-red-600" />;
      case "URL":
        return <GlobalOutlined className="text-[#efaa1f]" />;
      case "DRIVE":
        return <CloudSyncOutlined className="text-yellow-500" />;
      default:
        return <FileOutlined />;
    }
  };

  const renderMediaPreview = () => {
    if (!selectedMaterial) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span className="text-gray-400">Select a lesson from the sidebar to preview content</span>}
          className="my-20"
        />
      );
    }
    const rawUrl = selectedMaterial.url ?? selectedMaterial.filePath ?? selectedMaterial.link ?? selectedMaterial.externalUrl ?? (selectedMaterial as any).contentUrl ?? (selectedMaterial as any).secure_url ?? "";
    const url = getFileUrl(rawUrl);
    const type = (selectedMaterial.type && String(selectedMaterial.type).toUpperCase()) || "URL";
    const title = selectedMaterial.title ?? "";
    const isValidMediaUrl = (u: string) => {
      const s = (u || "").trim();
      if (!s || s === "/" || s.startsWith("javascript:")) return false;
      if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:") || s.startsWith("data:")) return true;
      try {
        const parsed = new URL(s, "http://localhost");
        if (parsed.pathname === "/" || parsed.pathname === "") return false;
      } catch {
        return s.length > 1;
      }
      return true;
    };
    const hasValidUrl = isValidMediaUrl(url);
    const previewTitle = (
      <span className="flex items-center gap-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#f0fdf4]">{getIconForType(type)}</span>
        <span><Text strong style={{ fontSize: 15 }}>{title}</Text> <Tag color="blue">{type}</Tag></span>
      </span>
    );
    const renderContent = () => {
      if (!hasValidUrl) {
        return (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center space-y-2">
            <Text type="secondary">No learning material available for this lesson.</Text>
            {(type === "PDF" || type === "VIDEO") && (
              <Text type="secondary" className="block text-sm">If you expected a file here, try editing the course and re-uploading this material.</Text>
            )}
          </div>
        );
      }
      switch (type) {
        case "PDF":
          return (
            <div className="w-full rounded-xl overflow-hidden bg-gray-100">
              <iframe key={url} src={`${url}#toolbar=1&view=FitH`} className="w-full border-none bg-gray-100 min-h-[600px] h-[75vh]" title="PDF Preview" />
            </div>
          );
        case "VIDEO": {
          const subtitleUrl = (selectedMaterial as any).subtitleUrl;
          const subtitleResolved = subtitleUrl ? getFileUrl(subtitleUrl) : "";
          return (
            <div className="w-full bg-black flex items-center justify-center aspect-video">
              <video controls controlsList="nodownload" crossOrigin="anonymous" className="max-w-full max-h-full" src={url}>
                {subtitleResolved && <track kind="subtitles" src={subtitleResolved} default />}
                Your browser does not support the video tag.
              </video>
            </div>
          );
        }
        case "YOUTUBE":
          let videoId = url;
          if (url.includes("v=")) videoId = url.split("v=")[1]?.split("&")[0];
          if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1];
          if (!videoId) {
            return (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
                <Text type="secondary">No learning material available for this lesson.</Text>
              </div>
            );
          }
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;
          return <iframe className="w-full aspect-video" src={embedUrl} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
        case "URL":
        case "DRIVE":
          return (
            <div className="w-full aspect-video relative border-none bg-white">
              <iframe src={url} className="w-full h-full" title="External Content" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
              <div className="absolute bottom-2 right-2 bg-white/90 p-2 rounded shadow text-xs text-gray-500">
                If content doesn't load, <a href={url} target="_blank" rel="noopener noreferrer">open externally</a>
              </div>
            </div>
          );
        default:
          return <Alert message="Unsupported content type" type="warning" showIcon className="m-4" />;
      }
    };
    return (
      <Card
        bordered
        size="small"
        style={{ borderColor: "#efaa1f", overflow: "hidden" }}
        styles={{ header: { borderBottom: "1px solid #f0f0f0" }, body: { padding: 16 } }}
        title={previewTitle}
        extra={hasValidUrl ? <Button type="text" icon={<ExportOutlined />} onClick={() => window.open(url, "_blank")} title="Open in new tab" /> : null}
      >
        {renderContent()}
      </Card>
    );
  };

  const renderLearnerAnalytics = () => {
    // Removed client-side filtering logic here

    const columns = [
      {
        title: "Learner",
        dataIndex: "name",
        key: "name",
        width: 280,
        render: (text: string, record: LearnerProgress) => (
          <Space>
            <Avatar src={record.profilePicture} icon={<UserOutlined />} />
            <div>
              <div className="font-medium text-sm">{text}</div>
              <Text type="secondary" className="text-xs">
                {record.email}
              </Text>
            </div>
          </Space>
        ),
      },
      {
        title: "Assigned Date",
        dataIndex: "enrolledDate",
        key: "enrolledDate",
        render: (date: string) => (
          <span className="text-xs text-gray-500">
            {dayjs(date).format("MMM D, YYYY")}
          </span>
        ),
      },
      {
        title: "Deadline",
        dataIndex: "dueDate",
        key: "dueDate",
        render: (date: string, record: LearnerProgress) => {
          if (!date) return <span className="text-gray-400">—</span>;
          const isExp = record.isExpired || record.status === "Expired";
          return (
            <span className={isExp ? "text-red-600 font-medium" : ""}>
              {dayjs(date).format("MMM D, YYYY")}
            </span>
          );
        },
      },
      {
        title: "Progress",
        dataIndex: "progressPercentage",
        key: "progress",
        width: 260,
        render: (percent: number, record: LearnerProgress) => {
          const pct =
            typeof percent === "number" && !Number.isNaN(percent)
              ? percent
              : ((record as any).progress ?? 0);
          const completed =
            (record as any).lessonsCompleted ??
            (Array.isArray(record.completedLessons)
              ? record.completedLessons.length
              : 0);
          const total = record.totalLessons ?? 0;
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              <span
                style={{ flexShrink: 0, fontSize: 12, whiteSpace: "nowrap" }}
                className="text-gray-600"
              >
                {completed}/{total} Lessons
              </span>
              <div style={{ flex: 1, minWidth: 0, width: 0 }}>
                <Progress
                  percent={Math.round(pct)}
                  showInfo={false}
                  size="small"
                  strokeColor={
                    pct < 40 ? "#ff4d4f" : pct < 70 ? "#faad14" : "#52c41a"
                  }
                  style={{ width: "100%" }}
                />
              </div>
              <span
                style={{ flexShrink: 0, fontSize: 12, whiteSpace: "nowrap" }}
              >
                {Math.round(pct)}%
              </span>
            </div>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status: string, record: LearnerProgress) => {
          const isExpired = record.isExpired || status === "Expired";
          if (isExpired) return <Tag color="error">Expired</Tag>;

          const score =
            record.assessmentScore ?? (record as any).score ?? 0;
          const passingScore = course.qualificationScore || 80;
          const lessonsCount =
            (record as any).lessonsCompleted ??
            (Array.isArray(record.completedLessons)
              ? record.completedLessons.length
              : 0);
          const totalLessons = record.totalLessons || 0;
          const isLessonsCompleted =
            totalLessons > 0 && lessonsCount === totalLessons;
          const isCourseCompleted =
            status === "Completed" && score >= passingScore;

          let displayStatus = "Not Started";
          let color = "default";
          if (isCourseCompleted) {
            displayStatus = "Course Completed";
            color = "success";
          } else if (isLessonsCompleted) {
            displayStatus = "Lessons Completed";
            color = "cyan";
          } else if (status === "In Progress") {
            displayStatus = "Ongoing";
            color = "processing";
          } else if (status === "Completed") {
            displayStatus = "Completed";
            color = "default";
          }
          return <Tag color={color}>{displayStatus}</Tag>;
        },
      },
      {
        title: "Access",
        key: "access",
        render: (_, record: LearnerProgress) => {
          if (record.isExpired || record.status === "Expired")
            return <Badge status="error" text="Expired" />;
          if (record.isAccessBlocked)
            return <Badge status="error" text="Paused" />;
          return <Badge status="success" text="Active" />;
        },
      },
      {
        title: "Score",
        dataIndex: "assessmentScore",
        key: "score",
        render: (score: number, record: LearnerProgress) => {
          const value = score ?? (record as any).score;
          return value != null && value !== "" ? (
            <Text strong>{Number(value)}%</Text>
          ) : (
            <span className="text-gray-400">-</span>
          );
        },
      },
      {
        title: "Action",
        key: "action",
        render: (_, record: LearnerProgress) => {
          const isExpired = record.isExpired || record.status === "Expired";
          const passingScore = course.qualificationScore || 80;
          const score =
            record.assessmentScore ?? (record as any).score ?? 0;
          const isCourseCompleted =
            record.status === "Completed" && score >= passingScore;

          if (isCourseCompleted) {
            return (
              <Tooltip title="View assessment log">
                <Button
                  type="default"
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => setLogModalLearner(record)}
                >
                  Assessment Log
                </Button>
              </Tooltip>
            );
          }

          return (
            <Dropdown
              placement="bottomRight"
              transitionName="ant-slide-down"
              overlayClassName="assigned-learners-action-dropdown-overlay"
              menu={{
                items: [
                  {
                    key: "reset",
                    label: "Reset course",
                    icon: <ReloadOutlined />,
                    onClick: () => {
                      Modal.confirm({
                        title: "Reset course progress?",
                        content:
                          "This will reset the learner's progress so they start the course from the beginning. Continue?",
                        okText: "Reset",
                        cancelText: "Cancel",
                        okButtonProps: { danger: true },
                        onOk: () =>
                          handleResetProgress(
                            (record as any)._id ?? record.employeeId
                          ),
                      });
                    },
                  },
                  ...(!isExpired
                    ? [
                        {
                          key: "pause",
                          label: record.isAccessBlocked
                            ? "Resume course access"
                            : "Pause course access",
                          icon: record.isAccessBlocked ? (
                            <PlayCircleOutlined />
                          ) : (
                            <PauseCircleOutlined />
                          ),
                          onClick: () =>
                            handleToggleAccess(
                              record.progressId!,
                              record.isAccessBlocked
                            ),
                        },
                      ]
                    : []),
                  {
                    key: "extend",
                    label: "Extend deadline",
                    icon: <CalendarOutlined />,
                    onClick: () => openExtendDeadlineModal(record),
                  },
                  {
                    key: "remove",
                    label: "Remove learner",
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => {
                      Modal.confirm({
                        title: "Remove learner from course?",
                        content:
                          "This will delete their progress permanently. Are you sure?",
                        okText: "Yes",
                        cancelText: "No",
                        okButtonProps: { danger: true },
                        onOk: () => handleUnenroll(record.progressId!),
                      });
                    },
                  },
                ].filter(Boolean),
              }}
              trigger={["click"]}
            >
              <Button
                type="text"
                size="small"
                className="assigned-learners-action-menu-trigger"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          );
        },
      },
    ];

    if (loadingLearners) {
      return (
        <div className="space-y-4">
          <LmsLoadingState minHeight="400px" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* KPI Cards — values from course analytics API */}
        <Row gutter={[16, 16]}>
          {[
            {
              title: "Total Enrolled",
              value: analytics?.totalEnrolled ?? 0,
              icon: <TeamOutlined />,
              color: "blue",
              subText: "Assigned to this course",
            },
            {
              title: "Completion Rate",
              value: `${analytics?.completionRate ?? 0}%`,
              icon: <RiseOutlined />,
              color: "emerald",
              subText: "Completed enrollments",
            },
            {
              title: "Avg. Assessment Score",
              value: `${analytics?.avgScore ?? 0}%`,
              icon: <TrophyOutlined />,
              color: "amber",
              subText: "Among learners who took assessment",
            },
            {
              title: "Active Learners",
              value: analytics?.activeLearners ?? 0,
              icon: <UserOutlined />,
              color: "indigo",
              subText: "In progress or completed",
            },
          ].map((item, idx) => (
            <Col xs={24} sm={12} xl={6} key={idx}>
              <Card className="rounded-2xl shadow-sm border-gray-100 hover:shadow-md transition-all duration-300">
                <Statistic
                  title={
                    <Text
                      type="secondary"
                      className="text-xs font-semibold uppercase tracking-wider"
                    >
                      {item.title}
                    </Text>
                  }
                  value={item.value}
                  prefix={
                    <div
                      className={`p-2 rounded-lg bg-${item.color}-50 text-${item.color}-500 mr-2 flex items-center justify-center inline-flex`}
                    >
                      {item.icon}
                    </div>
                  }
                  valueStyle={{
                    fontWeight: 800,
                    fontSize: "24px",
                    color: "#1f2937",
                  }}
                />
                <Text type="secondary" className="text-[10px] mt-2 block">
                  {item.subText}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <Space wrap className="w-full lg:w-auto">
            <Input
              placeholder="Search learners..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full sm:w-[250px]"
              onPressEnter={() => fetchLearnerProgress(1)}
            />
            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                fetchLearnerProgress(1, pagination.pageSize, undefined, false, val);
              }}
              className="w-full sm:w-[150px]"
            >
              <Select.Option value="All">All Status</Select.Option>
              <Select.Option value="Not Started">Not Started</Select.Option>
              <Select.Option value="In Progress">In Progress</Select.Option>
              <Select.Option value="Completed">Completed</Select.Option>
              <Select.Option value="Expired">Expired</Select.Option>
            </Select>
          </Space>
          <Space wrap className="w-full lg:w-auto lg:justify-end">
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setAssignModalOpen(true)}
              className="w-full sm:w-auto"
            >
              Assign Learner
            </Button>
            <Button
              onClick={() => fetchLearnerProgress(pagination.current)}
              icon={<ReloadOutlined />}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={learnerProgress}
          rowKey="employeeId"
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: "max-content" }}
          className="shadow-sm border border-gray-100 rounded-xl overflow-hidden"
        />
      </div>
    );
  };

  if (loading)
    return (
      <MainLayout>
        <div className="min-h-screen">
          <LmsLoadingState minHeight="100vh" />
        </div>
      </MainLayout>
    );
  if (!course)
    return (
      <MainLayout>
        <Empty description="Course not found" />
      </MainLayout>
    );

  const playlistContent = (
    <div className="h-full overflow-y-auto">
      <CourseCurriculumSection
        lessons={lessons}
        allMaterials={allMaterials}
        activeLessonKey={activeLesson}
        setActiveLessonKey={setActiveLesson}
        selectedMaterialId={selectedMaterial?._id || selectedMaterial?.id || null}
        onMaterialClick={handleMaterialClick}
        isAdmin={true}
        progressPercentage={0}
        completedMaterials={[]}
        isLessonLocked={() => false}
        isLessonCompleted={() => false}
        courseTitle={course.title}
        courseCategory={course?.category}
        variant="sidebar"
      />
    </div>
  );

  return (
    <MainLayout>
      <LmsPageLayout
        isDrawerOpen={isSidebarOpen}
        onDrawerClose={() => setIsSidebarOpen(false)}
        hideRightSidebarOnDesktop={isDesktop}
        rightSidebar={playlistContent}
        header={
          <LmsSectionHeader
            title={
              <div className="flex items-center gap-2">
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate(-1)}
                  type="text"
                />
                <Button
                  icon={<MenuOutlined />}
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden"
                  type="text"
                />
              </div>
            }
            action={
              <Space size="middle" wrap>
                <Button
                  size="large"
                  icon={
                    course.status === "Published" ? (
                      <ArchiveIcon />
                    ) : (
                      <PublishIcon />
                    )
                  }
                  onClick={handlePublishToggle}
                  className="!text-black hover:!border-[#efaa1f] hover:!text-[#efaa1f] [&_.anticon]:hover:!text-[#efaa1f] min-w-[120px] sm:min-w-[140px]"
                >
                  {course.status === "Published" ? "Archive" : "Publish"}
                </Button>
                <Button
                  size="large"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditModalOpen(true)}
                  className="!text-black hover:!border-[#efaa1f] hover:!text-[#efaa1f] [&_.anticon]:hover:!text-[#efaa1f] min-w-[120px] sm:min-w-[140px]"
                >
                  Edit Course
                </Button>
              </Space>
            }
          />
        }
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Player + playlist row: row height = player only; content panel slides in/out */}
          <div className="relative">
            <div className={isDesktop && !playlistCollapsed ? "flex-1 min-w-0 mr-[396px] xl:mr-[416px]" : isDesktop ? "flex-1 min-w-0" : "w-full"}>
              {renderMediaPreview()}
            </div>
            {isDesktop && (
              <>
                <Card
                  bordered
                  size="small"
                  className={`lms-course-sidebar-card absolute right-0 top-0 bottom-0 w-[380px] min-w-[320px] xl:w-[400px] xl:min-w-[360px] overflow-hidden transition-transform duration-300 ease-out ${playlistCollapsed ? "translate-x-full" : "translate-x-0"}`}
                  style={{
                    borderColor: "#efaa1f",
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    ...(playlistCollapsed ? { pointerEvents: "none" } : {}),
                  }}
                  styles={{ body: { flex: 1, minHeight: 0, overflow: "auto", padding: 12 } }}
                >
                  <div className="min-h-0 h-full overflow-y-auto" style={{ margin: "0 -12px" }}>
                    <CourseCurriculumSection
                      lessons={lessons}
                      allMaterials={allMaterials}
                      activeLessonKey={activeLesson}
                      setActiveLessonKey={setActiveLesson}
                      selectedMaterialId={selectedMaterial?._id || selectedMaterial?.id || null}
                      onMaterialClick={handleMaterialClick}
                      isAdmin={true}
                      progressPercentage={0}
                      completedMaterials={[]}
                      isLessonLocked={() => false}
                      isLessonCompleted={() => false}
                      courseTitle={course.title}
                      courseCategory={course?.category}
                      variant="sidebar"
                      renderHeaderLeft={
                        <Button
                          type="text"
                          size="small"
                          icon={<MenuFoldOutlined />}
                          onClick={() => setPlaylistCollapsed(true)}
                          title="Collapse course content"
                          className="border-0 text-[hsl(var(--muted-foreground))] hover:!text-[hsl(var(--foreground))] hover:!bg-[hsl(var(--muted))]"
                        />
                      }
                      renderHeaderRight={
                        <Button
                          type="text"
                          size="small"
                          icon={<MenuFoldOutlined />}
                          onClick={() => setPlaylistCollapsed(true)}
                          title="Collapse course content"
                          className="border-0 text-[hsl(var(--muted-foreground))] hover:!text-[hsl(var(--foreground))] hover:!bg-[hsl(var(--muted))]"
                        />
                      }
                    />
                  </div>
                </Card>
                {playlistCollapsed && (
                  <Button
                    type="text"
                    icon={<MenuUnfoldOutlined />}
                    onClick={() => setPlaylistCollapsed(false)}
                    title="Expand course content"
                    aria-label="Expand course content"
                    className="!absolute right-0 top-[18%] -translate-y-1/2 z-10 !w-10 !h-14 !rounded-l-lg !border !border-r-0 !border-gray-200 !bg-white !shadow-md !flex !items-center !justify-center"
                  />
                )}
              </>
            )}
          </div>

          {/* Tabs */}
          <Card
            className="shadow-sm border-gray-200/60 rounded-xl overflow-hidden"
            bordered={false}
            styles={{ body: { padding: 0 } }}
          >
            <Tabs
              activeKey={course.status === "Draft" && activeTab === "analysis" ? "overview" : activeTab}
              onChange={(key: string) => {
                setActiveTab(key);
                // Don't fetch here; useEffect below runs when activeTab becomes "analysis"
              }}
              size="large"
              className="custom-tabs px-2 pt-2 pb-0 bg-white border-b border-gray-100"
              tabBarStyle={{
                marginBottom: 0,
                paddingLeft: 16,
                paddingBottom: 0,
              }}
              items={[
                {
                  key: "overview",
                  label: (
                    <span className="flex items-center gap-2 px-2">
                      <BookOutlined />
                      Course Overview
                    </span>
                  ),
                  children: (
                    <div className="space-y-4 pt-5 px-4 pb-4">
                      <div>
                        <Title level={4}>Course Description</Title>
                        <Paragraph className="text-gray-600 leading-relaxed">
                          {course.description}
                        </Paragraph>
                      </div>
                      <Divider />
                      <div>
                        <Title level={5} className="mb-4">
                          Course Details
                        </Title>
                        <Row gutter={[24, 24]}>
                          <Col span={8}>
                            <Text
                              type="secondary"
                              className="block text-xs uppercase mb-1"
                            >
                              Categories
                            </Text>
                            {Array.isArray(course.categories) && course.categories.length > 0 ? (
                              <Space size={[0, 4]} wrap>
                                {course.categories.map((cat: string) => (
                                  <Tag key={cat}>{cat}</Tag>
                                ))}
                              </Space>
                            ) : (
                              <Text strong>{course.category || "—"}</Text>
                            )}
                          </Col>
                          <Col span={8}>
                            <Text
                              type="secondary"
                              className="block text-xs uppercase mb-1"
                            >
                              Status
                            </Text>
                            <Tag
                              color={
                                course.status === "Published"
                                  ? "success"
                                  : course.status === "Archived"
                                    ? "error"
                                    : "warning"
                              }
                            >
                              {course.status}
                            </Tag>
                          </Col>
                          <Col span={8}>
                            <Text
                              type="secondary"
                              className="block text-xs uppercase mb-1"
                            >
                              Created At
                            </Text>
                            <Text>
                              {dayjs(course.createdAt).format("MMM D, YYYY")}
                            </Text>
                          </Col>
                          <Col span={8}>
                            <Text
                              type="secondary"
                              className="block text-xs uppercase mb-1"
                            >
                              Language
                            </Text>
                            <Text>{course.language || "English"}</Text>
                          </Col>
                          <Col span={8}>
                            <Text
                              type="secondary"
                              className="block text-xs uppercase mb-1"
                            >
                              Duration
                            </Text>
                            <Text>
                              {course.completionDuration?.value}{" "}
                              {course.completionDuration?.unit}
                            </Text>
                          </Col>
                          <Col span={8}>
                            <Text
                              type="secondary"
                              className="block text-xs uppercase mb-1"
                            >
                              Total Materials
                            </Text>
                            <Text>
                              {(course.materials?.length || 0) +
                                (course.contents?.length || 0)}
                            </Text>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  ),
                },
                ...(course.status !== "Draft"
                  ? [
                      {
                        key: "analysis",
                        label: (
                          <span className="flex items-center gap-2 px-2">
                            <TeamOutlined />
                            Assigned Learners
                          </span>
                        ),
                        children: (
                          <div className="space-y-4 pt-5 px-4 pb-4">
                            {renderLearnerAnalytics()}
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </Space>
      </LmsPageLayout>

      <AssignLearnersDialog
        type="course"
        resourceId={actualCourseId!}
        resourceTitle={course?.title}
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={() => {
          fetchLearnerProgress(pagination.current);
          fetchCourseDetails(); // Keep course.assignedEmployees in sync so newly assigned don't show in dropdown next time
        }}
        excludeEmployeeIds={excludeEmployeeIdsForAssign}
      />

      {/* Extend deadline modal */}
      <Modal
        title="Extend deadline"
        open={extendDeadlineModalOpen}
        onCancel={() => {
          setExtendDeadlineModalOpen(false);
          setExtendDeadlineRecord(null);
        }}
        onOk={handleExtendDeadline}
        okText="Extend"
        confirmLoading={extendDeadlineSubmitting}
        destroyOnHidden
        width={400}
      >
        {extendDeadlineRecord && (
          <p className="text-gray-600 mb-4">
            Extend deadline for <strong>{extendDeadlineRecord.name}</strong>.
          </p>
        )}
        <Form form={extendDeadlineForm} layout="vertical">
          <Form.Item name="extendByDays" label="Extend by (days)">
            <InputNumber
              min={1}
              max={365}
              className="w-full"
              placeholder="e.g. 7"
            />
          </Form.Item>
          <Form.Item name="dueDate" label="Or set new deadline">
            <DatePicker className="w-full" format="MMM D, YYYY" />
          </Form.Item>
        </Form>
        <p className="text-xs text-gray-500">
          Provide either &quot;Extend by days&quot; or a new deadline date.
        </p>
      </Modal>

      {/* Assessment Log modal for completed learners */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            <FileTextOutlined />
            Assessment Log
            {logModalLearner && (
              <span className="font-normal text-gray-500 text-sm">
                — {course?.title} · {logModalLearner.name}
              </span>
            )}
          </span>
        }
        open={!!logModalLearner}
        onCancel={() => {
          setLogModalLearner(null);
          setAttemptReportData(null);
        }}
        footer={
          <div className="flex justify-end">
            <Button type="primary" onClick={() => setLogModalLearner(null)}>
              Close
            </Button>
          </div>
        }
        width={720}
        centered
        destroyOnClose
      >
        {logModalLearner && (
          <>
            {isAttemptLoading && (
              <div className="py-8 text-center text-gray-500">
                Loading assessment log...
              </div>
            )}
            {!isAttemptLoading && (isAttemptError || !attemptReportData?.data) && (
              <div className="py-6 text-center">
                <Text type="secondary">
                  No attempt data available for this learner.
                </Text>
              </div>
            )}
            {!isAttemptLoading && attemptReportData?.data && (() => {
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
                    {attempt.employeeId?.name ?? logModalLearner.name ?? "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Assessment">
                    {attempt.courseId?.title ?? course?.title ?? "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Attempted date">
                    {attempt.submittedAt
                      ? dayjs(attempt.submittedAt).format("MMM D, YYYY h:mm A")
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
              const hasResults = (attempt.questionResults || []).length > 0;
              return (
                <div className="pt-2 space-y-4">
                  {tableBlock}
                  {hasResults && (
                    <>
                      <Divider className="my-3">Questions &amp; answers</Divider>
                      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                        {(attempt.questionResults || []).map((r: any, idx: number) => {
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
                                  <span className="text-gray-500">Selected: </span>
                                  <span
                                    className={
                                      r.isCorrect ? "text-green-700" : "text-red-700"
                                    }
                                  >
                                    {userAns || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Correct: </span>
                                  <span className="text-gray-800">{correctAns}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </Modal>

      <CourseFormWizard
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          fetchCourseDetails();
        }}
        initialData={course}
        canEditCurriculum={course ? (course.canEditCurriculum === true) : true}
      />
    </MainLayout>
  );
};

export default CourseDetail;