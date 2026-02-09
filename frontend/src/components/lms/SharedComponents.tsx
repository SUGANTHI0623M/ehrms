import React from 'react';
import { Card, Typography, Tag, Button, Progress, Avatar, Tabs } from 'antd';
import {
    ClockCircleOutlined, BookOutlined, UserOutlined,
    FileImageOutlined, RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

import { getFileUrl } from '@/utils/url';


// --- COMPONENTS ---

export const LmsCard = ({ children, className = "", ...props }: any) => (
    <Card
        className={`shadow-sm border-gray-100 rounded-2xl ${className}`}
        bordered={false}
        {...props}
    >
        {children}
    </Card>
);

export const LmsSectionHeader = ({ title, subtitle, action }: { title: React.ReactNode, subtitle?: string, action?: React.ReactNode }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
            <Title level={2} style={{ margin: 0 }} className="flex items-center gap-3 !mb-1 !text-2xl">
                {title}
            </Title>
            {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>
        {action}
    </div>
);

export const LmsStatisticCard = ({ title, value, icon, color, suffix }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:scale-[1.02]">
        <div>
            <Text type="secondary" className="text-xs font-bold uppercase tracking-wider block mb-2">{title}</Text>
            <div className="text-3xl font-black text-gray-800 tracking-tight">
                {value}
                {suffix && <span className="text-lg text-gray-400 font-medium ml-1">{suffix}</span>}
            </div>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl`} style={{ backgroundColor: `${color}10`, color: color }}>
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
}

export const LmsCourseCard = ({
    course,
    onClick,
    actionButton,
    showProgress = false,
    progress = 0,
    status
}: LmsCourseCardProps) => {
    return (
        <Card
            hoverable
            className="h-full flex flex-col shadow-sm border-gray-100 overflow-hidden group rounded-xl"
            bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
            onClick={onClick}
        >
            {/* Thumbnail Area - Aspect Ratio 16:9 */}
            <div className="relative w-full aspect-video bg-gray-100 shrink-0 overflow-hidden">
                {course?.thumbnailUrl ? (
                    <img
                        src={getFileUrl(course.thumbnailUrl)}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/f3f4f6/9ca3af?text=No+Image';
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <FileImageOutlined style={{ fontSize: 32 }} />
                    </div>
                )}

                {/* Status & Badge Overlays */}
                <div className="absolute top-2 left-2 flex gap-1">
                    <Tag color="blue" className="m-0 border-none shadow-sm opacity-90 text-[10px] px-1 font-bold uppercase tracking-wider">
                        {course.category || 'General'}
                    </Tag>
                    {course.isMandatory && (
                        <Tag color="red" className="m-0 border-none shadow-sm opacity-90 text-[10px] px-1 font-bold">
                            MANDATORY
                        </Tag>
                    )}
                </div>
            </div>

            {/* Content Body */}
            <div className="p-3 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2 mb-1">
                    <Title level={5} className="!text-sm !mb-0 line-clamp-2 leading-tight flex-1" title={course.title}>
                        {course.title}
                    </Title>
                </div>

                <div className="mt-auto space-y-3 pt-2">
                    {/* Progress Bar (Employee specific) */}
                    {showProgress && (
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>{status === 'Completed' ? 'Completed' : `${progress}% Complete`}</span>
                            </div>
                            <Progress percent={progress} showInfo={false} size="small" strokeColor={status === 'Completed' ? '#52c41a' : '#1890ff'} />
                        </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center text-[11px] text-gray-400 gap-2">
                        <span className="flex items-center gap-1"><ClockCircleOutlined /> {course.duration || course.completionDuration?.value ? `${course.duration || course.completionDuration.value} ${course.completionDuration?.unit?.[0] || 'h'}` : 'N/A'}</span>
                        <span className="text-gray-200">|</span>
                        <span className="flex items-center gap-1"><BookOutlined /> {course.materials?.length || 0} Lessons</span>
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-1.5 max-w-[60%]">
                            <Avatar size={18} icon={<UserOutlined />} className="bg-indigo-50 text-indigo-500" />
                            <Text type="secondary" className="truncate text-[10px] font-medium">{course.instructor || 'Admin'}</Text>
                        </div>

                        <div onClick={e => e.stopPropagation()}>
                            {actionButton}
                        </div>
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
        className="bg-primary hover:bg-primary/90 border-none shadow-md h-9 px-4 rounded-lg flex items-center gap-2"
        icon={icon}
        {...props}
    >
        {children}
    </Button>
);

export const LmsPageLayout = ({ header, children, rightSidebar }: { header?: React.ReactNode, children: React.ReactNode, rightSidebar?: React.ReactNode }) => (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-gray-50">
        <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header is optional or can be part of children, but if provided cleanly: */}
                {header && <div className="px-6 py-4 bg-gray-50">{header}</div>}

                <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col">
                        {children}
                    </div>
                </div>
            </div>
            {rightSidebar && (
                <div className="hidden lg:flex w-[380px] xl:w-[400px] flex-shrink-0 border-l border-gray-200 bg-white shadow-lg z-20 h-[calc(100vh-64px)] sticky top-0 flex-col overflow-hidden">
                    {rightSidebar}
                </div>
            )}
        </div>
    </div>
);
