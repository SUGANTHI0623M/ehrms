import React from "react";
import {
  Card,
  Typography,
  Tag,
  Button,
  Progress,
  Avatar,
  Tabs,
  Empty,
  Skeleton,
} from "antd";
import {
  ClockCircleOutlined,
  BookOutlined,
  FileImageOutlined,
  RightOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

/** Skeleton loading for LMS pages – no spinner, skeleton blocks only */
export const LmsLoadingState: React.FC<{
  minHeight?: string;
  tip?: string;
}> = ({ minHeight = "200px" }) => (
  <div className="lms-loading-state flex flex-col gap-4 p-4" style={{ minHeight }}>
    <Skeleton active paragraph={{ rows: 1 }} title={{ width: "40%" }} />
    <Skeleton active paragraph={{ rows: 2 }} />
    <Skeleton active paragraph={{ rows: 3 }} />
  </div>
);

/** Skeleton for LMS detail pages (course, quiz, etc.) */
export const LmsDetailPageSkeleton: React.FC = () => (
  <div className="space-y-6">
    <Skeleton active paragraph={{ rows: 1 }} title={{ width: "60%" }} />
    <Skeleton active paragraph={{ rows: 3 }} />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton active paragraph={{ rows: 4 }} />
      <Skeleton active paragraph={{ rows: 4 }} />
    </div>
  </div>
);

/** Skeleton matching LmsCourseCard layout – 16:9 thumbnail + title/category/actions area */
export const LmsCourseCardSkeleton: React.FC = () => (
  <Card
    className="lms-card lms-course-card h-full overflow-hidden"
    bodyStyle={{ padding: 0 }}
  >
    <div className="w-full aspect-video bg-gray-100 rounded-t-lg overflow-hidden animate-pulse" />
    <div className="p-3 flex flex-col gap-2">
      <div className="flex justify-between items-center gap-2">
        <Skeleton active title={{ width: "70%" }} paragraph={false} />
        <Skeleton active title={{ width: 48 }} paragraph={false} />
      </div>
      <Skeleton active paragraph={{ rows: 1, width: "40%" }} title={false} />
      <div className="flex gap-2 mt-1">
        <Skeleton.Button active size="small" />
        <Skeleton.Button active size="small" />
      </div>
    </div>
  </Card>
);

/** Empty state wrapper for LMS – consistent padding and description styling */
export const LmsEmptyState: React.FC<{
  description: React.ReactNode;
  image?: React.ReactNode;
  primary?: string;
  secondary?: string;
}> = ({
  description,
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  primary,
  secondary,
}) => (
  <div className="lms-empty-state">
    <Empty
      image={image}
      description={
        <div className="text-center">
          {primary && (
            <div className="text-base font-medium text-foreground block mb-1">
              {primary}
            </div>
          )}
          <div className="text-sm text-muted-foreground">{description}</div>
          {secondary && (
            <div className="text-xs text-muted-foreground mt-1">
              {secondary}
            </div>
          )}
        </div>
      }
    />
  </div>
);

import { getFileUrl } from "@/utils/url";

const iconBaseStyle: React.CSSProperties = {
  width: "1.35em",
  height: "1.35em",
  display: "inline-block",
  verticalAlign: "middle",
};

/** Archive (box) icon for Archive course action – use where Archive is used */
export const ArchiveIcon = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
    style={{ ...iconBaseStyle, verticalAlign: "-0.2em", ...style }}
  >
    <path
      fill="currentColor"
      d="m12 17.192l3.308-3.307l-.708-.708l-2.1 2.1v-4.7h-1v4.7l-2.1-2.1l-.708.708zM5 7.808v10.577q0 .269.173.442t.443.173h12.769q.269 0 .442-.173t.173-.442V7.808zM5.77 20q-.672 0-1.221-.549T4 18.231V7.486q0-.292.093-.55t.28-.475l1.558-1.87q.217-.293.543-.442T7.173 4h9.616q.372 0 .708.149t.553.441l1.577 1.91q.187.217.28.485q.093.267.093.56V18.23q0 .671-.549 1.22t-1.22.549zM5.38 6.808H18.6L17.27 5.21q-.097-.096-.222-.153T16.788 5H7.192q-.134 0-.26.058t-.22.154zM12 13.404"
    />
  </svg>
);

/** Publish (upload/arrow up) icon for Publish course action */
export const PublishIcon = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
    style={{ ...iconBaseStyle, ...style }}
  >
    <path
      fill="currentColor"
      d="M11.5 19v-8.65l-2.33 2.33l-.708-.718L12 8.423l3.539 3.539l-.708.719L12.5 10.35V19zM5 9.039V6.616q0-.691.463-1.153T6.616 5h10.769q.69 0 1.153.463T19 6.616v2.423h-1V6.616q0-.231-.192-.424T17.384 6H6.616q-.231 0-.424.192T6 6.616v2.423z"
    />
  </svg>
);

