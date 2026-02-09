import React, { useState } from 'react';
import {
    Typography, Progress, Space,
    Collapse, Tag,
    Divider
} from 'antd';
import {
    PlayCircleOutlined,
    CheckCircleOutlined,
    LockOutlined,
    FilePdfOutlined,
    YoutubeOutlined,
    GlobalOutlined,
    ClockCircleOutlined,
    CheckOutlined,
    FileOutlined,
    TrophyOutlined,
    RightOutlined,
    DownOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const TOTAL_ITEMS_LABEL = (sections: number, items: number) =>
    `${sections} ${sections === 1 ? 'section' : 'sections'} • ${items} ${items === 1 ? 'item' : 'items'}`;

export interface Material {
    _id: string;
    id?: string;
    title: string;
    lessonTitle?: string;
    type: 'YOUTUBE' | 'PDF' | 'VIDEO' | 'DRIVE' | 'URL';
    url?: string;
    filePath?: string;
    status?: string;
}

export interface Lesson {
    id: string;
    title: string;
    materials: Material[];
}

interface LessonSidebarProps {
    course: any;
    courseTitle?: string; // Kept for backward compatibility if needed, but prefer course.title
    progress?: any; // Full progress object
    lessons: Lesson[];
    activeLessonKey: string | null;
    setActiveLessonKey: (key: string | null) => void;
    selectedMaterialId: string | null;
    onMaterialClick: (material: Material, globalIndex: number) => void;
    isAdmin?: boolean;
    progressPercentage?: number;
    completedMaterials?: string[];
    isLessonLocked?: (index: number) => boolean;
    isLessonCompleted?: (title: string) => boolean;
    onBack?: () => void;
    renderExtraLessonActions?: (lesson: Lesson) => React.ReactNode;
    allMaterials: Material[];
    sidebarFooter?: React.ReactNode;
}

const LessonSidebar: React.FC<LessonSidebarProps> = ({
    course,
    courseTitle, // Fallback
    lessons,
    activeLessonKey,
    setActiveLessonKey,
    selectedMaterialId,
    onMaterialClick,
    isAdmin = false,
    progress,
    progressPercentage = 0,
    completedMaterials = [],
    isLessonLocked = () => false,
    isLessonCompleted = () => false,
    onBack,
    renderExtraLessonActions,
    allMaterials,
    sidebarFooter
}) => {
    // Default active keys for the main collapsible sections
    const [mainActiveKeys, setMainActiveKeys] = useState<string[]>(['learner-info', 'curriculum']);

    const title = course?.title || courseTitle || 'Untitled Course';
    const description = course?.description;
    const enrolledAt = progress?.enrolledAt;
    const completionDuration = course?.completionDuration;

    // Calculate deadline
    let deadline = null;
    let daysLeft = null;
    if (enrolledAt && completionDuration?.value) {
        const start = dayjs(enrolledAt);
        const unit = completionDuration.unit?.toLowerCase() || 'days';
        // handle 'weeks' or 'months' if dayjs supports them directly or convert. 
        // dayjs.add supports 'week', 'month'.
        const durationUnit = unit.endsWith('s') ? unit.slice(0, -1) : unit;
        deadline = start.add(completionDuration.value, durationUnit as any);
        daysLeft = deadline.diff(dayjs(), 'day');
    }

    const getMaterialIcon = (type: string) => {
        const iconStyle = { fontSize: '14px' };
        // Using explicit hex similar to primary 142 70% 38% -> #1DA553 ~ #16A34A (tailwind green-600)
        // I'll use #16a34a (green-600) to match standard primary
        const primaryColor = '#16a34a';
        switch (type) {
            case 'VIDEO': return <PlayCircleOutlined style={{ ...iconStyle, color: primaryColor }} />;
            case 'YOUTUBE': return <YoutubeOutlined style={{ ...iconStyle, color: '#ef4444' }} />;
            case 'PDF': return <FilePdfOutlined style={{ ...iconStyle, color: '#f97316' }} />;
            case 'URL': return <GlobalOutlined style={{ ...iconStyle, color: '#3b82f6' }} />;
            default: return <FileOutlined style={{ ...iconStyle, color: '#6b7280' }} />;
        }
    };

    const renderLearnerInfo = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Text type="secondary" className="text-xs uppercase font-bold tracking-wider">Your Progress</Text>
                <Tag color={progressPercentage === 100 ? "success" : "processing"} className="m-0 border-none font-semibold">
                    {progressPercentage}% Completed
                </Tag>
            </div>
            <Progress
                percent={progressPercentage}
                showInfo={false}
                strokeColor="#16a34a"  // Green-600 to match primary
                trailColor="#e2e8f0"
                size="small"
                strokeWidth={6}
                className="!m-0"
            />

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex justify-between items-center text-xs">
                <div className="flex flex-col">
                    <Text type="secondary" className="text-[10px] uppercase tracking-wide">Enrolled</Text>
                    <Text strong className="text-gray-700">{enrolledAt ? dayjs(enrolledAt).format('MMM D, YYYY') : 'N/A'}</Text>
                </div>
                <div className="h-6 w-px bg-gray-200"></div>
                <div className="flex flex-col text-right">
                    <Text type="secondary" className="text-[10px] uppercase tracking-wide">Time Left</Text>
                    <Text strong className={daysLeft && daysLeft < 3 ? "text-amber-500" : "text-gray-700"}>
                        {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days` : 'Overdue') : 'No Limit'}
                    </Text>
                </div>
            </div>
        </div>
    );

    const renderCourseOverview = () => (
        <div className="space-y-4">
            <Paragraph className="text-gray-600 text-sm leading-relaxed mb-0" ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}>
                {description || "No description available for this course."}
            </Paragraph>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2 rounded border border-gray-100/50">
                    <Space size="small" direction="vertical" className="w-full gap-0">
                        <Text type="secondary" className="text-[10px] uppercase tracking-wider">Level</Text>
                        <Text strong className="text-xs">{course?.category || 'General'}</Text>
                    </Space>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-100/50">
                    <Space size="small" direction="vertical" className="w-full gap-0">
                        <Text type="secondary" className="text-[10px] uppercase tracking-wider">Language</Text>
                        <Text strong className="text-xs">{course?.language || 'English'}</Text>
                    </Space>
                </div>
            </div>

            <Divider dashed className="my-2" />

            <div className="space-y-2">
                <Text strong className="text-xs text-gray-800">Highlights</Text>
                <div className="flex flex-wrap gap-2">
                    <Tag className="m-0 bg-primary/10 text-primary border-none text-[11px] px-2 rounded-md">
                        <Space size={4}><FileOutlined /> {allMaterials.length} Materials</Space>
                    </Tag>
                    {course?.completionDuration && (
                        <Tag className="m-0 bg-blue-50 text-blue-700 border-none text-[11px] px-2 rounded-md">
                            <Space size={4}><ClockCircleOutlined /> {course.completionDuration.value} {course.completionDuration.unit}</Space>
                        </Tag>
                    )}
                    <Tag className="m-0 bg-purple-50 text-purple-700 border-none text-[11px] px-2 rounded-md">
                        <Space size={4}><TrophyOutlined /> Certificate</Space>
                    </Tag>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#fcfcfd] border-l border-gray-100 shadow-sm custom-sidebar-container overflow-hidden">
            {/* Top Fixed Header */}
            <div className="p-4 bg-white border-b border-gray-100 z-10 shadow-sm flex-shrink-0">
                <Title level={5} className="!m-0 !text-gray-800 line-clamp-2 leading-tight">
                    {title}
                </Title>
            </div>

            {/* Scrollable Main Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <Collapse
                    activeKey={mainActiveKeys}
                    onChange={(keys) => setMainActiveKeys(keys as string[])}
                    expandIconPosition="end"
                    ghost
                    className="main-sidebar-collapse"
                >
                    {/* 1. Learner Info Panel (Only for Employee) */}
                    {!isAdmin && (
                        <Panel
                            header={<span className="font-bold text-gray-700 text-sm">Learner Info</span>}
                            key="learner-info"
                            className="bg-white border-b border-gray-50"
                        >
                            {renderLearnerInfo()}
                        </Panel>
                    )}

                    {/* 2. Course Overview Panel */}
                    <Panel
                        header={<span className="font-bold text-gray-700 text-sm">Course Overview</span>}
                        key="overview"
                        className="bg-white border-b border-gray-50"
                    >
                        {renderCourseOverview()}
                    </Panel>

                    {/* 3. Course Curriculum — industry-standard playlist */}
                    <Panel
                        header={
                            <div className="flex justify-between items-center w-full pr-2">
                                <span className="font-bold text-gray-700 text-sm">Course content</span>
                                <span className="text-xs text-gray-500">{TOTAL_ITEMS_LABEL(lessons.length, allMaterials.length)}</span>
                            </div>
                        }
                        key="curriculum"
                        className="bg-white curriculum-panel"
                    >
                        <div className="playlist-root pt-1">
                            <Collapse
                                accordion
                                activeKey={activeLessonKey ? [activeLessonKey] : []}
                                onChange={(keys) => {
                                    const key = Array.isArray(keys) ? keys[keys.length - 1] : keys;
                                    setActiveLessonKey(key as string || null);
                                }}
                                expandIcon={({ isActive }) => (isActive ? <DownOutlined className="playlist-chevron" /> : <RightOutlined className="playlist-chevron" />)}
                                expandIconPosition="end"
                                ghost
                                className="playlist-accordion"
                            >
                                {lessons.map((lesson, index) => {
                                    const locked = !isAdmin && isLessonLocked(index);
                                    const completed = !isAdmin && isLessonCompleted(lesson.title);
                                    const isCurrent = activeLessonKey === lesson.title;

                                    return (
                                        <Panel
                                            key={lesson.title}
                                            collapsible={locked ? 'disabled' : undefined}
                                            header={
                                                <div className={`playlist-lesson-header ${locked ? 'opacity-60' : ''}`}>
                                                    <div className={`playlist-lesson-num ${completed ? 'playlist-lesson-done' : isCurrent ? 'playlist-lesson-active' : ''}`}>
                                                        {completed ? <CheckOutlined style={{ fontSize: 12 }} /> : index + 1}
                                                    </div>
                                                    <div className="playlist-lesson-info">
                                                        <span className={`playlist-lesson-title ${isCurrent ? 'text-emerald-700' : ''}`}>{lesson.title}</span>
                                                        <span className="playlist-lesson-count">{lesson.materials.length} {lesson.materials.length === 1 ? 'item' : 'items'}</span>
                                                    </div>
                                                    {locked && <LockOutlined className="playlist-lock" />}
                                                </div>
                                            }
                                            className={`playlist-panel ${isCurrent ? 'playlist-panel-active' : ''}`}
                                        >
                                            <div className="playlist-items">
                                                {lesson.materials.map((material) => {
                                                    const isViewed = completedMaterials.includes(material._id || material.id || '');
                                                    const isActive = (selectedMaterialId === material._id || selectedMaterialId === material.id);
                                                    const materialIdx = allMaterials.findIndex(m => (m._id || m.id) === (material._id || material.id));

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={material._id || material.id}
                                                            onClick={() => !locked && onMaterialClick(material, materialIdx)}
                                                            disabled={locked}
                                                            className={`playlist-item ${isActive ? 'playlist-item-active' : ''} ${locked ? 'opacity-50 pointer-events-none' : ''}`}
                                                        >
                                                            <span className="playlist-item-icon">
                                                                {isViewed ? <CheckCircleOutlined className="text-emerald-600" /> : getMaterialIcon(material.type)}
                                                            </span>
                                                            <span className="playlist-item-title">{material.title}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {renderExtraLessonActions && !locked && (
                                                <div className="playlist-extra-actions">
                                                    {renderExtraLessonActions(lesson)}
                                                </div>
                                            )}
                                        </Panel>
                                    )
                                })}
                            </Collapse>
                        </div>
                    </Panel>
                </Collapse>
            </div>

            {/* Sticky Footer for Actions */}
            {sidebarFooter && (
                <div className="p-4 border-t border-gray-100 bg-white z-10">
                    {sidebarFooter}
                </div>
            )}

            <style>{`
                .custom-sidebar-container .ant-collapse-header {
                    padding: 12px 16px !important;
                    align-items: center !important;
                }
                .main-sidebar-collapse > .ant-collapse-item > .ant-collapse-header {
                    background-color: #ffffff;
                }
                .curriculum-panel .ant-collapse-content-box {
                    padding: 0 12px 16px 12px !important;
                    background-color: #ffffff;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .playlist-root { padding: 0 4px; }
                .playlist-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 12px 10px; border-bottom: 1px solid #f1f5f9; }
                .playlist-title { font-size: 13px; font-weight: 700; color: #334155; }
                .playlist-meta { font-size: 11px; color: #64748b; }
                .playlist-accordion.ant-collapse-ghost > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box { padding: 0 0 12px 0 !important; }
                .playlist-accordion .ant-collapse-header { padding: 10px 12px !important; align-items: center !important; }
                .playlist-chevron { font-size: 12px; color: #94a3b8; }
                .playlist-lesson-header { display: flex; align-items: center; gap: 10px; width: 100%; }
                .playlist-lesson-num { width: 28px; height: 28px; min-width: 28px; border-radius: 50%; background: #f1f5f9; border: 1px solid #e2e8f0; color: #64748b; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
                .playlist-lesson-done { background: #ecfdf5; border-color: #10b981; color: #059669; }
                .playlist-lesson-active { background: #059669; border-color: #059669; color: #fff; }
                .playlist-lesson-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
                .playlist-lesson-title { font-size: 13px; font-weight: 600; color: #334155; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .playlist-lesson-count { font-size: 11px; color: #94a3b8; }
                .playlist-lock { font-size: 12px; color: #cbd5e1; }
                .playlist-panel { margin-bottom: 4px; border-radius: 8px; overflow: hidden; transition: background 0.15s, border-color 0.15s; }
                .playlist-panel-active { background: #f0fdf4; border: 1px solid #bbf7d0; }
                .playlist-panel .ant-collapse-content-box { padding: 4px 0 8px 0 !important; }
                .playlist-items { display: flex; flex-direction: column; gap: 2px; }
                .playlist-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px 10px 36px; text-align: left; border: none; background: transparent; cursor: pointer; font-size: 13px; color: #475569; border-radius: 6px; transition: background 0.15s, color 0.15s; }
                .playlist-item:hover { background: #f8fafc; color: #0f172a; }
                .playlist-item-active { background: #fff; color: #059669; font-weight: 600; box-shadow: 0 0 0 1px rgba(5, 150, 105, 0.2); }
                .playlist-item-icon { flex-shrink: 0; font-size: 14px; display: flex; align-items: center; }
                .playlist-item-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .playlist-extra-actions { padding: 8px 12px 4px 36px; }
            `}</style>
        </div>
    );
};

export default LessonSidebar;
