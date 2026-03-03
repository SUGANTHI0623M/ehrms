import React, { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import {
    Button, Typography, Tag, Space, Row, Col, Divider,
    Modal, Form, Input, Select, DatePicker, InputNumber, message, Rate, Tabs, Descriptions
} from 'antd';
import {
    UserOutlined, VideoCameraOutlined, CalendarOutlined,
    LinkOutlined, PlusOutlined,
    ReloadOutlined, LogoutOutlined, CheckCircleOutlined,
    DownOutlined, UpOutlined, ClockCircleOutlined,
    FileTextOutlined, LaptopOutlined, EditOutlined, DeleteOutlined,
    TeamOutlined, UnorderedListOutlined,
    PlayCircleOutlined, PoweroffOutlined
} from "@ant-design/icons";
import { lmsService } from "@/services/lmsService";
import { useAppSelector } from "@/store/hooks";
import { disabledDatePast, disabledTimePastWhenToday } from "@/utils/dateTimePickerUtils";
import dayjs from "dayjs";
import SessionCardList from "@/components/lms/SessionCardList";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const EmployeeLiveSessions: React.FC = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAppSelector((state: any) => state.auth);

    const [searchText, setSearchText] = useState('');
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [leaveModalSession, setLeaveModalSession] = useState<any>(null);
    const [leaveLogForm] = Form.useForm();
    const [submittingLeave, setSubmittingLeave] = useState(false);
    const [showAgendaForSessionId, setShowAgendaForSessionId] = useState<string | null>(null);
    const [showParticipantsForSessionId, setShowParticipantsForSessionId] = useState<string | null>(null);
    const [durationCompletedSession, setDurationCompletedSession] = useState<any>(null);
    const [durationNotes, setDurationNotes] = useState('');
    const [cancelSessionModalSession, setCancelSessionModalSession] = useState<any>(null);
    const [cancelReasonForm] = Form.useForm();
    const [viewLogSession, setViewLogSession] = useState<any>(null);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (searchText) params.search = searchText;
            const res = await lmsService.getMyLiveSessions(params);
            setSessions(res.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        fetchMeta();
    }, []);

    // Auto-complete live sessions when duration expires; show duration-completed modal to host only
    useEffect(() => {
        const interval = setInterval(async () => {
            const liveExpired = sessions.filter(
                (s: any) => s.status === 'Live' && isSessionExpired(s)
            );
            if (liveExpired.length === 0) return;
            let hostSession: any = null;
            for (const session of liveExpired) {
                try {
                    await lmsService.autoCompleteSession(session._id);
                    if (isSessionCreator(session) && !hostSession) hostSession = session;
                } catch (_) {}
            }
            if (liveExpired.length > 0) fetchSessions();
            if (hostSession) {
                setDurationCompletedSession(hostSession);
                setDurationNotes('');
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [sessions, user?.id, user?._id]);

    // Schedule Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    // Watch assignment type
    const selectedAssignmentType = Form.useWatch('assignmentType', form);

    const fetchMeta = async () => {
        try {
            const [deptRes, empRes] = await Promise.all([
                lmsService.getDepartments(),
                lmsService.getEmployees()
            ]);

            // Handle Departments Response
            let deptData = [];
            if (deptRes?.data?.departments && Array.isArray(deptRes.data.departments)) {
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
            } else if (empRes?.staff && Array.isArray(empRes.staff)) {
                empData = empRes.staff;
            } else if (Array.isArray(empRes?.data)) {
                empData = empRes.data;
            }
            setEmployees(empData);

        } catch (error) {
            console.error("Failed to load metadata", error);
        }
    };

    const [editingSession, setEditingSession] = useState<any>(null);

    const handleCreate = () => {
        setEditingSession(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEditSession = (session: any) => {
        setEditingSession(session);
        form.setFieldsValue({
            title: session.title,
            category: session.category || 'Normal Session',
            agenda: session.agenda || '',
            scheduledAt: session.dateTime ? dayjs(session.dateTime) : undefined,
            duration: session.duration || 60,
            platform: session.platform || 'Google Meet',
            meetingLink: session.meetingLink || '',
            description: session.description || '',
            assignmentType: session.assignmentType || 'All',
            departments: session.departments || [],
            assignedEmployees: session.assignedEmployees?.map((e: any) => e._id || e) || []
        });
        setIsModalOpen(true);
    };

    const handleDeleteSession = (session: any) => {
        Modal.confirm({
            title: 'Delete session?',
            content: `Remove "${session.title}"? This cannot be undone.`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await lmsService.deleteLiveSession(session._id);
                    message.success('Session deleted');
                    fetchSessions();
                } catch (err: any) {
                    message.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Delete failed');
                }
            }
        });
    };

    const handleStartSession = async (session: any) => {
        try {
            await lmsService.updateLiveSession(session._id, { status: 'Live' });
            message.success('Session started');
            if (session.meetingLink) window.open(session.meetingLink, '_blank', 'noreferrer');
            fetchSessions();
        } catch (err: any) {
            message.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to start session');
        }
    };

    const handleCancelSession = (session: any) => {
        setCancelSessionModalSession(session);
        cancelReasonForm.resetFields();
    };

    const onCancelSessionModalOk = async () => {
        try {
            const values = await cancelReasonForm.validateFields();
            const reason = values.cancellationReason?.trim() || 'No reason provided';
            if (!cancelSessionModalSession) return;
            const payload: any = { status: 'Cancelled', cancellationReason: reason };
            if (values.cancellationRating != null && values.cancellationRating >= 1 && values.cancellationRating <= 5) payload.cancellationRating = values.cancellationRating;
            if (values.cancellationFeedback?.trim()) payload.cancellationFeedback = values.cancellationFeedback.trim();
            await lmsService.updateLiveSession(cancelSessionModalSession._id, payload);
            message.success('Session cancelled. Participants have been notified.');
            setCancelSessionModalSession(null);
            cancelReasonForm.resetFields();
            fetchSessions();
        } catch (err: any) {
            if (err?.errorFields) throw err;
            message.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to cancel');
            throw err;
        }
    };

    const handleEndSessionForHost = (session: any) => {
        Modal.confirm({
            title: 'End session?',
            content: 'This will end the session for everyone. You can add notes in the admin portal if needed.',
            okText: 'End session',
            okType: 'danger',
            cancelText: 'Keep session',
            onOk: async () => {
                try {
                    await lmsService.updateLiveSession(session._id, { status: 'Completed' });
                    message.success('Session ended');
                    fetchSessions();
                } catch (err: any) {
                    message.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to end session');
                }
            }
        });
    };

    const onFinish = async (values: any) => {
        try {
            if (editingSession) {
                const payload = {
                    title: values.title,
                    description: values.description,
                    agenda: values.agenda,
                    dateTime: values.scheduledAt.toISOString(),
                    duration: values.duration,
                    meetingLink: values.meetingLink || undefined
                };
                await lmsService.updateLiveSession(editingSession._id, payload);
                message.success('Session updated');
            } else {
                const payload = {
                    title: values.title,
                    description: values.description,
                    category: values.category,
                    dateTime: values.scheduledAt.toISOString(),
                    duration: values.duration,
                    platform: values.platform,
                    meetingLink: values.meetingLink,
                    assignmentType: values.assignmentType,
                    departments: values.departments,
                    assignedEmployees: values.assignedEmployees,
                    trainerId: user?.id,
                    trainerName: user?.name || 'Unknown',
                    notificationEnabled: true
                };
                await lmsService.scheduleSession(payload);
                message.success('Session scheduled & notifications sent');
            }
            setIsModalOpen(false);
            setEditingSession(null);
            form.resetFields();
            fetchSessions();
        } catch (error: any) {
            message.error(error?.response?.data?.error?.message || error?.response?.data?.message || 'Operation failed');
            console.error(error);
        }
    };

    // Backend status Cancelled/Completed => Ended; otherwise time-based
    const getSessionStatus = (session: any): 'Upcoming' | 'Live' | 'Ended' => {
        if (session.status === 'Cancelled' || session.status === 'Completed') return 'Ended';
        const now = dayjs();
        const start = dayjs(session.dateTime);
        const end = start.add(session.duration || 60, 'minute');
        if (now.isBefore(start)) return 'Upcoming';
        if (now.isBefore(end) || now.isSame(end)) return 'Live';
        return 'Ended';
    };

    /** True when current time >= session start + duration (for auto-complete) */
    const isSessionExpired = (session: any) => {
        const start = new Date(session.dateTime).getTime();
        const durationMinutes = session.duration ?? 60;
        const sessionEnd = start + durationMinutes * 60 * 1000;
        return Date.now() >= sessionEnd;
    };

    const getCountdownMinutes = (session: any) => {
        const start = dayjs(session.dateTime);
        return start.diff(dayjs(), 'minute');
    };

    const CATEGORY_COLORS: Record<string, string> = {
        'Normal Session': 'blue',
        'Training': 'green',
        'Live Assessment': 'orange',
        'Product Demo': 'purple',
        'Announcement': 'cyan'
    };

    const [activeTab, setActiveTab] = useState<string>('Scheduled');
    const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set());

    const toggleSessionExpand = (sessionId: string) => {
        setExpandedSessionIds((prev) => {
            const next = new Set(prev);
            if (next.has(sessionId)) {
                next.delete(sessionId);
                setShowAgendaForSessionId(null);
                setShowParticipantsForSessionId(null);
            } else {
                next.add(sessionId);
            }
            return next;
        });
    };

    const getFilteredSessionsByTab = (tabKey: string) =>
        sessions.filter((s) => {
            const status = getSessionStatus(s);
            if (tabKey === 'Scheduled') return status === 'Upcoming' || status === 'Live';
            return status === 'Ended';
        });

    const isSessionCreator = (session: any) => {
        const trainerId = session.trainerId?._id ?? session.trainerId;
        const uid = user?.id ?? user?._id;
        if (!trainerId || !uid) return false;
        return String(trainerId) === String(uid);
    };

    const getParticipantList = (session: any): { name: string }[] => {
        if (session.assignmentType === 'All') return [];
        if (session.assignmentType === 'Department') return [];
        const arr = session.assignedEmployees || [];
        return arr.map((emp: any) => ({
            name: emp?.name || [emp?.firstName, emp?.lastName].filter(Boolean).join(' ') || emp?.email || '—'
        }));
    };

    const employeeSessionColumnHeaders = (
        <>
            <div className="session-card-header-cell session-card-header-title">
                <span className="session-card-chevron session-card-chevron-placeholder" aria-hidden> </span>
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

    const renderEmployeeSessionBody = (session: any) => {
        const status = getSessionStatus(session);
        const isUpcoming = status === 'Upcoming';
        const isLive = status === 'Live';
        const isEnded = status === 'Ended';
        const hasLeft = session.mySessionLog?.left || session.myAttendance?.left;
        const countdown = getCountdownMinutes(session);
        const infoText = isUpcoming
            ? (countdown > 0 ? `Session has not started yet. Starts in ${countdown} minutes` : 'Session has not started yet.')
            : isEnded
                ? (session.status === 'Cancelled' ? 'This session was cancelled.' : 'This session has ended.')
                : isLive && hasLeft
                    ? 'You left the session.'
                    : isLive
                        ? 'Session is live.'
                        : '';
        return (
            <div className="session-expanded-inner pt-1 pb-1">
                <Divider className="session-card-divider" />
                {session.status === 'Cancelled' && session.cancellationReason && (
                    <div className="mb-3 px-1">
                        <span className="text-sm font-medium text-amber-700">Cancellation reason: </span>
                        <span className="text-sm text-gray-700">{session.cancellationReason}</span>
                    </div>
                )}
                <div className="session-expanded-toolbar session-expanded-single-row" onClick={(e) => e.stopPropagation()}>
                    <div className="session-expanded-left">
                        <span className="session-expanded-info text-sm text-gray-600">{infoText}</span>
                        {session.platform && (
                            <span className="flex items-center gap-1.5 text-sm text-gray-600">
                                <LaptopOutlined className="text-gray-400" />
                                <strong>Platform:</strong> {session.platform}
                            </span>
                        )}
                        <Button
                            type={showAgendaForSessionId === session._id ? 'primary' : 'default'}
                            size="middle"
                            icon={<UnorderedListOutlined />}
                            onClick={() => setShowAgendaForSessionId((id) => (id === session._id ? null : session._id))}
                        >
                            Agenda
                        </Button>
                        <Button
                            type={showParticipantsForSessionId === session._id ? 'primary' : 'default'}
                            size="middle"
                            icon={<TeamOutlined />}
                            onClick={() => setShowParticipantsForSessionId((id) => (id === session._id ? null : session._id))}
                        >
                            Participants
                        </Button>
                    </div>
                    <div className="session-expanded-right">
                        {isUpcoming && isSessionCreator(session) && (
                            <Space size="small" style={{ gap: 8 }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<PlayCircleOutlined />}
                                    onClick={() => handleStartSession(session)}
                                >
                                    Start Session
                                </Button>
                                <Button
                                    size="large"
                                    danger
                                    icon={<PoweroffOutlined />}
                                    onClick={() => handleCancelSession(session)}
                                >
                                    Cancel Session
                                </Button>
                            </Space>
                        )}
                        {isLive && !hasLeft && isSessionCreator(session) && (
                            <Space size="small" style={{ gap: 8 }}>
                                {session.meetingLink && (
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<PlayCircleOutlined />}
                                        className="session-btn-join"
                                        onClick={() => window.open(session.meetingLink, '_blank', 'noreferrer')}
                                    >
                                        Start Session
                                    </Button>
                                )}
                                <Button
                                    size="large"
                                    icon={<PoweroffOutlined />}
                                    className="text-orange-600 hover:text-orange-700 border-orange-300"
                                    onClick={() => handleEndSessionForHost(session)}
                                >
                                    End Session
                                </Button>
                            </Space>
                        )}
                        {isLive && !hasLeft && !isSessionCreator(session) && (
                            <Space size="small" style={{ gap: 8 }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<VideoCameraOutlined />}
                                    className="session-btn-join"
                                    onClick={() => {
                                        if (session.meetingLink) window.open(session.meetingLink, '_blank', 'noreferrer');
                                        lmsService.joinSession(session._id).catch(() => {});
                                    }}
                                >
                                    Join Session
                                </Button>
                                <Button
                                    size="large"
                                    icon={<LogoutOutlined />}
                                    danger
                                    onClick={() => {
                                        setLeaveModalSession(session);
                                        leaveLogForm.resetFields();
                                        setLeaveModalOpen(true);
                                    }}
                                >
                                    Leave Session
                                </Button>
                            </Space>
                        )}
                        {isEnded && session.recordingUrl && (
                            <Button
                                type="default"
                                size="large"
                                icon={<VideoCameraOutlined />}
                                onClick={() => window.open(session.recordingUrl, '_blank')}
                            >
                                Watch Recording
                            </Button>
                        )}
                    </div>
                </div>
                {showAgendaForSessionId === session._id && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <Text type="secondary" className="text-xs font-semibold uppercase tracking-wider block mb-1">Agenda</Text>
                        {session.agenda ? (
                            <Paragraph className="mb-0 text-gray-600 text-sm whitespace-pre-wrap">{session.agenda}</Paragraph>
                        ) : (
                            <Text type="secondary">No agenda set for this session.</Text>
                        )}
                    </div>
                )}
                {showParticipantsForSessionId === session._id && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <Text type="secondary" className="text-xs font-semibold uppercase tracking-wider block mb-2">Participants</Text>
                        {session.assignmentType === 'All' && (
                            <Text className="text-gray-600">All employees are assigned to this session.</Text>
                        )}
                        {session.assignmentType === 'Department' && (
                            <Text className="text-gray-600">Assigned by department. Participants are not listed individually.</Text>
                        )}
                        {session.assignmentType === 'Individual' && (() => {
                            const list = getParticipantList(session);
                            if (list.length === 0) return <Text className="text-gray-600">No participants listed.</Text>;
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
                <Space direction="vertical" size="middle" className="session-card-details w-full">
                    {session.description && (
                        <div className="flex gap-2">
                            <FileTextOutlined className="text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <Text type="secondary" className="text-xs font-semibold uppercase tracking-wider block mb-0.5">Description</Text>
                                <Paragraph className="mb-0 text-gray-600 text-sm">{session.description}</Paragraph>
                            </div>
                        </div>
                    )}
                </Space>
            </div>
        );
    };

    const renderSessionList = (
        list: any[],
        emptyPrimary: string,
        emptySecondary: string
    ) => (
        <SessionCardList
            list={list}
            getItemId={(s) => s._id}
            expandedIds={expandedSessionIds}
            onToggleExpand={toggleSessionExpand}
            columnHeaders={employeeSessionColumnHeaders}
            renderCardHeader={(session, isExpanded) => {
                const status = getSessionStatus(session);
                const isLive = status === 'Live';
                const hasLeft = session.mySessionLog?.left || session.myAttendance?.left;
                const statusLabel = session.status === 'Cancelled'
                    ? 'Cancelled'
                    : hasLeft && isLive
                        ? 'You left the session'
                        : status === 'Upcoming'
                            ? 'Upcoming'
                            : isLive
                                ? 'Live Now'
                                : 'Session Ended';
                const typeColor = CATEGORY_COLORS[session.category] || 'blue';
                return (
                    <>
                        <div className="session-card-header-cell session-card-header-title">
                            <span className="session-card-chevron">
                                {isExpanded ? <UpOutlined /> : <DownOutlined />}
                            </span>
                            <Text strong className="session-card-title">{session.title}</Text>
                        </div>
                        <div className="session-card-header-cell session-card-header-type" data-label="Type">
                            <Tag color={typeColor} className="session-card-type-tag">
                                {session.category}
                            </Tag>
                        </div>
                        <div className="session-card-header-cell session-card-header-sessionat" data-label="Session At">
                            {session.dateTime ? (
                                <div className="date-time-cell">
                                    <span className="date-icon"><ClockCircleOutlined /></span>
                                    <span className="date-text">{dayjs(session.dateTime).format('D MMM YYYY')}</span>
                                    <span className="time-separator"> · </span>
                                    <span className="time-text">{dayjs(session.dateTime).format('h:mm A')}</span>
                                </div>
                            ) : '—'}
                        </div>
                        <div className="session-card-header-cell session-card-header-assignedat" data-label="Assigned At">
                            {session.createdAt ? (
                                <div className="date-time-cell">
                                    <span className="date-text">{dayjs(session.createdAt).format('D MMM YYYY')}</span>
                                </div>
                            ) : '—'}
                        </div>
                        <div className="session-card-header-cell session-card-header-duration" data-label="Duration">
                            {session.duration != null ? `${session.duration} min` : '—'}
                        </div>
                        <div className="session-card-header-cell session-card-header-host" data-label="Hosted By">
                            <span className="host-icon"><UserOutlined /></span> {(session.trainerName || '—').toString()}
                        </div>
                        <div className={`session-card-header-cell session-card-header-status ${isLive && !hasLeft ? 'session-card-status-live' : ''}`} data-label="Status">
                            {statusLabel}
                        </div>
                        <div className="session-card-header-cell session-card-header-action" onClick={(e) => e.stopPropagation()} data-label="Action">
                            <Space size="small" style={{ gap: 8 }}>
                                {status === 'Ended' && (
                                    <Button
                                        type="default"
                                        size="large"
                                        icon={<FileTextOutlined />}
                                        onClick={() => setViewLogSession(session)}
                                        title="Session Log"
                                    >
                                        Session Log
                                    </Button>
                                )}
                                {isSessionCreator(session) && (
                                    <>
                                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditSession(session)} title="Edit" />
                                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSession(session)} title="Delete" />
                                    </>
                                )}
                            </Space>
                        </div>
                    </>
                );
            }}
            renderCardBody={renderEmployeeSessionBody}
            emptyPrimary={emptyPrimary}
            emptySecondary={emptySecondary}
            loading={loading}
        />
    );

    return (
        <MainLayout>
            <div className="lms-page p-4 sm:p-6 w-full max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row flex-wrap justify-between items-stretch sm:items-start gap-4">
                    <div>
                        <Title level={3} className="!mb-1 text-gray-800 tracking-tight text-lg sm:text-xl">My Live Sessions</Title>
                        <Text type="secondary" className="text-sm sm:text-base block">Join interactive classrooms. Click a session to see details.</Text>
                    </div>
                    <Space size="middle" className="w-full sm:w-auto">
                        <Button size="large" onClick={() => fetchSessions()} loading={loading} icon={<ReloadOutlined />} className="min-h-[44px] w-full sm:w-auto">Refresh</Button>
                        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleCreate} className="bg-primary hover:bg-primary/90 min-h-[44px] w-full sm:w-auto">
                            Schedule Session
                        </Button>
                    </Space>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="assessment-tabs"
                    items={[
                        {
                            key: 'Scheduled',
                            label: (
                                <span className="flex items-center gap-2">
                                    <CalendarOutlined />
                                    Scheduled
                                </span>
                            ),
                            children: renderSessionList(
                                getFilteredSessionsByTab('Scheduled'),
                                sessions.length === 0 ? 'No live sessions assigned yet.' : 'No scheduled or live sessions.',
                                "You'll see scheduled and live sessions here."
                            )
                        },
                        {
                            key: 'Ended',
                            label: (
                                <span className="flex items-center gap-2">
                                    <CheckCircleOutlined />
                                    Ended
                                </span>
                            ),
                            children: renderSessionList(
                                getFilteredSessionsByTab('Ended'),
                                'No ended sessions.',
                                'Past sessions will appear here after they end.'
                            )
                        }
                    ]}
                />
            </div>

            {/* Cancel Session – reason required; participants are notified (Host only) */}
            <Modal
                wrapClassName="lms-modal"
                title="Cancel Session"
                open={!!cancelSessionModalSession}
                onCancel={() => { setCancelSessionModalSession(null); cancelReasonForm.resetFields(); }}
                onOk={onCancelSessionModalOk}
                okText="Cancel session"
                okType="danger"
                cancelText="Keep session"
                destroyOnHidden
                centered
                afterClose={() => cancelReasonForm.resetFields()}
            >
                {cancelSessionModalSession && (
                    <>
                        <p className="text-gray-600 mb-4">
                            &quot;{cancelSessionModalSession.title}&quot; will be cancelled and moved to the Ended tab. Participants will be notified. Please provide a reason (required).
                        </p>
                        <Form form={cancelReasonForm} layout="vertical">
                            <Form.Item
                                name="cancellationReason"
                                label="Reason for cancellation"
                                rules={[{ required: true, message: 'Please enter the reason for cancellation' }]}
                            >
                                <TextArea rows={3} placeholder="e.g. Rescheduled to next week, trainer unavailable..." />
                            </Form.Item>
                            <Form.Item name="cancellationRating" label="Session rating (1–5 stars)">
                                <Rate allowHalf />
                            </Form.Item>
                            <Form.Item name="cancellationFeedback" label="Additional feedback">
                                <TextArea rows={2} placeholder="Optional: session feedback, issues, or notes..." className="resize-none" />
                            </Form.Item>
                        </Form>
                    </>
                )}
            </Modal>

            {/* Schedule Modal */}
            <Modal
                wrapClassName="lms-modal"
                title={
                    <div className="flex items-center gap-3 py-3 border-b border-gray-100 mb-0">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                            <VideoCameraOutlined className="text-xl" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 m-0 leading-tight">{editingSession ? 'Edit Session' : 'Schedule Live Session'}</h3>
                            <p className="text-xs text-gray-500 font-normal m-0 mt-0.5">{editingSession ? 'Update session details' : 'Create and manage external meetings'}</p>
                        </div>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); setEditingSession(null); form.resetFields(); }}
                footer={
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button size="large" onClick={() => { setIsModalOpen(false); setEditingSession(null); form.resetFields(); }}>Cancel</Button>
                        <Button type="primary" size="large" onClick={() => form.submit()} loading={loading} className="bg-primary hover:bg-primary/90 px-8 font-semibold">
                            {editingSession ? 'Update Session' : 'Schedule Session'}
                        </Button>
                    </div>
                }
                width={800}
                destroyOnHidden
                maskClosable={false}
                centered
                className="custom-modal top-4"
            >
                <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{
                    assignmentType: 'All',
                    sessionType: 'Online',
                    platform: 'Google Meet',
                    category: 'Normal Session',
                    duration: 60
                }}
                    className="pt-4"
                >
                    <Row gutter={[24, 24]}>
                        {/* Left Column - full width on mobile */}
                        <Col xs={24} md={12}>
                            <div className="space-y-4">
                                <Form.Item name="title" label="Session Title" rules={[{ required: true, min: 5, message: 'Title must be at least 5 characters' }]}>
                                    <Input size="large" placeholder="e.g. Q3 Sales Strategy" className="font-medium" />
                                </Form.Item>



                                <Form.Item label="Host">
                                    <Input size="large" value={user?.name} disabled className="bg-gray-50 text-gray-500" />
                                </Form.Item>

                                <Form.Item name="category" label="Session Type" rules={[{ required: true }]}>
                                    <Select size="large">
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
                                    <Input.TextArea rows={3} placeholder="e.g. 1. Intro  2. Demo  3. Q&A" className="resize-none" />
                                </Form.Item>

                                <Form.Item name="meetingLink" label="Meeting Link" rules={[
                                    { required: true, message: 'Please enter a valid URL' },
                                    { type: 'url', message: 'Must be a valid URL starting with https://' },
                                    { pattern: /^https:\/\//, message: 'URL must start with https://' }
                                ]}>
                                    <Input size="large" prefix={<LinkOutlined className="text-gray-400" />} placeholder="https://meet.google.com/..." />
                                </Form.Item>
                            </div>
                        </Col>

                        {/* Right Column */}
                        <Col xs={24} md={12}>
                            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100 h-full">
                                <Form.Item name="scheduledAt" label="Date & Time" rules={[{ required: true }]}>
                                    <DatePicker
                                        size="large"
                                        showTime={{
                                            use12Hours: true,
                                            format: 'h:mm A',
                                            disabledTime: disabledTimePastWhenToday
                                        }}
                                        format="YYYY-MM-DD h:mm A"
                                        className="w-full"
                                        disabledDate={disabledDatePast}
                                    />
                                </Form.Item>

                                <Form.Item name="duration" label="Duration (Minutes)" rules={[{ required: true, message: 'Please enter duration' }, { type: 'number', min: 1, message: 'Duration must be at least 1 minute' }]}>
                                    <InputNumber size="large" min={1} className="w-full" />
                                </Form.Item>

                                <Divider className="my-2" />

                                <Form.Item name="assignmentType" label="Session Participants" rules={[{ required: true }]}>
                                    <Select size="large">
                                        <Option value="All">All Employees</Option>
                                        <Option value="Department">By Department</Option>
                                        <Option value="Individual">By Individual Employees</Option>
                                    </Select>
                                </Form.Item>

                                {/* Conditional Fields for Participants */}
                                <Form.Item noStyle shouldUpdate={(prev, current) => prev.assignmentType !== current.assignmentType}>
                                    {({ getFieldValue }) => {
                                        const type = getFieldValue('assignmentType');
                                        return type === 'Department' ? (
                                            <Form.Item name="departments" rules={[{ required: true, message: 'Please select at least one department' }]}>
                                                <Select mode="multiple" placeholder="Select Departments" size="large" className="w-full">
                                                    {departments.map(d => <Option key={d._id} value={d._id}>{d.name}</Option>)}
                                                </Select>
                                            </Form.Item>
                                        ) : type === 'Individual' ? (
                                            <Form.Item name="assignedEmployees" rules={[{ required: true, message: 'Please select employees' }]}>
                                                <Select mode="multiple" placeholder="Search & Select Employees" size="large" className="w-full" showSearch optionFilterProp="children">
                                                    {employees.map(e => (
                                                        <Option key={e._id} value={e._id}>
                                                            {e?.name || [e?.firstName, e?.lastName].filter(Boolean).join(' ') || e?.email || '—'}
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
                    <Form.Item name="platform" hidden><Input /></Form.Item>
                </Form>
            </Modal>

            {/* Leave Live Session – Session Log Modal (Session Log mandatory, Issues/Remarks optional) */}
            <Modal
                wrapClassName="lms-modal"
                title={
                    <div className="flex items-center gap-3 py-2 border-b border-gray-100 mb-0">
                        <div className="p-2 rounded-lg bg-red-50 text-red-600">
                            <LogoutOutlined className="text-xl" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 m-0 leading-tight">Leave Live Session</h3>
                            <p className="text-xs text-gray-500 font-normal m-0 mt-0.5">Before leaving, please provide your session log.</p>
                        </div>
                    </div>
                }
                open={leaveModalOpen}
                onCancel={() => { setLeaveModalOpen(false); setLeaveModalSession(null); leaveLogForm.resetFields(); }}
                footer={null}
                width={520}
                destroyOnHidden
                maskClosable={false}
                centered
                className="custom-modal top-4"
            >
                <Form
                    form={leaveLogForm}
                    layout="vertical"
                    onFinish={async (values) => {
                        if (!leaveModalSession) return;
                        setSubmittingLeave(true);
                        try {
                            await lmsService.leaveSession(leaveModalSession._id, {
                                feedbackSummary: values.feedbackSummary?.trim() || '',
                                issues: values.issues?.trim() || undefined
                            });
                            message.success('Session log saved. You have left the session.');
                            setLeaveModalOpen(false);
                            setLeaveModalSession(null);
                            leaveLogForm.resetFields();
                            fetchSessions();
                        } catch (err: any) {
                            message.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to submit. Try again.');
                        } finally {
                            setSubmittingLeave(false);
                        }
                    }}
                    className="pt-4"
                >
                    <Form.Item
                        name="feedbackSummary"
                        label="Session Log"
                        rules={[{ required: true, message: 'Please enter your session log.' }]}
                    >
                        <Input.TextArea rows={4} placeholder="Summarize what was covered or what you learned in this session..." className="resize-none" />
                    </Form.Item>
                    <Form.Item name="issues" label="Issues / Remarks (optional)">
                        <Input.TextArea rows={2} placeholder="Any issues or follow-up remarks..." className="resize-none" />
                    </Form.Item>
                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <Button type="primary" size="large" htmlType="submit" loading={submittingLeave} danger className="bg-red-600 hover:bg-red-700 border-red-600">
                            Submit & Leave
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* Session Duration Completed — host only, after auto-complete */}
            <Modal
                wrapClassName="lms-modal"
                title="Session Duration Completed"
                open={!!durationCompletedSession}
                onCancel={() => { setDurationCompletedSession(null); setDurationNotes(''); }}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button size="large" onClick={() => { setDurationCompletedSession(null); setDurationNotes(''); }}>Close</Button>
                        <Button
                            type="primary"
                            size="large"
                            className="bg-primary hover:bg-primary/90"
                            onClick={async () => {
                                if (!durationCompletedSession) return;
                                try {
                                    await lmsService.updateLiveSession(durationCompletedSession._id, {
                                        outcomeSummary: durationNotes || undefined
                                    });
                                    message.success('Notes saved');
                                } catch (_) {}
                                setDurationCompletedSession(null);
                                setDurationNotes('');
                                fetchSessions();
                            }}
                        >
                            Submit Notes
                        </Button>
                    </div>
                }
                width={480}
                centered
            >
                {durationCompletedSession && (
                    <>
                        <p className="text-gray-600 mb-4">
                            The scheduled duration for this session has ended. Would you like to add final notes?
                        </p>
                        <Input.TextArea
                            rows={4}
                            placeholder="Optional: session summary or final notes..."
                            value={durationNotes}
                            onChange={(e) => setDurationNotes(e.target.value)}
                            className="resize-none"
                        />
                    </>
                )}
            </Modal>

            {/* View Session Log — ended sessions, log submitted when leaving */}
            <Modal
                wrapClassName="lms-modal"
                title={
                    <span className="flex items-center gap-2">
                        <FileTextOutlined />
                        Session Log
                        {viewLogSession && <span className="font-normal text-gray-500">— {viewLogSession.title}</span>}
                    </span>
                }
                open={!!viewLogSession}
                onCancel={() => setViewLogSession(null)}
                footer={
                    <div className="flex justify-end">
                        <Button type="primary" onClick={() => setViewLogSession(null)}>Close</Button>
                    </div>
                }
                width={560}
                centered
            >
                {viewLogSession && (() => {
                    const log = viewLogSession.mySessionLog || viewLogSession.myAttendance;
                    if (!log || (!log.leftAt && !log.feedbackSummary && !log.sessionPurpose && log.rating == null)) {
                        return (
                            <p className="text-gray-500 py-4">You did not submit a log for this session.</p>
                        );
                    }
                    return (
                        <Descriptions size="small" column={1} bordered className="mt-2">
                            {log.joinedAt && (
                                <Descriptions.Item label="Joined at">
                                    {dayjs(log.joinedAt).format('MMM D, YYYY h:mm A')}
                                </Descriptions.Item>
                            )}
                            {log.leftAt && (
                                <Descriptions.Item label="Left at">
                                    {dayjs(log.leftAt).format('MMM D, YYYY h:mm A')}
                                </Descriptions.Item>
                            )}
                            {log.sessionPurpose != null && String(log.sessionPurpose).trim() !== '' && (
                                <Descriptions.Item label="Session purpose">
                                    <span className="whitespace-pre-wrap">{log.sessionPurpose}</span>
                                </Descriptions.Item>
                            )}
                            {log.feedbackSummary != null && String(log.feedbackSummary).trim() !== '' && (
                                <Descriptions.Item label="Summary / What you learned">
                                    <span className="whitespace-pre-wrap">{log.feedbackSummary}</span>
                                </Descriptions.Item>
                            )}
                            {log.issues != null && String(log.issues).trim() !== '' && (
                                <Descriptions.Item label="Issues faced">
                                    <span className="whitespace-pre-wrap">{log.issues}</span>
                                </Descriptions.Item>
                            )}
                            {log.rating != null && (
                                <Descriptions.Item label="Rating">
                                    <Rate disabled value={log.rating} className="text-amber-500" />
                                    <span className="ml-2 text-gray-600">{log.rating}/5</span>
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                    );
                })()}
            </Modal>

        </MainLayout >
    );
};

export default EmployeeLiveSessions;