// --- COMPONENTS ---

export const LmsCard = ({ children, className = "", ...props }: any) => (
  <Card className={`lms-card ${className}`} bordered={true} {...props}>
    {children}
  </Card>
);

export const LmsSectionHeader = ({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div>
      <Title
        level={2}
        style={{ margin: 0 }}
        className="flex items-center gap-3 !mb-1 !text-2xl"
      >
        {title}
      </Title>
      {subtitle && <Text type="secondary">{subtitle}</Text>}
    </div>
    {action}
  </div>
);

export const LmsStatisticCard = ({
  title,
  value,
  icon,
  color,
  suffix,
}: any) => (
  <div className="lms-card bg-card p-6 flex items-center justify-between transition-all duration-200 hover:shadow-md">
    <div>
      <Text
        type="secondary"
        className="text-xs font-bold uppercase tracking-wider block mb-2"
      >
        {title}
      </Text>
      <div className="text-3xl font-bold text-foreground tracking-tight">
        {value}
        {suffix && (
          <span className="text-lg text-muted-foreground font-medium ml-1">
            {suffix}
          </span>
        )}
      </div>
    </div>
    <div
      className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0"
      style={{ backgroundColor: `${color}18`, color: color }}
    >
      {icon}
    </div>
  </div>
);

interface LmsCourseCardProps {
  course: any;
  onClick: () => void;
  actionButton?: React.ReactNode;
  showProgress?: boolean;
  progress?: number; // 0-100
  status?: string;
  /** When learner passed assessment (live or standardized) */
  assessmentStatus?: string;
  /** Score 0-100 when assessment passed */
  assessmentScore?: number;
  /** Compact time left (e.g. "2W 3D", "5D", "Overdue") – shown instead of "Valid until" */
  timeLeft?: string | null;
  /** @deprecated Use timeLeft instead. Kept for backward compatibility. */
  validityDate?: string | null;
}

function statusLabel(
  status?: string,
  assessmentStatus?: string,
  assessmentScore?: number,
): string {
  if (assessmentStatus === "Passed" && assessmentScore != null) {
    return `Passed ${assessmentScore}%`;
  }
  if (status === "Completed") return "Completed";
  if (status === "In Progress" || status === "Expired") return status;
  return status === "Not Started" ? "Not Started" : status || "—";
}

/** Get 1–2 letter initials from course title for placeholder */
function courseInitials(title: string | undefined): string {
  if (!title || !title.trim()) return "?";
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return title.slice(0, 2).toUpperCase();
}

export const LmsCourseCard = ({
  course,
  onClick,
  actionButton,
  showProgress = false,
  progress = 0,
  status,
  assessmentStatus,
  assessmentScore,
  timeLeft,
  validityDate,
}: LmsCourseCardProps) => {
  const displayStatus = statusLabel(status, assessmentStatus, assessmentScore);
  const isPassed = assessmentStatus === "Passed";
  const categoryName = course.category || (Array.isArray(course.categories) && course.categories.length ? course.categories[0] : "General");
  const lessonCount = course.lessonCount ?? course.lessons?.length ?? course.materials?.length ?? 0;

  return (
    <Card
      hoverable
      className="lms-card lms-course-card h-full flex flex-col overflow-hidden group rounded-xl transition-all duration-200 hover:shadow-lg"
      bodyStyle={{
        padding: 0,
        flex: 1,
        display: "flex",
        flexDirection: "column",
      }}
      onClick={onClick}
    >
      {/* Thumbnail / Banner - Aspect Ratio 16:9 */}
      <div className="relative w-full aspect-video bg-gray-100 shrink-0 overflow-hidden">
        {course?.thumbnailUrl ? (
          <img
            src={getFileUrl(course.thumbnailUrl)}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/600x400/f3f4f6/9ca3af?text=No+Image";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-400 text-gray-800 px-3 py-4">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight opacity-90">
              {courseInitials(course?.title)}
            </span>
            <span className="text-xs sm:text-sm font-medium mt-1 text-center line-clamp-2 leading-tight max-w-full">
              {course?.title || "Course"}
            </span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <Tag
            color={
              isPassed
                ? "success"
                : status === "Completed"
                  ? "success"
                  : status === "In Progress"
                    ? "processing"
                    : "default"
            }
            className="m-0 border-none shadow-sm opacity-95 text-[10px] px-2 py-0.5 font-medium rounded-md"
          >
            {displayStatus}
          </Tag>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 flex flex-col min-h-0">
        {/* Title row: title | lesson count (left), Mandatory (right) */}
        <div className="flex justify-between items-center gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Title
              level={5}
              className="!text-sm !mb-0 !font-bold line-clamp-2 leading-snug min-w-0 text-gray-800"
              title={course.title}
            >
              {course.title}
            </Title>
            <span className="text-gray-300 shrink-0" aria-hidden>|</span>
            <span className="flex items-center gap-1 text-[11px] text-gray-600 font-medium shrink-0">
              <BookOutlined className="text-gray-500" />
              {lessonCount} {lessonCount === 1 ? "Lesson" : "Lessons"}
            </span>
          </div>
          {course.isMandatory && (
            <Tag className="m-0 shrink-0 text-[10px] px-1.5 py-0 rounded">Mandatory</Tag>
          )}
        </div>

        {/* Category + Deadline row */}
        <div className="flex justify-between items-center gap-2 mb-3">
          <Tag color="blue" className="m-0 text-[10px] px-1.5 py-0 rounded">
            {categoryName}
          </Tag>
          {timeLeft != null && timeLeft !== "" && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md shrink-0 ${
                timeLeft === "Overdue"
                  ? "bg-red-50 text-red-600"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <ClockCircleOutlined className="text-[10px]" />
              {timeLeft}
            </span>
          )}
        </div>

        <div className="mt-auto space-y-3 pt-2">
          {/* Progress */}
          {showProgress && (
            <div>
              <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
                <span>
                  {status === "Completed" || isPassed
                    ? "Completed"
                    : `${progress}% Complete`}
                </span>
              </div>
              <Progress
                percent={progress}
                showInfo={false}
                size="small"
                strokeColor={status === "Completed" || isPassed ? "#22c55e" : "#3b82f6"}
                trailColor="#f1f5f9"
                className="[&_.ant-progress-bg]:rounded-full"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                size={22}
                icon={<UserOutlined />}
                className="bg-indigo-100 text-indigo-600 shrink-0"
              />
              <Text
                type="secondary"
                className="truncate text-[11px] font-medium text-gray-500"
              >
                {course.instructor || "Admin"}
              </Text>
            </div>
            {actionButton && (
              <div onClick={(e) => e.stopPropagation()}>{actionButton}</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export const LmsTabs = ({ items, activeKey, onChange }: any) => (
  <Tabs
    activeKey={activeKey}
    onChange={onChange}
    items={items}
    type="card"
    className="lms-tabs"
    tabBarStyle={{ marginBottom: 24 }}
  />
);

export const LmsPrimaryButton = ({ children, icon, ...props }: any) => (
  <Button
    type="primary"
    className="lms-btn-primary bg-primary hover:bg-primary/90 border-none"
    icon={icon}
    {...props}
  >
    {children}
  </Button>
);

import { Drawer } from "antd";

export interface LmsPageLayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  rightSidebar?: React.ReactNode;
  /** When true, sidebar is collapsed to a narrow strip with expand button (desktop only) */
  rightSidebarCollapsed?: boolean;
  onRightSidebarToggle?: () => void;
  /** For mobile/tablet drawer */
  isDrawerOpen?: boolean;
  onDrawerClose?: () => void;
  /** When true, desktop sidebar column is hidden (rightSidebar still used in drawer on small screens) */
  hideRightSidebarOnDesktop?: boolean;
}

export const LmsPageLayout = ({
  header,
  children,
  rightSidebar,
  rightSidebarCollapsed = false,
  onRightSidebarToggle,
  isDrawerOpen = false,
  onDrawerClose,
  hideRightSidebarOnDesktop = false,
}: LmsPageLayoutProps) => (
  <div className="flex flex-col min-h-[calc(100vh-64px)] bg-gray-50">
    <div className="flex flex-1 min-h-0 items-start">
      <div className="flex-1 flex flex-col min-w-0 min-h-0 w-full">
        {header && (
          <div className="px-6 py-4 bg-gray-50 shrink-0">{header}</div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 scroll-smooth w-full">
          <div className="lms-page max-w-[1600px] mx-auto w-full flex flex-col min-h-full">
            {children}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar (hidden when hideRightSidebarOnDesktop so page can render playlist inline) */}
      {rightSidebar && (
        <div
          className={`flex-shrink-0 border-l border-gray-200 bg-white shadow-lg z-20 flex flex-col overflow-hidden self-stretch transition-[width] duration-200 ease-in-out p-0 ${
            hideRightSidebarOnDesktop ? "hidden" : "hidden lg:flex"
          } ${rightSidebarCollapsed ? "w-14" : "w-[380px] xl:w-[400px]"}`}
        >
          {rightSidebarCollapsed && onRightSidebarToggle ? (
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              onClick={onRightSidebarToggle}
              className="w-full h-14 flex items-center justify-center rounded-none border-b border-gray-100 hover:bg-gray-50"
              title="Expand course content"
            />
          ) : (
            rightSidebar
          )}
        </div>
      )}

      {/* Mobile/Tablet Drawer */}
      {rightSidebar && (
        <Drawer
          title="Course Content"
          placement="right"
          onClose={onDrawerClose}
          open={isDrawerOpen}
          width={Math.min(window.innerWidth - 48, 400)}
          bodyStyle={{ padding: 0 }}
          className="lg:hidden"
        >
          {rightSidebar}
        </Drawer>
      )}
    </div>
  </div>
);
