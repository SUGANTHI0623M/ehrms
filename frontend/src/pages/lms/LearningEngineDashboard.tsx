import React, { useMemo, useState, useEffect } from "react";
import dayjs from "dayjs";
import {
  Card,
  Row,
  Col,
  Typography,
  Tooltip,
  Empty,
  Progress,
  Select,
  Skeleton,
} from "antd";
import { LmsLoadingState } from "@/components/lms/SharedComponents";
import {
  CheckCircleOutlined,
  BookOutlined,
  TrophyOutlined,
  CalendarOutlined,
  RiseOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import MainLayout from "@/components/MainLayout";
import { useGetLearningEngineDashboardQuery } from "@/store/api/lmsApi";
import { lmsService } from "@/services/lmsService";
import { ActivityHeatmap } from "@/components/lms/LearningConsistencyHeatmap";

const { Title, Text } = Typography;

interface DifficultyStat {
  total: number;
  completed: number;
  percent: number;
  beatsPercent: number;
}

interface QuizStats {
  totalAssigned: number;
  totalCompleted: number;
  completionPercent: number;
  easy: DifficultyStat;
  medium: DifficultyStat;
  hard: DifficultyStat;
}

const defaultDifficultyStat: DifficultyStat = {
  total: 0,
  completed: 0,
  percent: 0,
  beatsPercent: 0,
};

const QuizPerformanceCard: React.FC<{
  quizStats: QuizStats | null;
  loading: boolean;
}> = ({ quizStats, loading }) => {
  const totalAssigned = quizStats?.totalAssigned ?? 0;
  const totalCompleted = quizStats?.totalCompleted ?? 0;
  const completionPercent = quizStats?.completionPercent ?? 0;
  const easy = quizStats?.easy ?? defaultDifficultyStat;
  const medium = quizStats?.medium ?? defaultDifficultyStat;
  const hard = quizStats?.hard ?? defaultDifficultyStat;
  const hasNoQuizzes = !loading && totalAssigned === 0;

  if (loading) {
    return (
      <Card className="rounded-xl shadow-sm border-gray-100 h-full">
        <div className="py-6 px-4">
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      </Card>
    );
  }

  if (hasNoQuizzes) {
    return (
      <Card
        title={
          <span className="font-semibold text-gray-800">
            <TrophyOutlined className="mr-2 text-amber-500" />
            Quiz performance
          </span>
        }
        className="rounded-xl shadow-sm border-gray-100 h-full"
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No quizzes assigned yet. Complete lessons in your courses to unlock practice quizzes."
          className="py-6"
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <span className="font-semibold text-gray-800">
          <TrophyOutlined className="mr-2 text-amber-500" />
          Quiz performance
        </span>
      }
      className="rounded-xl shadow-sm border-gray-100 h-full"
    >
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        <div className="relative flex-shrink-0">
          <svg className="w-28 h-28" viewBox="0 0 36 36">
            <path
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2.5"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              fill="none"
              stroke="#efaa1f"
              strokeWidth="2.5"
              strokeDasharray={`${completionPercent}, 100`}
              strokeLinecap="round"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-gray-800">
              {totalCompleted}
            </span>
            <span className="text-xs text-gray-500">
              of {totalAssigned} completed
            </span>
          </div>
        </div>
        <div className="flex-1 w-full space-y-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-[#fffbeb] border border-[#fde68a]">
            <span className="text-sm font-medium text-[#b45309]">Easy</span>
            <span className="text-sm font-semibold text-[#d97706]">
              {easy.completed}/{easy.total}
            </span>
            <span className="text-xs font-medium text-[#efaa1f] bg-[#fef3c7]/60 px-2 py-0.5 rounded">
              {easy.percent}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-sm font-medium text-amber-800">Medium</span>
            <span className="text-sm font-semibold text-amber-700">
              {medium.completed}/{medium.total}
            </span>
            <span className="text-xs font-medium text-amber-600 bg-amber-200/60 px-2 py-0.5 rounded">
              {medium.percent}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-red-50 border border-red-100">
            <span className="text-sm font-medium text-red-800">Hard</span>
            <span className="text-sm font-semibold text-red-700">
              {hard.completed}/{hard.total}
            </span>
            <span className="text-xs font-medium    bg-red-200/60 px-2 py-0.5 rounded">
              {hard.percent}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const LearningEngineDashboardContent: React.FC = () => {
  const {
    data: apiData,
    isLoading,
    refetch,
  } = useGetLearningEngineDashboardQuery();
  const [scoresData, setScoresData] = useState<{
    summary: {
      totalCourses: number;
      completedCourses: number;
      inProgress: number;
      overallScore: number;
      passedAssessments: number;
      failedAssessments: number;
    };
    quizStats: QuizStats | null;
    courses: any[];
  } | null>(null);
  const [scoresLoading, setScoresLoading] = useState(true);

  const fetchScores = React.useCallback(async () => {
    setScoresLoading(true);
    try {
      const res = await lmsService.getMyScoresAnalytics();
      if (res?.data) setScoresData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setScoresLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // Refetch when user returns to tab so heatmap and quiz panel stay in sync with new activity
  useEffect(() => {
    const onFocus = () => {
      fetchScores();
      refetch();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchScores, refetch]);

  const [heatmapView, setHeatmapView] = useState<"last12" | number>("last12");
  const summary = scoresData?.summary ?? {
    totalCourses: 0,
    completedCourses: 0,
    inProgress: 0,
    overallScore: 0,
    passedAssessments: 0,
    failedAssessments: 0,
  };
  const courses = scoresData?.courses ?? [];
  const quizStats = scoresData?.quizStats ?? null;
  const heatmap = (apiData as any)?.heatmap ?? [];

  const myCompletion =
    summary.totalCourses > 0
      ? Math.round((summary.completedCourses / summary.totalCourses) * 100)
      : 0;

  const upcomingDeadlines = useMemo(() => {
    return courses
      .filter(
        (c: any) =>
          c.dueDate &&
          c.status !== "Completed" &&
          c.assessmentStatus !== "Passed",
      )
      .map((c: any) => ({ ...c, daysRemaining: c.daysRemaining ?? 0 }))
      .sort(
        (a: any, b: any) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999),
      )
      .slice(0, 5);
  }, [courses]);

  if (isLoading) {
    return (
      <div className="min-h-[24rem]">
        <LmsLoadingState minHeight="24rem" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Title level={2} className="!mb-1 text-gray-800 text-xl sm:text-2xl">
          Learning Engine
        </Title>
        <Text type="secondary" className="text-sm sm:text-base">
          Track progress and stay consistent
        </Text>
      </div>

      {/* 3 Stat Cards - single column on mobile */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}>
          <Card
            className="rounded-xl border-gray-100 shadow-sm h-full"
            styles={{ body: { padding: 20 } }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Text
                  type="secondary"
                  className="text-xs font-medium uppercase tracking-wider"
                >
                  My completion
                </Text>
                <div className="text-3xl font-bold text-gray-800 mt-1">
                  {scoresLoading ? "—" : `${myCompletion}%`}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircleOutlined className="text-2xl text-emerald-600" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            className="rounded-xl border-gray-100 shadow-sm h-full"
            styles={{ body: { padding: 20 } }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Text
                  type="secondary"
                  className="text-xs font-medium uppercase tracking-wider"
                >
                  Courses completed
                </Text>
                <div className="text-3xl font-bold text-gray-800 mt-1">
                  {scoresLoading
                    ? "—"
                    : `${summary.completedCourses}/${summary.totalCourses || 0}`}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <BookOutlined className="text-2xl text-blue-600" />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            className="rounded-xl border-gray-100 shadow-sm h-full"
            styles={{ body: { padding: 20 } }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Text
                  type="secondary"
                  className="text-xs font-medium uppercase tracking-wider"
                >
                  Avg Assessment Score
                </Text>
                <div className="text-3xl font-bold text-gray-800 mt-1">
                  {scoresLoading ? "—" : `${summary.overallScore ?? 0}%`}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <TrophyOutlined className="text-2xl text-amber-600" />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Heatmap - full width, prominent */}
      <ActivityHeatmap
        heatmap={heatmap}
        selectedView={heatmapView}
        onViewChange={setHeatmapView}
      />

      {/* Row 1: Quiz Performance (40%) | Recent Progress (60%) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={10} lg={9}>
          <QuizPerformanceCard quizStats={quizStats} loading={scoresLoading} />
        </Col>
        <Col xs={24} md={14} lg={15}>
          <Card
            title={
              <span className="font-semibold text-gray-800">
                <RiseOutlined className="mr-2 text-gray-500" />
                Recent progress
              </span>
            }
            className="rounded-xl shadow-sm border-gray-100 h-full"
          >
            {scoresLoading ? (
              <div className="py-4">
                <Skeleton active paragraph={{ rows: 2 }} />
              </div>
            ) : courses.length === 0 ? (
              <Empty
                description="No courses assigned yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <div className="space-y-2">
                {courses
                  .sort(
                    (a: any, b: any) =>
                      new Date(b.completedAt || b.openedAt || 0).getTime() -
                      new Date(a.completedAt || a.openedAt || 0).getTime(),
                  )
                  .slice(0, 6)
                  .map((c: any) => {
                    const isCompleted = c.status === "Completed";
                    const progress = c.progress ?? 0;
                    const statusLabel = isCompleted
                      ? "Completed"
                      : progress > 0
                        ? "In Progress"
                        : "Not Started";
                    return (
                      <div
                        key={c.courseId || c.title}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                      >
                        <span className="font-medium text-gray-800 truncate flex-1 min-w-0">
                          {c.title}
                        </span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Progress
                            percent={progress}
                            size="small"
                            showInfo={false}
                            className="w-20 m-0"
                            status={isCompleted ? "success" : "active"}
                          />
                          <span className="text-xs font-medium text-gray-500 w-16 text-right">
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Upcoming Deadlines */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={
              <span className="font-semibold text-gray-800">
                <ClockCircleOutlined className="mr-2 text-gray-500" />
                Upcoming deadlines
              </span>
            }
            className="rounded-xl shadow-sm border-gray-100"
          >
            {upcomingDeadlines.length === 0 ? (
              <Empty
                description="No upcoming deadlines"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                className="py-4"
              />
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map((c: any) => {
                  const days = c.daysRemaining ?? 0;
                  const urgency =
                    days < 0 ? "overdue" : days <= 7 ? "soon" : "ok";
                  const bg =
                    urgency === "overdue"
                      ? "bg-red-50 border-red-100"
                      : urgency === "soon"
                        ? "bg-amber-50 border-amber-100"
                        : "bg-[#fffbeb] border-[#fde68a]";
                  const text =
                    urgency === "overdue"
                      ? "text-red-700"
                      : urgency === "soon"
                        ? "text-amber-700"
                        : "text-[#d97706]";
                  return (
                    <div
                      key={c.courseId}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg border ${bg}`}
                    >
                      <span className="font-medium text-gray-800 truncate flex-1 min-w-0">
                        {c.title}
                      </span>
                      <span className="text-xs shrink-0 ml-2">
                        {c.dueDate
                          ? dayjs(c.dueDate).format("MMM D, YYYY")
                          : "—"}
                      </span>
                      <span
                        className={`text-xs font-semibold shrink-0 ml-2 w-20 text-right ${text}`}
                      >
                        {days < 0
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                            ? "Due today"
                            : `${days}d left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export const LearningEngineContent = LearningEngineDashboardContent;

const LearningEngineDashboard: React.FC = () => {
  return (
    <MainLayout>
      <div className="lms-page p-6 md:p-8 bg-gray-50 min-h-screen overflow-x-hidden">
        <div className="max-w-6xl mx-auto">
          <LearningEngineDashboardContent />
        </div>
      </div>
    </MainLayout>
  );
};

export default LearningEngineDashboard;
