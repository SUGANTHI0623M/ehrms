import React, { useState, useEffect } from 'react';
import { Typography, Progress, Tag, Button } from 'antd';
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
    /** When "sidebar", uses compact styling for Udemy/YouTube-style side panel */
    variant?: 'default' | 'sidebar';
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
    variant = 'default',
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

    return (
        <section className={`course-curriculum-section ${isSidebar ? 'course-curriculum-section-sidebar' : ''}`}>
            <div className="curriculum-section-header">
                <div className="curriculum-section-title-row">
                    <div>
                        <h2 className="curriculum-section-title">Course content</h2>
                        {courseTitle && <p className="curriculum-section-subtitle">{courseTitle}</p>}
                    </div>
                    <span className="curriculum-section-meta">{TOTAL_LABEL(lessons.length, allMaterials.length)}</span>
                </div>
                {!isAdmin && (
                    <div className="curriculum-progress-row">
                        <div className="curriculum-progress-label">
                            <Text type="secondary" className="text-xs font-semibold uppercase tracking-wider">Your progress</Text>
                            <Tag color={progressPercentage === 100 ? 'success' : 'processing'} className="curriculum-progress-tag">
                                {progressPercentage}% Completed
                            </Tag>
                        </div>
                        <Progress
                            percent={progressPercentage}
                            showInfo={false}
                            strokeColor="hsl(var(--primary))"
                            trailColor="#e2e8f0"
                            strokeWidth={8}
                            className="curriculum-progress-bar"
                        />
                    </div>
                )}
            </div>

            <div className="curriculum-lessons">
                {lessons.map((lesson, index) => {
                    const locked = !isAdmin && isLessonLocked(index);
                    const completed = !isAdmin && isLessonCompleted(lesson.title);
                    const isExpanded = expandedLessons[lesson.title] ?? lesson.title === activeLessonKey;

                    return (
                        <div
                            key={lesson.title}
                            className={`curriculum-lesson-card ${isExpanded ? 'curriculum-lesson-card-expanded' : ''} ${locked ? 'curriculum-lesson-card-locked' : ''}`}
                        >
                            <button
                                type="button"
                                onClick={() => !locked && toggleLesson(lesson.title)}
                                disabled={locked}
                                className="curriculum-lesson-trigger"
                            >
                                <div className="curriculum-lesson-trigger-left">
                                    <div className={`curriculum-lesson-num ${completed ? 'curriculum-lesson-num-done' : isExpanded ? 'curriculum-lesson-num-active' : ''}`}>
                                        {completed ? <CheckCircleOutlined style={{ fontSize: 16 }} /> : index + 1}
                                    </div>
                                    <div className="curriculum-lesson-trigger-info">
                                        <span className="curriculum-lesson-trigger-title">{lesson.title}</span>
                                        <span className="curriculum-lesson-trigger-meta">
                                            {lesson.materials.length} {lesson.materials.length === 1 ? 'item' : 'items'}
                                            {completed && !isAdmin && <span className="curriculum-lesson-done-badge">Completed</span>}
                                        </span>
                                    </div>
                                </div>
                                <div className="curriculum-lesson-trigger-right">
                                    {locked && <LockOutlined className="curriculum-lesson-lock" />}
                                    <span className={`curriculum-lesson-chevron ${isExpanded ? 'curriculum-lesson-chevron-open' : ''}`}>
                                        <DownOutlined />
                                    </span>
                                </div>
                            </button>

                            <div className="curriculum-lesson-content-wrapper" data-expanded={isExpanded}>
                                <div className="curriculum-lesson-content">
                                    <div className="curriculum-materials">
                                        {lesson.materials.map((material) => {
                                            const isViewed = completedMaterials.includes(material._id || material.id || '');
                                            const isActive = selectedMaterialId === (material._id || material.id);
                                            const materialIdx = allMaterials.findIndex(m => (m._id || m.id) === (material._id || material.id));

                                            return (
                                                <button
                                                    type="button"
                                                    key={material._id || material.id}
                                                    onClick={() => {
                                                        if (!locked) {
                                                            onMaterialClick(material, materialIdx);
                                                            openLesson(lesson.title);
                                                        }
                                                    }}
                                                    disabled={locked}
                                                    className={`curriculum-material-item ${isActive ? 'curriculum-material-item-active' : ''} ${locked ? 'opacity-50 pointer-events-none' : ''}`}
                                                >
                                                    <span className="curriculum-material-icon">
                                                        {isViewed ? <CheckCircleOutlined className="text-primary" /> : getMaterialIcon(material.type)}
                                                    </span>
                                                    <span className="curriculum-material-title">{material.title}</span>
                                                    <Tag className="curriculum-material-type-tag">{material.type}</Tag>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {renderExtraLessonActions && !locked && (
                                        <div className="curriculum-extra-actions">
                                            {renderExtraLessonActions(lesson)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

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
                    padding: 1rem 1.25rem 1.5rem;
                }
                .course-curriculum-section-sidebar .curriculum-section-header {
                    margin-bottom: 1rem;
                }
                .course-curriculum-section-sidebar .curriculum-section-title {
                    font-size: 1.125rem;
                }
                .course-curriculum-section-sidebar .curriculum-lesson-trigger {
                    padding: 0.75rem 1rem;
                }
                .course-curriculum-section-sidebar .curriculum-lesson-num {
                    width: 32px;
                    height: 32px;
                    min-width: 32px;
                    font-size: 0.875rem;
                }
                .course-curriculum-section-sidebar .curriculum-lesson-trigger-title {
                    font-size: 0.9375rem;
                }
                .course-curriculum-section-sidebar .curriculum-material-item {
                    padding: 0.5rem 0.75rem;
                    font-size: 0.8125rem;
                }
                .course-curriculum-section-sidebar .curriculum-materials {
                    padding-left: calc(1rem + 32px + 0.75rem);
                }
                .course-curriculum-section-sidebar .curriculum-extra-actions {
                    padding-left: calc(1rem + 32px + 0.75rem);
                }
                .curriculum-section-header {
                    margin-bottom: 1.5rem;
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
                    color: #64748b;
                }
                .curriculum-section-meta {
                    font-size: 0.875rem;
                    color: #64748b;
                }
                .curriculum-progress-row {
                    margin-top: 1rem;
                }
                .curriculum-progress-label {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
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
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    overflow: hidden;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .curriculum-lesson-card:hover {
                    border-color: #cbd5e1;
                }
                .curriculum-lesson-card-expanded {
                    border-color: hsl(var(--primary));
                    box-shadow: 0 0 0 1px hsl(var(--primary) / 0.25);
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
                .curriculum-lesson-num {
                    width: 40px;
                    height: 40px;
                    min-width: 40px;
                    border-radius: 50%;
                    background: #f1f5f9;
                    border: 2px solid #e2e8f0;
                    color: #64748b;
                    font-size: 1rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s, border-color 0.2s, color 0.2s;
                }
                .curriculum-lesson-num-done {
                    background: hsl(var(--primary) / 0.12);
                    border-color: hsl(var(--primary));
                    color: hsl(var(--primary));
                }
                .curriculum-lesson-num-active {
                    background: hsl(var(--primary));
                    border-color: hsl(var(--primary));
                    color: #fff;
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
                    border-top: 1px solid #e2e8f0;
                }
            `}</style>
        </section>
    );
};

export default CourseCurriculumSection;
