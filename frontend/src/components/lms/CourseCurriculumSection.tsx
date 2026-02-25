import React, { useState, useEffect } from 'react';
import { Typography, Progress, Tag, Button, Popover, Row, Col, Card, Collapse, List } from 'antd';
import {
    PlayCircleOutlined,
    CheckCircleOutlined,
    LockOutlined,
    FilePdfOutlined,
    YoutubeOutlined,
    GlobalOutlined,
    FileOutlined,
    DownOutlined,
    TrophyOutlined,
    ClockCircleOutlined,
    InfoCircleOutlined,
    WarningOutlined,
    RightOutlined,
    BookOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export interface Material {
    _id: string;
    id?: string;
    title: string;
    lessonTitle?: string;
    type: 'YOUTUBE' | 'PDF' | 'VIDEO' | 'DRIVE' | 'URL';
    url?: string;
    filePath?: string;
    status?: string;
    /** PDF page count when available */
    pageCount?: number;
    /** Video/audio duration in seconds when available */
    durationSeconds?: number;
}

export interface Lesson {
    id: string;
    title: string;
    materials: Material[];
}

interface CourseCurriculumSectionProps {
    lessons: Lesson[];
    allMaterials: Material[];
    activeLessonKey: string | null;
    setActiveLessonKey: (key: string | null) => void;
    selectedMaterialId: string | null;
    onMaterialClick: (material: Material, globalIndex: number) => void;
    isAdmin?: boolean;
    progressPercentage?: number;
    completedMaterials?: string[];
    isLessonLocked?: (index: number) => boolean;
    isLessonCompleted?: (title: string) => boolean;
    renderExtraLessonActions?: (lesson: Lesson) => React.ReactNode;
    sectionFooter?: React.ReactNode;
    onBack?: () => void;
    courseTitle?: string;
    /** Course category – shown below the course title */
    courseCategory?: string;
    /** When "sidebar", uses compact styling for Udemy/YouTube-style side panel */
    variant?: 'default' | 'sidebar';
    /** Deadline (ISO date) for learner – shown as "X days left" with info card */
    dueDate?: string | null;
    /** When the course was assigned (ISO date) – shown in deadline info card */
    enrolledDate?: string | null;
    /** When true, deadline is hidden (learner passed assessment and has access without validity) */
    assessmentPassed?: boolean;
    /** Rendered between progress/header and the lessons list */
    renderBetweenProgressAndLessons?: React.ReactNode;
    /** Rendered at top-left of the section (above progress, left of course title) – e.g. collapse panel icon */
    renderHeaderLeft?: React.ReactNode;
    /** Rendered at top-right of the green topbar (e.g. collapse panel icon) */
    renderHeaderRight?: React.ReactNode;
}

const getMaterialIcon = (type: string) => {
    const iconStyle = { fontSize: 16 };
    const primaryColor = 'hsl(var(--primary))';
    switch (type) {
        case 'VIDEO': return <PlayCircleOutlined style={{ ...iconStyle, color: primaryColor }} />;
        case 'YOUTUBE': return <YoutubeOutlined style={{ ...iconStyle, color: '#ef4444' }} />;
        case 'PDF': return <FilePdfOutlined style={{ ...iconStyle, color: '#f97316' }} />;
        case 'URL': return <GlobalOutlined style={{ ...iconStyle, color: '#3b82f6' }} />;
        default: return <FileOutlined style={{ ...iconStyle, color: '#6b7280' }} />;
    }
};

const TOTAL_LABEL = (sections: number, items: number) =>
    `${sections} ${sections === 1 ? 'section' : 'sections'} • ${items} ${items === 1 ? 'item' : 'items'}`;

const DeadlineCard: React.FC<{
    bannerVariant: 'success' | 'warning' | 'overdue' | null;
    bannerLabel: string | null;
    assignedDateStr: string | null;
    dueByStr: string | null;
    timeRemainingLabel: string | null;
    chipVariant: 'success' | 'warning' | 'overdue';
}> = ({ bannerVariant, bannerLabel, assignedDateStr, dueByStr, timeRemainingLabel, chipVariant }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className={`lms-playlist-native-deadline-card lms-playlist-native-deadline-banner-${bannerVariant ?? 'success'}`}>
            <button type="button" className="lms-playlist-native-deadline-banner" onClick={() => setExpanded((e) => !e)}>
                {bannerLabel ?? 'Deadline'}
                <DownOutlined className={`lms-playlist-native-deadline-chevron ${expanded ? 'is-expanded' : ''}`} />
            </button>
            <div className="lms-playlist-native-deadline-content" data-expanded={expanded}>
                <div className="lms-playlist-native-deadline-rows">
                    {assignedDateStr && <div className="lms-playlist-native-deadline-row"><span>Assigned on:</span> {assignedDateStr}</div>}
                    {dueByStr && <div className="lms-playlist-native-deadline-row"><span>Due by:</span> {dueByStr}</div>}
                    <div className="lms-playlist-native-deadline-row">
                        <span>Time remaining:</span>
                        <span className={`lms-playlist-native-deadline-chip lms-playlist-native-deadline-chip-${chipVariant}`}>
                            {timeRemainingLabel ?? '—'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CourseCurriculumSection: React.FC<CourseCurriculumSectionProps> = ({
    lessons,
    allMaterials,
    activeLessonKey,
    setActiveLessonKey,
    selectedMaterialId,
    onMaterialClick,
    isAdmin = false,
    progressPercentage = 0,
    completedMaterials = [],
    isLessonLocked = () => false,
    isLessonCompleted = () => false,
    renderExtraLessonActions,
    sectionFooter,
    onBack,
    courseTitle,
    courseCategory,
    variant = 'default',
    dueDate,
    enrolledDate,
    assessmentPassed = false,
    renderBetweenProgressAndLessons,
    renderHeaderLeft,
    renderHeaderRight,
}) => {
    const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        lessons.forEach((l, i) => {
            initial[l.title] = i === 0 || l.title === activeLessonKey;
        });
        return initial;
    });

    useEffect(() => {
        if (activeLessonKey) {
            setExpandedLessons(prev => ({ ...prev, [activeLessonKey]: true }));
        }
    }, [activeLessonKey]);

    const toggleLesson = (lessonTitle: string) => {
        setExpandedLessons(prev => ({ ...prev, [lessonTitle]: !prev[lessonTitle] }));
        setActiveLessonKey(expandedLessons[lessonTitle] ? null : lessonTitle);
    };

    const openLesson = (lessonTitle: string) => {
        setExpandedLessons(prev => ({ ...prev, [lessonTitle]: true }));
        setActiveLessonKey(lessonTitle);
    };

    const isSidebar = variant === 'sidebar';

    // Live countdown tick for deadline (updates every minute)
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!isSidebar || !dueDate) return;
        const id = setInterval(() => setTick((t) => t + 1), 60000);
        return () => clearInterval(id);
    }, [isSidebar, dueDate]);

    const [progressAnimated, setProgressAnimated] = useState(0);
    useEffect(() => {
        if (!isSidebar) return;
        const id = requestAnimationFrame(() => setProgressAnimated(progressPercentage));
        return () => cancelAnimationFrame(id);
    }, [isSidebar, progressPercentage]);

    if (isSidebar) {
        const totalItems = allMaterials.length;
        const completedCount = completedMaterials?.length ?? 0;
        const estimatedMin = Math.max(5, totalItems * 5);
        const sectionCount = lessons.length;
        const dueDateObj = dueDate ? new Date(dueDate) : null;
        const now = new Date();
        const daysRemaining = dueDateObj && !Number.isNaN(dueDateObj.getTime())
            ? Math.ceil((dueDateObj.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            : null;
        const timeRemainingLabel = daysRemaining === null
            ? null
            : daysRemaining < 0
                ? 'Overdue'
                : daysRemaining === 0
                    ? 'Due today'
                    : daysRemaining === 1
                        ? '1 day left'
                        : daysRemaining <= 7
                            ? `${daysRemaining} days left`
                            : Math.floor(daysRemaining / 7) === 1
                                ? '1 week left'
                                : `${Math.floor(daysRemaining / 7)} weeks left`;
        const deadlineBannerVariant = daysRemaining === null ? null : daysRemaining < 0 ? 'overdue' : daysRemaining <= 7 ? 'warning' : 'success';
        const assignedDateStr = enrolledDate
            ? new Date(enrolledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : null;
        const dueByStr = dueDateObj && !Number.isNaN(dueDateObj.getTime())
            ? dueDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : null;
        const toDDMMYYYY = (date: Date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}/${date.getFullYear()}`;
        };
        const assignedDDMMYYYY = enrolledDate ? toDDMMYYYY(new Date(enrolledDate)) : null;
        const deadlineDDMMYYYY = dueDateObj && !Number.isNaN(dueDateObj.getTime()) ? toDDMMYYYY(dueDateObj) : null;

        return (
            <div className="lms-playlist-native">
                <div className="lms-playlist-native-inner">
                    <div className="lms-playlist-native-course-content-title">Course content</div>
                    <div className="lms-playlist-native-top">
                        <header className="lms-playlist-native-header">
                            <div className="lms-playlist-native-header-main">
                                <div className="lms-playlist-native-title-row">
                                    <h2 className="lms-playlist-native-title">{courseTitle ?? 'Course'}</h2>
                                    <span className="lms-playlist-native-title-sep" aria-hidden>|</span>
                                    <span className="lms-playlist-native-lesson-count">
                                        <BookOutlined />
                                        {sectionCount} {sectionCount === 1 ? 'Section' : 'Sections'}
                                    </span>
                                </div>
                                {courseCategory && (
                                    <div className="lms-playlist-native-course-category text-xs text-gray-500 mt-0.5">
                                        {courseCategory}
                                    </div>
                                )}
                            </div>
                            {!isAdmin && dueDate && !assessmentPassed && timeRemainingLabel && (
                                <div className="lms-playlist-native-deadline-card">
                                    <span className="lms-playlist-native-deadline-label">{timeRemainingLabel}</span>
                                    <Popover
                                        trigger="click"
                                        placement="bottomRight"
                                        content={
                                            <div className="lms-playlist-native-deadline-popover">
                                                {assignedDDMMYYYY && <div><strong>Assigned on:</strong> {assignedDDMMYYYY}</div>}
                                                {deadlineDDMMYYYY && <div><strong>Deadline:</strong> {deadlineDDMMYYYY}</div>}
                                            </div>
                                        }
                                    >
                                        <button type="button" className="lms-playlist-native-deadline-info-btn" aria-label="Deadline details">
                                            <InfoCircleOutlined />
                                        </button>
                                    </Popover>
                                </div>
                            )}
                        </header>

                        {renderHeaderLeft != null && (
                            <div className="lms-playlist-native-collapse-row">
                                {renderHeaderLeft}
                            </div>
                        )}

                        {!isAdmin && (
                            <div className="lms-playlist-native-progress">
                                <div className="lms-playlist-native-progress-label">
                                    <span>{completedCount} of {totalItems} items completed</span>
                                    <span className="lms-playlist-native-progress-pct">{progressPercentage}%</span>
                                </div>
                                <div className="lms-playlist-native-progress-track">
                                    <div
                                        className="lms-playlist-native-progress-fill"
                                        style={{ width: `${progressAnimated}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lms-playlist-native-sections">
                        <Collapse
                            activeKey={lessons
                                .filter((l, i) => !(!isAdmin && isLessonLocked(i)) && (expandedLessons[l.title] ?? l.title === activeLessonKey))
                                .map(l => l.title)}
                            onChange={(keys) => {
                                const keySet = new Set(Array.isArray(keys) ? keys : keys ? [keys] : []);
                                setExpandedLessons(prev => {
                                    const next = { ...prev };
                                    lessons.forEach((l, i) => {
                                        const locked = !isAdmin && isLessonLocked(i);
                                        next[l.title] = locked ? false : keySet.has(l.title);
                                    });
                                    return next;
                                });
                            }}
                            ghost
                            className="lms-curriculum-collapse"
                        >
                            {lessons.map((lesson, index) => {
                                const locked = !isAdmin && isLessonLocked(index);
                                const completed = !isAdmin && isLessonCompleted(lesson.title);
                                return (
                                    <Collapse.Panel
                                        key={lesson.title}
                                        header={
                                            <div className="lms-panel-header">
                                                <span className="lms-panel-title">{index + 1}. {lesson.title}</span>
                                                <span className="lms-panel-meta">
                                                    {completed ? 'Complete' : `${lesson.materials.length} ${lesson.materials.length === 1 ? 'item' : 'items'}`}
                                                </span>
                                            </div>
                                        }
                                        showArrow={!locked}
                                    >
                                        <List
                                            size="small"
                                            dataSource={lesson.materials}
                                            renderItem={(material) => {
                                                const isViewed = completedMaterials.includes(material._id || material.id || '');
                                                const isActive = selectedMaterialId === (material._id || material.id);
                                                const materialIdx = allMaterials.findIndex(m => (m._id || m.id) === (material._id || material.id));
                                                return (
                                                    <List.Item
                                                        className={`lms-material-list-item ${isActive ? 'is-active' : ''}`}
                                                        onClick={() => {
                                                            if (!locked) {
                                                                onMaterialClick(material, materialIdx);
                                                                openLesson(lesson.title);
                                                            }
                                                        }}
                                                        style={{ cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.7 : 1 }}
                                                    >
                                                        <span className="lms-playlist-native-lesson-icon">{getMaterialIcon(material.type)}</span>
                                                        <span className="lms-playlist-native-lesson-title" title={material.title}>{material.title}</span>
                                                        <span className="lms-playlist-native-lesson-status">
                                                            {locked ? <LockOutlined /> : isViewed ? <CheckCircleOutlined /> : <RightOutlined />}
                                                        </span>
                                                    </List.Item>
                                                );
                                            }}
                                        />
                                        {renderExtraLessonActions && !locked && (
                                            <div className="lms-playlist-native-lesson-actions">{renderExtraLessonActions(lesson)}</div>
                                        )}
                                    </Collapse.Panel>
                                );
                            })}
                        </Collapse>
                    </div>

                    {sectionFooter && <div className="lms-playlist-native-footer">{sectionFooter}</div>}
                </div>

                <style>{`
                    .lms-playlist-native {
                        margin: 0; padding: 0; width: 100%; height: 100%; min-height: 0;
                        display: flex; flex-direction: column;
                        background: hsl(var(--card));
                        color: hsl(var(--card-foreground));
                        font-family: var(--lms-font-sans);
                    }
                    .lms-playlist-native-inner {
                        flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; overflow: hidden;
                        padding: 0 14px 12px 14px;
                    }
                    .lms-playlist-native-course-content-title {
                        margin: 0 -26px 0 -26px; padding: 8px 26px; font-size: var(--lms-text-sm); font-weight: 600;
                        background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
                        font-family: var(--lms-font-sans);
                        text-align: center;
                        display: block;
                    }
                    .lms-playlist-native-top {
                        flex-shrink: 0;
                        position: sticky; top: 0; z-index: 10;
                        padding-bottom: 12px; margin-bottom: 10px;
                        border-bottom: 1px solid hsl(var(--border));
                        background: hsl(var(--card));
                    }
                    .lms-playlist-native-header {
                        display: flex; align-items: flex-start; gap: 10px;
                        margin-bottom: 0; margin-top: 10px;
                    }
                    .lms-playlist-native-header-main { flex: 1; min-width: 0; }
                    .lms-playlist-native-title-row {
                        display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
                    }
                    .lms-playlist-native-title {
                        margin: 0; font-size: var(--lms-text-lg); font-weight: 700;
                        color: hsl(var(--foreground)); line-height: 1.3;
                    }
                    .lms-playlist-native-title-sep { color: hsl(var(--border)); user-select: none; flex-shrink: 0; }
                    .lms-playlist-native-lesson-count {
                        display: inline-flex; align-items: center; gap: 4px;
                        font-size: var(--lms-text-xs); font-weight: 500;
                        color: hsl(var(--muted-foreground));
                    }
                    .lms-playlist-native-lesson-count .anticon { font-size: 12px; }
                    .lms-playlist-native-deadline-card {
                        display: flex; align-items: center; gap: 6px; flex-shrink: 0;
                        padding: 6px 10px; border-radius: var(--radius);
                        border: none !important; outline: none !important; box-shadow: none !important;
                        background: hsl(var(--muted) / 0.5);
                        font-size: var(--lms-text-xs); font-weight: 500; color: #000;
                    }
                    .lms-playlist-native-deadline-label { white-space: nowrap; }
                    .lms-playlist-native-deadline-info-btn {
                        display: flex; align-items: center; justify-content: center;
                        padding: 0; border: none !important; outline: none !important; box-shadow: none !important;
                        background: transparent; color: #000; cursor: pointer;
                        font-size: 14px; line-height: 1;
                    }
                    .lms-playlist-native-deadline-info-btn:hover { color: hsl(var(--primary)); }
                    .lms-playlist-native-deadline-info-btn:focus { border: none !important; outline: none !important; box-shadow: none !important; }
                    .lms-playlist-native-deadline-card * { outline: none !important; box-shadow: none !important; }
                    .lms-playlist-native-deadline-card .ant-popover-trigger { border: none !important; outline: none !important; }
                    .lms-playlist-native-deadline-popover {
                        font-size: var(--lms-text-xs); color: hsl(var(--foreground));
                        padding: 4px 0;
                    }
                    .lms-playlist-native-deadline-popover div { margin-bottom: 4px; }
                    .lms-playlist-native-deadline-popover div:last-child { margin-bottom: 0; }
                    .lms-playlist-native-deadline-popover strong { margin-right: 6px; }
                    .lms-playlist-native-header-action { flex-shrink: 0; }
                    .lms-playlist-native-collapse-row {
                        display: flex; align-items: center; justify-content: flex-start;
                        margin-top: 8px; margin-bottom: 0;
                    }
                    .lms-playlist-native-progress {
                        margin-top: 12px; margin-bottom: 0;
                    }
                    .lms-playlist-native-progress-label {
                        display: flex; align-items: center; justify-content: space-between;
                        margin-bottom: 6px; font-size: var(--lms-text-xs);
                        color: hsl(var(--muted-foreground));
                    }
                    .lms-playlist-native-progress-pct { font-weight: 600; color: hsl(var(--foreground)); }
                    .lms-playlist-native-progress-track {
                        height: 6px; border-radius: 999px; overflow: hidden;
                        background: hsl(var(--muted));
                    }
                    .lms-playlist-native-progress-fill {
                        height: 100%; border-radius: 999px; background: hsl(var(--primary));
                        transition: width 0.5s ease-out;
                    }
                    .lms-playlist-native-deadline-card {
                        border: 1px solid hsl(var(--border)); border-radius: var(--radius);
                        overflow: hidden; margin-bottom: 12px;
                        background: hsl(var(--card));
                    }
                    .lms-playlist-native-deadline-banner {
                        width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
                        padding: 6px 10px; font-size: var(--lms-text-xs); font-weight: 600;
                        border: none; background: transparent; cursor: pointer;
                        font-family: var(--lms-font-sans);
                    }
                    .lms-playlist-native-deadline-chevron { font-size: 10px; transition: transform 0.2s; }
                    .lms-playlist-native-deadline-chevron.is-expanded { transform: rotate(180deg); }
                    .lms-playlist-native-deadline-content {
                        display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.2s ease;
                    }
                    .lms-playlist-native-deadline-content[data-expanded="true"] { grid-template-rows: 1fr; }
                    .lms-playlist-native-deadline-content > * { overflow: hidden; }
                    .lms-playlist-native-deadline-banner-success { background: hsl(var(--success) / 0.15); color: hsl(var(--success)); }
                    .lms-playlist-native-deadline-banner-warning { background: hsl(var(--warning) / 0.15); color: hsl(var(--warning)); }
                    .lms-playlist-native-deadline-banner-overdue { background: hsl(var(--destructive) / 0.15); color: hsl(var(--destructive)); }
                    .lms-playlist-native-deadline-rows { padding: 10px 12px; font-size: var(--lms-text-xs); color: hsl(var(--muted-foreground)); }
                    .lms-playlist-native-deadline-row { margin-bottom: 4px; }
                    .lms-playlist-native-deadline-row:last-child { margin-bottom: 0; }
                    .lms-playlist-native-deadline-row span:first-child { margin-right: 6px; color: hsl(var(--foreground)); }
                    .lms-playlist-native-deadline-chip {
                        display: inline-block; padding: 2px 8px; border-radius: 999px;
                        font-weight: 600; margin-left: 4px;
                    }
                    .lms-playlist-native-deadline-chip-success { background: hsl(var(--success) / 0.15); color: hsl(var(--success)); }
                    .lms-playlist-native-deadline-chip-warning { background: hsl(var(--warning) / 0.15); color: hsl(var(--warning)); }
                    .lms-playlist-native-deadline-chip-overdue { background: hsl(var(--destructive) / 0.15); color: hsl(var(--destructive)); }
                    .lms-playlist-native-sections {
                        flex: 1;
                        min-height: 0;
                        display: flex;
                        flex-direction: column;
                        overflow-y: auto;
                        overflow-x: hidden;
                        -webkit-overflow-scrolling: touch;
                        padding-bottom: 8px;
                    }
                    .lms-curriculum-collapse.ant-collapse { background: transparent; border: none; }
                    .lms-curriculum-collapse .ant-collapse-item { border: 1px solid #d1d5db; border-radius: var(--radius); margin-bottom: 6px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
                    .lms-curriculum-collapse .ant-collapse-header { align-items: center !important; padding: 10px 12px !important; }
                    .lms-panel-header { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; }
                    .lms-panel-title { flex: 1; min-width: 0; font-size: var(--lms-text-sm); font-weight: 500; }
                    .lms-panel-meta { font-size: var(--lms-text-xs); color: hsl(var(--muted-foreground)); }
                    .lms-curriculum-collapse .ant-collapse-content-box { padding: 0 12px 12px !important; }
                    .lms-material-list-item.ant-list-item { padding: 8px 12px 8px 38px !important; border: none; border-left: 3px solid transparent; display: flex; align-items: center; gap: 8px; }
                    .lms-material-list-item.is-active { background: hsl(var(--primary) / 0.08); border-left-color: hsl(var(--primary)); }
                    .lms-playlist-native-section {
                        border: 1px solid hsl(var(--border)); border-radius: var(--radius);
                        overflow: hidden; background: hsl(var(--card));
                    }
                    .lms-playlist-native-section-trigger {
                        width: 100%; display: flex; align-items: center; gap: 8px;
                        padding: 10px 12px; border: none; background: transparent;
                        color: hsl(var(--foreground)); font-size: var(--lms-text-sm); font-weight: 500;
                        text-align: left; cursor: pointer;
                        font-family: var(--lms-font-sans);
                    }
                    .lms-playlist-native-section-trigger:hover:not(:disabled) { background: hsl(var(--muted)); }
                    .lms-playlist-native-section-num {
                        width: 22px; height: 22px; min-width: 22px; border-radius: 6px;
                        background: hsl(var(--primary) / 0.12); color: hsl(var(--primary));
                        display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;
                    }
                    .lms-playlist-native-section-title { flex: 1; min-width: 0; }
                    .lms-playlist-native-section-meta { font-size: var(--lms-text-xs); color: hsl(var(--muted-foreground)); }
                    .lms-playlist-native-section-chevron { font-size: 12px; color: hsl(var(--muted-foreground)); transition: transform 0.2s; }
                    .lms-playlist-native-section.is-expanded .lms-playlist-native-section-chevron { transform: rotate(180deg); }
                    .lms-playlist-native-section-content {
                        display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.2s ease;
                    }
                    .lms-playlist-native-section-content[data-expanded="true"] { grid-template-rows: 1fr; }
                    .lms-playlist-native-section-inner { overflow: hidden; }
                    .lms-playlist-native-lesson-item {
                        display: flex; align-items: center; gap: 8px;
                        padding: 8px 12px 8px 38px; border: none; border-left: 3px solid transparent;
                        background: transparent; color: hsl(var(--muted-foreground));
                        font-size: var(--lms-text-xs); text-align: left; cursor: pointer;
                        font-family: var(--lms-font-sans);
                        transition: background 0.15s, border-color 0.15s, color 0.15s;
                    }
                    .lms-playlist-native-lesson-item:hover:not(:disabled) {
                        background: hsl(var(--muted)); color: hsl(var(--foreground));
                        border-left-color: hsl(var(--primary) / 0.5);
                    }
                    .lms-playlist-native-lesson-item.is-active {
                        background: hsl(var(--primary) / 0.08); color: hsl(var(--primary));
                        border-left-color: hsl(var(--primary));
                    }
                    .lms-playlist-native-lesson-item[data-status="complete"] .lms-playlist-native-lesson-status { color: hsl(var(--success)); }
                    .lms-playlist-native-lesson-item[data-status="locked"] { opacity: 0.7; cursor: not-allowed; }
                    .lms-playlist-native-lesson-icon { flex-shrink: 0; font-size: 14px; }
                    .lms-playlist-native-lesson-icon .anticon { color: hsl(var(--muted-foreground)); }
                    .lms-playlist-native-lesson-item.is-active .lms-playlist-native-lesson-icon .anticon { color: hsl(var(--primary)); }
                    .lms-playlist-native-lesson-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .lms-playlist-native-lesson-status { flex-shrink: 0; font-size: 12px; color: hsl(var(--primary)); }
                    .lms-playlist-native-lesson-actions { padding: 6px 12px 10px 38px; min-width: 0; }
                    .lms-playlist-native-lesson-actions .flex { min-width: 0; }
                    .lms-playlist-native-footer {
                        margin-top: 1.25rem;
                        padding-top: 1.25rem;
                        padding-bottom: 0.5rem;
                        border-top: 1px solid hsl(var(--border));
                        flex-shrink: 0;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <section
            className={`course-curriculum-section ${isSidebar ? 'course-curriculum-section-sidebar' : ''}`}
        >
            <div className="curriculum-section-header">
                <div className="curriculum-topbar">
                    <h2 className="curriculum-topbar-title">Course content</h2>
                    {renderHeaderRight != null && (
                        <div className="curriculum-topbar-right">{renderHeaderRight}</div>
                    )}
                </div>
                <div className="curriculum-section-header-inner">
                    <Row gutter={isSidebar ? [0, 8] : [16, 12]} className="curriculum-top-info-row">
                        <Col flex="1 1 auto" className="curriculum-top-info-left">
                            {courseTitle && <div className="curriculum-course-name">{courseTitle}</div>}
                            {courseCategory && (
                                <div className="curriculum-course-category text-xs text-gray-500 mt-0.5">{courseCategory}</div>
                            )}
                            {!isAdmin && enrolledDate && (
                                <div className="curriculum-assigned-date">
                                    Assigned: {new Date(enrolledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            )}
                            <div className="curriculum-section-meta curriculum-section-meta-inline">
                                {TOTAL_LABEL(lessons.length, allMaterials.length)}
                            </div>
                        </Col>
                        {!isAdmin && dueDate && !assessmentPassed && (() => {
                            const due = new Date(dueDate);
                            if (Number.isNaN(due.getTime())) return null;
                            const now = new Date();
                            if (due <= now) return null;
                            const totalDays = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                            const weeks = Math.floor(totalDays / 7);
                            const days = totalDays % 7;
                            const parts: string[] = [];
                            if (weeks > 0) parts.push(`${weeks} ${weeks === 1 ? 'week' : 'weeks'}`);
                            if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
                            const timeLeftText = parts.length > 0 ? `${parts.join(' ')} left` : 'Due today';
                            const deadlineDateStr = due.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
                            const assignedDateStr = enrolledDate
                                ? new Date(enrolledDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                                : null;
                            const infoContent = (
                                <div className="curriculum-deadline-info-card">
                                    {assignedDateStr && <div><strong>Course assigned:</strong> {assignedDateStr}</div>}
                                    <div><strong>Deadline:</strong> {deadlineDateStr}</div>
                                </div>
                            );
                            return (
                                <Col className="curriculum-top-info-right">
                                    <div className="curriculum-deadline-badge">
                                        <Popover content={infoContent} trigger="click" placement="bottomRight">
                                            <span className="curriculum-deadline-info-trigger" role="button" tabIndex={0} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).click()}>
                                                <InfoCircleOutlined className="curriculum-deadline-info-icon" />
                                            </span>
                                        </Popover>
                                        <span className="curriculum-deadline-text-only">
                                            <ClockCircleOutlined className="curriculum-deadline-icon" />
                                            {timeLeftText}
                                        </span>
                                    </div>
                                </Col>
                            );
                        })()}
                    </Row>
                    {!isAdmin && (
                        <div className="curriculum-progress-block">
                            <div className="curriculum-progress-label">
                                <span className="curriculum-progress-label-text">Your progress</span>
                                <span className="curriculum-progress-percent">{progressPercentage}%</span>
                            </div>
                            <Progress
                                percent={progressPercentage}
                                showInfo={false}
                                strokeColor="hsl(var(--primary))"
                                trailColor="#e5e7eb"
                                strokeWidth={8}
                                className="curriculum-progress-bar"
                            />
                        </div>
                    )}
                </div>
            </div>

            {renderBetweenProgressAndLessons && (
                <div className="curriculum-between-progress-lessons mb-3">
                    {renderBetweenProgressAndLessons}
                </div>
            )}

            {isSidebar && lessons.length > 0 ? (
                <div className="curriculum-lessons-section">
                    <div className="curriculum-lessons-label">
                        <span className="curriculum-lessons-label-text">Lessons</span>
                    </div>
                    <div className="curriculum-lessons">
                        {lessons.map((lesson, index) => {
                            const locked = !isAdmin && isLessonLocked(index);
                            const completed = !isAdmin && isLessonCompleted(lesson.title);
                            const isExpanded = expandedLessons[lesson.title] ?? lesson.title === activeLessonKey;
                            return (
                                <Card
                                    key={lesson.title}
                                    size="small"
                                    className={`curriculum-lesson-card ${isExpanded ? 'curriculum-lesson-card-expanded' : ''} ${locked ? 'curriculum-lesson-card-locked' : ''}`}
                                    title={
                                        <div
                                            className="curriculum-lesson-trigger"
                                            style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
                                            onClick={() => !locked && toggleLesson(lesson.title)}
                                            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !locked) toggleLesson(lesson.title); }}
                                            role="button"
                                            tabIndex={locked ? -1 : 0}
                                            aria-expanded={isExpanded}
                                        >
                                            <div className="curriculum-lesson-trigger-left">
                                                {completed && <CheckCircleOutlined className="curriculum-lesson-done-icon" style={{ fontSize: 16, marginRight: 6 }} />}
                                                <div className="curriculum-lesson-trigger-info">
                                                    <span className="curriculum-lesson-trigger-title">{index + 1}. {lesson.title}</span>
                                                    <span className="curriculum-lesson-trigger-meta">
                                                        {lesson.materials.length} {lesson.materials.length === 1 ? 'item' : 'items'}
                                                        {completed && !isAdmin && <span className="curriculum-lesson-done-badge">Completed</span>}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="curriculum-lesson-trigger-right">
                                                {locked && <LockOutlined className="curriculum-lesson-lock" />}
                                                <DownOutlined className={`curriculum-lesson-chevron ${isExpanded ? 'curriculum-lesson-chevron-open' : ''}`} style={{ fontSize: 12 }} />
                                            </div>
                                        </div>
                                    }
                                    extra={null}
                                    bodyStyle={!isExpanded ? { display: 'none' } : undefined}
                                >
                                    <List
                                        size="small"
                                        dataSource={lesson.materials}
                                        renderItem={(material) => {
                                            const isViewed = completedMaterials.includes(material._id || material.id || '');
                                            const isActive = selectedMaterialId === (material._id || material.id);
                                            const materialIdx = allMaterials.findIndex(m => (m._id || m.id) === (material._id || material.id));
                                            return (
                                                <List.Item
                                                    className={`curriculum-material-item ${isActive ? 'curriculum-material-item-active' : ''} ${locked ? 'opacity-50' : ''}`}
                                                    onClick={() => {
                                                        if (!locked) {
                                                            onMaterialClick(material, materialIdx);
                                                            openLesson(lesson.title);
                                                        }
                                                    }}
                                                    style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
                                                >
                                                    <span className="curriculum-material-icon">
                                                        {isViewed ? <CheckCircleOutlined className="text-primary" /> : getMaterialIcon(material.type)}
                                                    </span>
                                                    <span className="curriculum-material-title">{material.title}</span>
                                                    <Tag className="curriculum-material-type-tag">{material.type}</Tag>
                                                </List.Item>
                                            );
                                        }}
                                    />
                                    {renderExtraLessonActions && !locked && (
                                        <div className="curriculum-extra-actions">{renderExtraLessonActions(lesson)}</div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <>
                    {lessons.length > 0 && (
                        <div className="curriculum-lessons-label">
                            <span className="curriculum-lessons-label-text">Lessons</span>
                        </div>
                    )}
                    <div className="curriculum-lessons">
                        {lessons.map((lesson, index) => {
                            const locked = !isAdmin && isLessonLocked(index);
                            const completed = !isAdmin && isLessonCompleted(lesson.title);
                            const isExpanded = expandedLessons[lesson.title] ?? lesson.title === activeLessonKey;
                            return (
                                <Card
                                    key={lesson.title}
                                    size="small"
                                    className={`curriculum-lesson-card ${isExpanded ? 'curriculum-lesson-card-expanded' : ''} ${locked ? 'curriculum-lesson-card-locked' : ''}`}
                                    title={
                                        <div
                                            className="curriculum-lesson-trigger"
                                            style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
                                            onClick={() => !locked && toggleLesson(lesson.title)}
                                            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !locked) toggleLesson(lesson.title); }}
                                            role="button"
                                            tabIndex={locked ? -1 : 0}
                                            aria-expanded={isExpanded}
                                        >
                                            <div className="curriculum-lesson-trigger-left">
                                                {completed && <CheckCircleOutlined className="curriculum-lesson-done-icon" style={{ fontSize: 16, marginRight: 6 }} />}
                                                <div className="curriculum-lesson-trigger-info">
                                                    <span className="curriculum-lesson-trigger-title">{index + 1}. {lesson.title}</span>
                                                    <span className="curriculum-lesson-trigger-meta">
                                                        {lesson.materials.length} {lesson.materials.length === 1 ? 'item' : 'items'}
                                                        {completed && !isAdmin && <span className="curriculum-lesson-done-badge">Completed</span>}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="curriculum-lesson-trigger-right">
                                                {locked && <LockOutlined className="curriculum-lesson-lock" />}
                                                <DownOutlined className={`curriculum-lesson-chevron ${isExpanded ? 'curriculum-lesson-chevron-open' : ''}`} style={{ fontSize: 12 }} />
                                            </div>
                                        </div>
                                    }
                                    extra={null}
                                    bodyStyle={!isExpanded ? { display: 'none' } : undefined}
                                >
                                    <List
                                        size="small"
                                        dataSource={lesson.materials}
                                        renderItem={(material) => {
                                            const isViewed = completedMaterials.includes(material._id || material.id || '');
                                            const isActive = selectedMaterialId === (material._id || material.id);
                                            const materialIdx = allMaterials.findIndex(m => (m._id || m.id) === (material._id || material.id));
                                            return (
                                                <List.Item
                                                    className={`curriculum-material-item ${isActive ? 'curriculum-material-item-active' : ''} ${locked ? 'opacity-50' : ''}`}
                                                    onClick={() => {
                                                        if (!locked) {
                                                            onMaterialClick(material, materialIdx);
                                                            openLesson(lesson.title);
                                                        }
                                                    }}
                                                    style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
                                                >
                                                    <span className="curriculum-material-icon">
                                                        {isViewed ? <CheckCircleOutlined className="text-primary" /> : getMaterialIcon(material.type)}
                                                    </span>
                                                    <span className="curriculum-material-title">{material.title}</span>
                                                    <Tag className="curriculum-material-type-tag">{material.type}</Tag>
                                                </List.Item>
                                            );
                                        }}
                                    />
                                    {renderExtraLessonActions && !locked && (
                                        <div className="curriculum-extra-actions">{renderExtraLessonActions(lesson)}</div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            {sectionFooter && (
                <div className="curriculum-section-footer">
                    {sectionFooter}
                </div>
            )}

            <style>{`
                .course-curriculum-section {
                    width: 100%;
                    max-width: 900px;
                    margin: 0 auto;
                }
                .course-curriculum-section-sidebar {
                    max-width: none;
                    margin: 0;
                    padding: 12px;
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid hsl(var(--primary));
                    border-top: none;
                    border-radius: 12px 12px 0 0;
                    background: #fff;
                    box-sizing: border-box;
                }
                .course-curriculum-section-sidebar .curriculum-lessons,
                .course-curriculum-section-sidebar .curriculum-lessons-section .curriculum-lessons {
                    flex: 1;
                    min-height: 0;
                    overflow-y: auto;
                }
                .curriculum-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    gap: 12px;
                    padding: 12px 16px;
                    background: hsl(var(--primary));
                    border-radius: 10px 10px 0 0;
                }
                .course-curriculum-section-sidebar .curriculum-topbar {
                    border-radius: 10px;
                    padding: 10px 44px;
                    width: 100%;
                    min-height: 44px;
                    box-sizing: border-box;
                }
                .course-curriculum-section-sidebar .curriculum-topbar-title {
                    width: 100%;
                    text-align: center;
                    padding: 0;
                    box-sizing: border-box;
                    min-height: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .curriculum-topbar-right {
                    position: absolute;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                }
                .curriculum-topbar-right .ant-btn {
                    color: hsl(var(--primary-foreground));
                }
                .curriculum-topbar-right .ant-btn:hover {
                    color: hsl(var(--primary-foreground));
                    background: rgba(255,255,255,0.15);
                }
                .curriculum-topbar-left {
                    position: absolute;
                    left: 16px;
                    flex-shrink: 0;
                }
                .curriculum-topbar-title {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 700;
                    color: hsl(var(--primary-foreground));
                    letter-spacing: -0.01em;
                }
                .curriculum-topbar .curriculum-header-left-inner {
                    background: rgba(255,255,255,0.2);
                    border-color: rgba(255,255,255,0.3);
                }
                .curriculum-topbar .curriculum-header-left-inner .ant-btn {
                    color: hsl(var(--primary-foreground));
                }
                .curriculum-topbar .curriculum-header-left-inner .ant-btn:hover {
                    color: hsl(var(--primary-foreground));
                    background: rgba(255,255,255,0.15);
                }
                .course-curriculum-section-sidebar .curriculum-section-header {
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    margin: 0;
                    padding: 0 0 12px 0;
                    background: #fff;
                    border: none;
                    border-bottom: 1px solid #e2e8f0;
                    border-radius: 0;
                    overflow: visible;
                    box-shadow: none;
                }
                .course-curriculum-section-sidebar .curriculum-lessons-section {
                    flex: 1;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                }
                .course-curriculum-section-sidebar .curriculum-section-header-inner {
                    padding: 12px 0 0 0;
                    background: #fff;
                    width: 100%;
                    box-sizing: border-box;
                }
                .curriculum-top-info-row {
                    width: 100%;
                    margin-bottom: 0;
                }
                .curriculum-top-info-row .ant-col { min-width: 0; }
                .curriculum-course-name {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1.3;
                    margin-bottom: 4px;
                }
                .curriculum-assigned-date {
                    font-size: 0.75rem;
                    color: #64748b;
                    margin-bottom: 6px;
                }
                .curriculum-top-info-right {
                    flex: 0 0 auto;
                    display: flex;
                    align-items: flex-start;
                    justify-content: flex-end;
                }
                .curriculum-deadline-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    background: #fffbeb;
                    border: 1px solid #fde68a;
                    border-radius: 8px;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #92400e;
                }
                .curriculum-deadline-badge .curriculum-deadline-info-icon { color: #b45309; }
                .curriculum-deadline-badge .curriculum-deadline-icon { color: #d97706; }
                .curriculum-progress-percent {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #475569;
                }
                .course-curriculum-section-sidebar .curriculum-header-left-inner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                }
                .course-curriculum-section-sidebar .curriculum-header-left-inner .ant-btn {
                    margin: 0;
                    padding: 0;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .course-curriculum-section-sidebar .curriculum-section-title {
                    font-size: 1.0625rem;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: -0.01em;
                }
                .course-curriculum-section-sidebar .curriculum-section-subtitle {
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: #475569;
                    margin-top: 2px;
                }
                .course-curriculum-section-sidebar .curriculum-section-meta-inline {
                    display: inline-block;
                    font-size: 0.75rem;
                    color: #64748b;
                    background: #f1f5f9;
                    padding: 2px 8px;
                    border-radius: 6px;
                }
                .course-curriculum-section-sidebar .curriculum-progress-block {
                    margin-top: 16px;
                    padding: 0;
                }
                .course-curriculum-section-sidebar .curriculum-progress-label-text {
                    font-size: 0.6875rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: #64748b;
                }
                .course-curriculum-section-sidebar .curriculum-progress-bar.ant-progress {
                    margin-top: 8px;
                }
                .course-curriculum-section-sidebar .curriculum-progress-bar .ant-progress-inner {
                    border-radius: 999px;
                }
                .course-curriculum-section-sidebar .curriculum-lessons-label {
                    padding: 12px 0 6px 0;
                }
                .course-curriculum-section-sidebar .curriculum-lessons-label-text {
                    font-size: 0.6875rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: #94a3b8;
                }
                .course-curriculum-section-sidebar .curriculum-lessons {
                    padding: 0;
                    gap: 8px;
                }
                .course-curriculum-section-sidebar .curriculum-lesson-card {
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    border-left: 3px solid #e2e8f0;
                    background: #fff;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    transition: border-color 0.2s, background 0.2s, box-shadow 0.15s ease;
                }
                .course-curriculum-section-sidebar .curriculum-lesson-card.ant-card { border: 1px solid #e2e8f0; border-left-width: 3px; }
                .course-curriculum-section-sidebar .curriculum-lesson-card:hover {
                    border-color: #cbd5e1;
                    border-left-color: #cbd5e1;
                    background: #f8fafc;
                }
                .course-curriculum-section-sidebar .curriculum-lesson-card-expanded {
                    border-color: hsl(var(--primary) / 0.5);
                    border-left-color: hsl(var(--primary));
                    background: hsl(var(--primary) / 0.06);
                    border-radius: 10px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                }
                .course-curriculum-section-sidebar .curriculum-lesson-card-expanded.ant-card { border: 1px solid hsl(var(--primary) / 0.5); border-left-width: 3px; }
                .course-curriculum-section-sidebar .curriculum-lesson-trigger {
                    padding: 10px 12px;
                }
                .course-curriculum-section-sidebar .curriculum-lesson-trigger-title {
                    font-size: 0.875rem;
                }
                .course-curriculum-section-sidebar .curriculum-material-item {
                    padding: 8px 10px 8px 12px;
                    font-size: 0.8125rem;
                    border-radius: 8px;
                    background: #fff;
                }
                .course-curriculum-section-sidebar .curriculum-material-item:hover:not(:disabled) {
                    background: #f8fafc;
                }
                .course-curriculum-section-sidebar .curriculum-material-item-active {
                    background: hsl(var(--primary) / 0.1);
                }
                .course-curriculum-section-sidebar .curriculum-materials {
                    padding-left: calc(12px + 28px + 10px);
                }
                .course-curriculum-section-sidebar .curriculum-extra-actions {
                    padding-left: calc(12px + 28px + 10px);
                }
                .curriculum-section-header {
                    margin-bottom: 1.5rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    overflow: hidden;
                }
                .curriculum-section-header .curriculum-section-header-inner {
                    padding: 16px 16px 20px;
                }
                .curriculum-section-header-inner .curriculum-top-info-row {
                    margin-bottom: 0;
                }
                .curriculum-progress-block {
                    margin-top: 16px;
                    padding: 0;
                }
                .curriculum-progress-label {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .curriculum-progress-percent {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: #475569;
                }
                .curriculum-progress-label-text {
                    font-size: 0.6875rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: #64748b;
                }
                .curriculum-deadline-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 12px;
                    font-size: 0.8125rem;
                }
                .curriculum-deadline-info-trigger {
                    cursor: pointer;
                    color: #64748b;
                    display: inline-flex;
                }
                .curriculum-deadline-info-trigger:hover {
                    color: #0f172a;
                }
                .curriculum-deadline-info-icon {
                    font-size: 16px;
                }
                .curriculum-deadline-text-only {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 600;
                    color: #92400e;
                }
                .curriculum-deadline-icon { color: #d97706; font-size: 14px; }
                .curriculum-deadline-info-card {
                    padding: 4px 0;
                    font-size: 0.8125rem;
                    color: #334155;
                    line-height: 1.6;
                }
                .curriculum-deadline-info-card strong {
                    color: #0f172a;
                    margin-right: 6px;
                }
                .curriculum-back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0;
                    margin-bottom: 0.75rem;
                    background: none;
                    border: none;
                    color: #64748b;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .curriculum-back-btn:hover {
                    color: hsl(var(--primary));
                }
                .curriculum-section-title-row {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                .curriculum-section-title {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #0f172a;
                }
                .curriculum-section-subtitle {
                    margin: 0.25rem 0 0 0;
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: #64748b;
                }
                .curriculum-section-meta-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 6px;
                }
                .curriculum-section-meta-row .curriculum-deadline-row {
                    margin-top: 0;
                    margin-left: auto;
                }
                .curriculum-section-meta {
                    font-size: 0.875rem;
                    color: #64748b;
                }
                .curriculum-progress-row {
                    margin-top: 1rem;
                }
                .curriculum-progress-tag {
                    margin: 0;
                    font-weight: 600;
                }
                .curriculum-progress-bar {
                    margin: 0;
                }
                .curriculum-lessons {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .curriculum-lesson-card {
                    background: #fff;
                    border: 1px solid #d1d5db;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .curriculum-lesson-card.ant-card { border: 1px solid #d1d5db !important; }
                .curriculum-lesson-card:hover {
                    border-color: #94a3b8;
                }
                .curriculum-lesson-card:hover .curriculum-lesson-trigger {
                    background: #f8fafc;
                }
                .curriculum-lesson-card-expanded {
                    border-color: hsl(var(--primary));
                    box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3), 0 2px 4px rgba(0,0,0,0.06);
                }
                .curriculum-lesson-card-expanded.ant-card { border: 1px solid hsl(var(--primary)) !important; }
                .curriculum-lesson-card-expanded .curriculum-lesson-trigger {
                    background: hsl(var(--primary) / 0.06);
                }
                .curriculum-lesson-card-locked {
                    opacity: 0.85;
                }
                .curriculum-lesson-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    padding: 1rem 1.25rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    text-align: left;
                    transition: background 0.2s;
                }
                .curriculum-lesson-trigger:hover:not(:disabled) {
                    background: #f8fafc;
                }
                .curriculum-lesson-trigger:disabled {
                    cursor: not-allowed;
                }
                .curriculum-lesson-trigger-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    min-width: 0;
                }
                .curriculum-lesson-trigger-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    min-width: 0;
                }
                .curriculum-lesson-trigger-title {
                    font-size: 1.0625rem;
                    font-weight: 600;
                    color: #0f172a;
                }
                .curriculum-lesson-trigger-meta {
                    font-size: 0.8125rem;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .curriculum-lesson-done-badge {
                    padding: 0.125rem 0.5rem;
                    background: hsl(var(--primary) / 0.12);
                    color: hsl(var(--primary));
                    border-radius: 9999px;
                    font-size: 0.6875rem;
                    font-weight: 600;
                }
                .curriculum-lesson-trigger-right {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .curriculum-lesson-lock {
                    font-size: 1rem;
                    color: #94a3b8;
                }
                .curriculum-lesson-chevron {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    color: #64748b;
                    transition: transform 0.25s ease, color 0.2s;
                }
                .curriculum-lesson-chevron-open {
                    transform: rotate(180deg);
                    color: hsl(var(--primary));
                }
                .curriculum-lesson-content-wrapper {
                    display: grid;
                    grid-template-rows: 0fr;
                    transition: grid-template-rows 0.35s ease;
                }
                .curriculum-lesson-content-wrapper[data-expanded="true"] {
                    grid-template-rows: 1fr;
                }
                .curriculum-lesson-content {
                    overflow: hidden;
                }
                .curriculum-lesson-content-wrapper[data-expanded="true"] .curriculum-lesson-content {
                    animation: curriculum-content-in 0.3s ease;
                }
                @keyframes curriculum-content-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .curriculum-materials {
                    display: flex;
                    flex-direction: column;
                    padding: 0 1.25rem 1rem 1.25rem;
                    padding-left: calc(1.25rem + 40px + 1rem);
                }
                @media (max-width: 640px) {
                    .curriculum-materials {
                        padding-left: 1.25rem;
                    }
                }
                .curriculum-material-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    width: 100%;
                    padding: 0.75rem 1rem;
                    margin-bottom: 0.25rem;
                    min-height: 44px;
                    background: transparent;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 0.9375rem;
                    color: #475569;
                    text-align: left;
                    transition: background 0.2s, color 0.2s;
                }
                .curriculum-material-item:hover:not(:disabled) {
                    background: #f1f5f9;
                    color: #0f172a;
                }
                .curriculum-material-item-active {
                    background: hsl(var(--primary) / 0.12);
                    color: hsl(var(--primary));
                    font-weight: 600;
                    box-shadow: 0 0 0 1px hsl(var(--primary) / 0.25);
                }
                .curriculum-material-icon {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                }
                .curriculum-material-title {
                    flex: 1;
                    min-width: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .curriculum-material-type-tag {
                    flex-shrink: 0;
                    margin: 0;
                    font-size: 0.6875rem;
                    padding: 0.125rem 0.5rem;
                }
                .curriculum-extra-actions {
                    padding: 0.5rem 1.25rem 1rem;
                    padding-left: calc(1.25rem + 40px + 1rem);
                }
                @media (max-width: 640px) {
                    .curriculum-extra-actions {
                        padding-left: 1.25rem;
                    }
                }
                .curriculum-section-footer {
                    margin-top: 1.5rem;
                    padding-top: 1.5rem;
                    padding-bottom: 0.5rem;
                    border-top: 1px solid #e2e8f0;
                    flex-shrink: 0;
                }
            `}</style>
        </section>
    );
};

export default CourseCurriculumSection;
