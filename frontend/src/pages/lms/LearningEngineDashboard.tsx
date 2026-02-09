import React, { useMemo, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
    Card, Row, Col, Typography, Tooltip, Spin, Empty, Progress, Select
} from 'antd';
import {
    CheckCircleOutlined,
    BookOutlined,
    FireOutlined,
    TrophyOutlined,
    CalendarOutlined,
    RiseOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import MainLayout from '@/components/MainLayout';
import { useGetLearningEngineDashboardQuery } from '@/store/api/lmsApi';
import { lmsService } from '@/services/lmsService';

const { Title, Text } = Typography;

const DAYS_LAST_12_MONTHS = 371;
const CELL_GAP = 4;
const CELL_MIN = 14;
const CELL_MAX_FR = '1fr';

const HEAT_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

const getHeatColor = (level: number): string => {
    if (level <= 0) return HEAT_COLORS[0];
    if (level <= 1) return HEAT_COLORS[1];
    if (level <= 2) return HEAT_COLORS[2];
    if (level <= 3) return HEAT_COLORS[3];
    return HEAT_COLORS[4];
};

function getRangeStartAndDays(view: 'last12' | number): { start: dayjs.Dayjs; daysCount: number } {
    if (view === 'last12') {
        return {
            start: dayjs().startOf('day').subtract(DAYS_LAST_12_MONTHS - 1, 'day'),
            daysCount: DAYS_LAST_12_MONTHS
        };
    }
    const year = view;
    const start = dayjs().year(year).startOf('year');
    const end = dayjs().year(year).endOf('year');
    const daysCount = end.diff(start, 'day') + 1;
    return { start, daysCount };
}

function buildActivityMap(
    heatmap: any[],
    rangeStart: dayjs.Dayjs,
    daysCount: number
): Map<string, { level: number; minutes: number; lessons: number; quizzes: number; assessments: number; liveSessions: number }> {
    const map = new Map();
    for (let i = 0; i < daysCount; i++) {
        const d = rangeStart.add(i, 'day');
        const key = d.format('YYYY-MM-DD');
        const point = heatmap?.find((h: any) => h.date === key);
        if (point) {
            const score = point.activityScore ?? point.totalMinutes ?? 0;
            let level = 0;
            if (score > 60) level = 4;
            else if (score > 40) level = 3;
            else if (score > 20) level = 2;
            else if (score > 0) level = 1;
            map.set(key, {
                level,
                minutes: point.totalMinutes ?? 0,
                lessons: point.lessonsCompleted ?? 0,
                quizzes: point.quizzesAttempted ?? 0,
                assessments: point.assessmentsAttempted ?? 0,
                liveSessions: point.liveSessionsAttended ?? 0
            });
        } else {
            map.set(key, { level: 0, minutes: 0, lessons: 0, quizzes: 0, assessments: 0, liveSessions: 0 });
        }
    }
    return map;
}

type ActivityCellData = { level: number; minutes: number; lessons: number; quizzes: number; assessments: number; liveSessions: number };
type ActivityCell = ActivityCellData & { date: string };

function buildWeekColumns(
    activityMap: Map<string, ActivityCellData>,
    rangeStart: dayjs.Dayjs,
    daysCount: number
): ActivityCell[][] {
    const numWeeks = Math.ceil(daysCount / 7);
    const columns: ActivityCell[][] = [];
    const emptyCell: ActivityCell = { date: '', level: -1, minutes: 0, lessons: 0, quizzes: 0, assessments: 0, liveSessions: 0 };
    const noData: ActivityCellData = { level: 0, minutes: 0, lessons: 0, quizzes: 0, assessments: 0, liveSessions: 0 };
    for (let col = 0; col < numWeeks; col++) {
        const weekCells: ActivityCell[] = [];
        for (let row = 0; row < 7; row++) {
            const dayIndex = col * 7 + row;
            if (dayIndex >= daysCount) {
                weekCells.push({ ...emptyCell });
                continue;
            }
            const d = rangeStart.add(dayIndex, 'day');
            const key = d.format('YYYY-MM-DD');
            const data = activityMap.get(key) ?? noData;
            weekCells.push({ ...data, date: key });
        }
        columns.push(weekCells);
    }
    return columns;
}

function getMonthLabelForColumn(colIndex: number, rangeStart: dayjs.Dayjs): string {
    const d = rangeStart.add(colIndex * 7, 'day');
    return d.format('MMM');
}

const HEATMAP_VIEW_OPTIONS: { value: 'last12' | number; label: string }[] = [
    { value: 'last12', label: 'Last 12 months' },
    ...Array.from({ length: 5 }, (_, i) => {
        const y = dayjs().year() - i;
        return { value: y as number, label: String(y) };
    })
];

const ActivityHeatmap: React.FC<{ heatmap: any[]; selectedView: 'last12' | number; onViewChange: (v: 'last12' | number) => void }> = ({ heatmap, selectedView, onViewChange }) => {
    const { start: rangeStart, daysCount } = useMemo(() => getRangeStartAndDays(selectedView), [selectedView]);
    const numWeeks = Math.ceil(daysCount / 7);
    const activityMap = useMemo(() => buildActivityMap(heatmap || [], rangeStart, daysCount), [heatmap, rangeStart, daysCount]);
    const weekColumns = useMemo(() => buildWeekColumns(activityMap, rangeStart, daysCount), [activityMap, rangeStart, daysCount]);
    const todayKey = dayjs().format('YYYY-MM-DD');

    return (
        <Card
            title={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-gray-800 text-base">
                        <CalendarOutlined className="mr-2 text-gray-500" />
                        Learning consistency
                    </span>
                    <Select
                        size="small"
                        value={selectedView}
                        onChange={onViewChange}
                        options={HEATMAP_VIEW_OPTIONS}
                        style={{ width: 140 }}
                        getOptionLabel={(o) => o?.label ?? String(o)}
                    />
                </div>
            }
            className="rounded-xl shadow-sm border-gray-100 overflow-hidden"
        >
            <div className="w-full overflow-x-auto pb-2 -mx-1">
                <div className="min-w-[600px]" style={{ width: '100%', maxWidth: '100%' }}>
                    {/* Month labels - grid aligned with columns */}
                    <div
                        className="grid gap-[3px] mb-2 pl-8"
                        style={{
                            gridTemplateColumns: `24px repeat(${numWeeks}, minmax(${CELL_MIN}px, ${CELL_MAX_FR}))`,
                            gap: CELL_GAP
                        }}
                    >
                        <div />
                        {weekColumns.map((_, colIndex) => {
                            const prevMonth = colIndex > 0 ? getMonthLabelForColumn(colIndex - 1, rangeStart) : null;
                            const currMonth = getMonthLabelForColumn(colIndex, rangeStart);
                            return (
                                <div key={colIndex} className="text-xs text-gray-500 font-medium">
                                    {prevMonth !== currMonth ? currMonth : ''}
                                </div>
                            );
                        })}
                    </div>
                    {/* Grid: 7 rows x (1 label + N columns) */}
                    <div
                        className="grid gap-[3px]"
                        style={{
                            gridTemplateColumns: `24px repeat(${numWeeks}, minmax(${CELL_MIN}px, ${CELL_MAX_FR}))`,
                            gridAutoRows: `minmax(${CELL_MIN}px, auto)`,
                            gap: CELL_GAP
                        }}
                    >
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, rowIndex) => (
                            <React.Fragment key={d}>
                                <div className="text-xs text-gray-400 text-right pr-1 self-center" style={{ lineHeight: `${CELL_MIN}px` }}>{d}</div>
                                {weekColumns.map((column, colIndex) => {
                                    const cell = column[rowIndex];
                                    if (!cell || cell.level === -1) {
                                        return (
                                            <div
                                                key={`${colIndex}-${rowIndex}`}
                                                className="rounded-[3px] bg-transparent"
                                                style={{
                                                    aspectRatio: '1',
                                                    minHeight: CELL_MIN,
                                                    minWidth: CELL_MIN
                                                }}
                                            />
                                        );
                                    }
                                    const color = getHeatColor(cell.level);
                                    const isToday = cell.date === todayKey;
                                    return (
                                        <Tooltip
                                            key={cell.date || `${colIndex}-${rowIndex}`}
                                            title={
                                                <div className="text-xs">
                                                    <div className="font-semibold">{cell.date ? dayjs(cell.date).format('MMM D, YYYY') : 'No data'}</div>
                                                    {cell.date && (
                                                        <>
                                                            {cell.minutes > 0 && <div>{cell.minutes} min learned</div>}
                                                            {cell.lessons > 0 && <div>{cell.lessons} lesson{cell.lessons !== 1 ? 's' : ''} completed</div>}
                                                            {cell.quizzes > 0 && <div>{cell.quizzes} quiz{cell.quizzes !== 1 ? 'zes' : ''} attempted</div>}
                                                            {cell.assessments > 0 && <div>{cell.assessments} assessment{cell.assessments !== 1 ? 's' : ''}</div>}
                                                            {cell.liveSessions > 0 && <div>{cell.liveSessions} live session{cell.liveSessions !== 1 ? 's' : ''} attended</div>}
                                                            {!cell.minutes && !cell.lessons && !cell.quizzes && !cell.assessments && !cell.liveSessions && <div>No activity</div>}
                                                            {isToday && <div className="text-green-300 mt-1">Today</div>}
                                                        </>
                                                    )}
                                                </div>
                                            }
                                        >
                                            <div
                                                className="rounded-[3px] cursor-pointer transition-all hover:ring-2 hover:ring-gray-400 hover:ring-offset-0 w-full"
                                                style={{
                                                    aspectRatio: '1',
                                                    minHeight: CELL_MIN,
                                                    minWidth: CELL_MIN,
                                                    backgroundColor: color,
                                                    border: isToday ? '2px solid #22c55e' : undefined,
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </Tooltip>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end items-center gap-2 mt-3 text-xs text-gray-500">
                <span>Less</span>
                {HEAT_COLORS.map((c, i) => (
                    <div key={i} className="w-3.5 h-3.5 rounded-[3px] shrink-0" style={{ backgroundColor: c }} />
                ))}
                <span>More</span>
            </div>
        </Card>
    );
};

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

const defaultDifficultyStat: DifficultyStat = { total: 0, completed: 0, percent: 0, beatsPercent: 0 };

const QuizPerformanceCard: React.FC<{ quizStats: QuizStats | null; loading: boolean }> = ({ quizStats, loading }) => {
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
                <div className="flex justify-center py-10"><Spin tip="Loading..." /></div>
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
                        <path fill="none" stroke="#e5e7eb" strokeWidth="2.5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path fill="none" stroke="#22c55e" strokeWidth="2.5" strokeDasharray={`${completionPercent}, 100`} strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" className="transition-all duration-500" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-bold text-gray-800">{totalCompleted}</span>
                        <span className="text-xs text-gray-500">of {totalAssigned} completed</span>
                    </div>
                </div>
                <div className="flex-1 w-full space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-green-50 border border-green-100">
                        <span className="text-sm font-medium text-green-800">Easy</span>
                        <span className="text-sm font-semibold text-green-700">{easy.completed}/{easy.total}</span>
                        <span className="text-xs font-medium text-green-600 bg-green-200/60 px-2 py-0.5 rounded">{easy.percent}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-amber-50 border border-amber-100">
                        <span className="text-sm font-medium text-amber-800">Medium</span>
                        <span className="text-sm font-semibold text-amber-700">{medium.completed}/{medium.total}</span>
                        <span className="text-xs font-medium text-amber-600 bg-amber-200/60 px-2 py-0.5 rounded">{medium.percent}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-red-50 border border-red-100">
                        <span className="text-sm font-medium text-red-800">Hard</span>
                        <span className="text-sm font-semibold text-red-700">{hard.completed}/{hard.total}</span>
                        <span className="text-xs font-medium text-red-600 bg-red-200/60 px-2 py-0.5 rounded">{hard.percent}%</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const LearningEngineDashboardContent: React.FC = () => {
    const { data: apiData, isLoading, refetch } = useGetLearningEngineDashboardQuery();
    const [scoresData, setScoresData] = useState<{
        summary: { totalCourses: number; completedCourses: number; inProgress: number; overallScore: number; passedAssessments: number; failedAssessments: number };
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
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchScores, refetch]);

    const [heatmapView, setHeatmapView] = useState<'last12' | number>('last12');
    const summary = scoresData?.summary ?? { totalCourses: 0, completedCourses: 0, inProgress: 0, overallScore: 0, passedAssessments: 0, failedAssessments: 0 };
    const courses = scoresData?.courses ?? [];
    const quizStats = scoresData?.quizStats ?? null;
    const heatmap = (apiData as any)?.heatmap ?? [];

    const myCompletion = summary.totalCourses > 0 ? Math.round((summary.completedCourses / summary.totalCourses) * 100) : 0;

    const upcomingDeadlines = useMemo(() => {
        return courses
            .filter((c: any) => c.dueDate && c.status !== 'Completed')
            .map((c: any) => ({ ...c, daysRemaining: c.daysRemaining ?? 0 }))
            .sort((a: any, b: any) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))
            .slice(0, 5);
    }, [courses]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Spin size="large" tip="Loading Learning Engine..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <Title level={2} className="!mb-1 text-gray-800 text-xl sm:text-2xl">Learning Engine</Title>
                <Text type="secondary" className="text-sm sm:text-base">Track progress and stay consistent</Text>
            </div>

            {/* 3 Stat Cards - single column on mobile */}
            <Row gutter={[12, 12]}>
                <Col xs={24} sm={8}>
                    <Card className="rounded-xl border-gray-100 shadow-sm h-full" bodyStyle={{ padding: 20 }}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <Text type="secondary" className="text-xs font-medium uppercase tracking-wider">My completion</Text>
                                <div className="text-3xl font-bold text-gray-800 mt-1">{scoresLoading ? '—' : `${myCompletion}%`}</div>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                <CheckCircleOutlined className="text-2xl text-emerald-600" />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card className="rounded-xl border-gray-100 shadow-sm h-full" bodyStyle={{ padding: 20 }}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <Text type="secondary" className="text-xs font-medium uppercase tracking-wider">Courses completed</Text>
                                <div className="text-3xl font-bold text-gray-800 mt-1">{scoresLoading ? '—' : `${summary.completedCourses}/${summary.totalCourses || 0}`}</div>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <BookOutlined className="text-2xl text-blue-600" />
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card className="rounded-xl border-gray-100 shadow-sm h-full" bodyStyle={{ padding: 20 }}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <Text type="secondary" className="text-xs font-medium uppercase tracking-wider">Active courses</Text>
                                <div className="text-3xl font-bold text-gray-800 mt-1">{scoresLoading ? '—' : summary.inProgress}</div>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                <FireOutlined className="text-2xl text-amber-600" />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Heatmap - full width, prominent */}
            <ActivityHeatmap heatmap={heatmap} selectedView={heatmapView} onViewChange={setHeatmapView} />

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
                            <div className="flex justify-center py-6"><Spin size="small" /></div>
                        ) : courses.length === 0 ? (
                            <Empty description="No courses assigned yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            <div className="space-y-2">
                                {courses
                                    .sort((a: any, b: any) => new Date(b.completedAt || b.openedAt || 0).getTime() - new Date(a.completedAt || a.openedAt || 0).getTime())
                                    .slice(0, 6)
                                    .map((c: any) => {
                                        const isCompleted = c.status === 'Completed';
                                        const progress = c.progress ?? 0;
                                        const statusLabel = isCompleted ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started';
                                        return (
                                            <div
                                                key={c.courseId || c.title}
                                                className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                                            >
                                                <span className="font-medium text-gray-800 truncate flex-1 min-w-0">{c.title}</span>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <Progress percent={progress} size="small" showInfo={false} className="w-20 m-0" status={isCompleted ? 'success' : 'active'} />
                                                    <span className="text-xs font-medium text-gray-500 w-16 text-right">{statusLabel}</span>
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
                            <Empty description="No upcoming deadlines" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-4" />
                        ) : (
                            <div className="space-y-2">
                                {upcomingDeadlines.map((c: any) => {
                                    const days = c.daysRemaining ?? 0;
                                    const urgency = days < 0 ? 'overdue' : days <= 7 ? 'soon' : 'ok';
                                    const bg = urgency === 'overdue' ? 'bg-red-50 border-red-100' : urgency === 'soon' ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100';
                                    const text = urgency === 'overdue' ? 'text-red-700' : urgency === 'soon' ? 'text-amber-700' : 'text-green-700';
                                    return (
                                        <div key={c.courseId} className={`flex items-center justify-between py-2 px-3 rounded-lg border ${bg}`}>
                                            <span className="font-medium text-gray-800 truncate flex-1 min-w-0">{c.title}</span>
                                            <span className="text-xs shrink-0 ml-2">{c.dueDate ? dayjs(c.dueDate).format('MMM D, YYYY') : '—'}</span>
                                            <span className={`text-xs font-semibold shrink-0 ml-2 w-20 text-right ${text}`}>
                                                {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
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
