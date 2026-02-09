import React, { useState, useEffect } from 'react';
import {
    Card, Button, Table, Modal, Form, Input, Select, Space, Typography, Tag,
    message, Row, Col, Divider, Empty, Tabs, Avatar, DatePicker, InputNumber, Descriptions
} from 'antd';
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined, LinkOutlined, DownOutlined, UpOutlined, CloudSyncOutlined, VideoCameraOutlined, FileTextOutlined, LaptopOutlined, UnorderedListOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import MainLayout from '@/components/MainLayout';
import SessionCardList from '@/components/lms/SessionCardList';
import {
    useGetAssessmentRequestsQuery,
    useUpdateAssessmentRequestMutation,
    useGetStandardAssessmentResultsQuery,
    useResetCourseAssessmentMutation
} from '@/store/api/lmsApi';
import { lmsService } from '@/services/lmsService';
import { disabledDatePast, disabledTimePastWhenToday } from '@/utils/dateTimePickerUtils';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
    getActionsForRequest,
    isScheduledTimeReached,
    getMinutesUntilScheduled,
    ASSESSMENT_TAB_KEYS,
    STATUS_TAG_COLOR
} from './assessmentWorkflow';
import { useAppSelector } from '@/store/hooks';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AssessmentManagement = () => {
    const navigate = useNavigate();
    const { user } = useAppSelector((state: any) => state.auth);
    const currentUserId = user?.id ?? user?._id ?? undefined;
    const currentUserName = user?.name ?? (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}`.trim() : user?.firstName ?? user?.email ?? '');
    const [messageApi, contextHolder] = message.useMessage();
    const [activeTab, setActiveTab] = useState(ASSESSMENT_TAB_KEYS.SCHEDULED);

    // Modals
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [endSessionModalOpen, setEndSessionModalOpen] = useState(false);
    const [viewReviewRequest, setViewReviewRequest] = useState<any>(null);
    const [schedulingRequest, setSchedulingRequest] = useState<any>(null);
    const [endSessionRequest, setEndSessionRequest] = useState<any>(null);

    const [scheduleForm] = Form.useForm();
    const [endSessionForm] = Form.useForm();
    const [employees, setEmployees] = useState<any[]>([]);
    const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
    const [endSessionSubmitting, setEndSessionSubmitting] = useState(false);
    const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(new Set());
    const [showDetailsForRequestId, setShowDetailsForRequestId] = useState<string | null>(null);
    const [showReviewForRequestId, setShowReviewForRequestId] = useState<string | null>(null);

    const toggleRequestExpand = (id: string) => {
        setExpandedRequestIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const { data: requestData, isLoading: isRequestsLoading, refetch: refetchRequests } = useGetAssessmentRequestsQuery();
    const [updateRequest] = useUpdateAssessmentRequestMutation();
    const { data: resultData, isLoading: isResultsLoading, refetch: refetchResults } = useGetStandardAssessmentResultsQuery();
    const [resetAssessment] = useResetCourseAssessmentMutation();

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
                console.error('Failed to load employees', e);
            }
        };
        load();
    }, []);

    const allRequests: any[] = requestData?.data || [];
    const requestedList = allRequests.filter((r: any) => r.status === 'Requested');
    const upcomingList = allRequests.filter((r: any) => r.status === 'Scheduled' || r.status === 'Live');
    const completedRequestsList = allRequests.filter((r: any) =>
        ['Completed', 'Cancelled', 'Rejected'].includes(r.status)
    );

    const getEmployeeDisplayName = (record: any): string => {
        if (!record) return '—';
        const emp = record.employeeId;
        if (emp && typeof emp === 'object') {
            const name = emp.name || (emp.firstName || emp.lastName ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : null);
            if (name) return name;
        }
        const id = record.employeeId?._id || record.employeeId;
        if (id && employees.length) {
            const found = employees.find((e: any) => e._id === id);
            if (found) return found.name || `${found.firstName || ''} ${found.lastName || ''}`.trim() || '—';
        }
        return '—';
    };

    const handleScheduleAssessment = (record: any) => {
        setSchedulingRequest(record);
        const courseTitle = record.courseId?.title || 'Assessment';
        const isReschedule = record.status === 'Scheduled' && record.liveSessionId;
        scheduleForm.setFieldsValue({
            title: `Live Assessment: ${courseTitle}`,
            scheduledAt: record.scheduledAt ? dayjs(record.scheduledAt) : undefined,
            duration: record.liveSessionId?.duration ?? 60,
            platform: record.liveSessionId?.platform || 'Google Meet',
            meetingLink: record.liveSessionId?.meetingLink || '',
            description: record.description || '',
            category: 'Live Assessment',
            trainerId: record.liveSessionId?.trainerId?._id || record.liveSessionId?.trainerId || currentUserId
        });
        if (currentUserId && !record.liveSessionId?.trainerId) scheduleForm.setFieldsValue({ trainerId: currentUserId });
        setScheduleModalOpen(true);
    };

    const handleEditAssessment = (record: any) => {
        handleScheduleAssessment(record);
    };

    const handleDeleteAssessment = (record: any) => {
        const status = record.status;
        if (['Completed', 'Cancelled', 'Rejected'].includes(status)) {
            messageApi.warning('This assessment is already ended or rejected.');
            return;
        }
        const isRequested = status === 'Requested';
        Modal.confirm({
            title: isRequested ? 'Reject request?' : 'Cancel assessment?',
            content: isRequested
                ? 'The assessment request will be rejected.'
                : 'The scheduled assessment will be cancelled. This action cannot be undone.',
            okType: 'danger',
            okText: isRequested ? 'Reject' : 'Cancel assessment',
            onOk: async () => {
                if (isRequested) await handleRejectRequest(record);
                else await handleCancelAssessment(record);
            }
        });
    };

    const onScheduleModalFinish = async (values: any) => {
        if (!schedulingRequest) return;
        setScheduleSubmitting(true);
        try {
            const employeeId = schedulingRequest.employeeId?._id || schedulingRequest.employeeId;
            const selectedTrainer = employees.find((e: any) => e._id === values.trainerId);
            let trainerName = selectedTrainer
                ? `${selectedTrainer.firstName || ''} ${selectedTrainer.lastName || ''}`.trim() || selectedTrainer.name
                : '';
            if (!trainerName && currentUserId && values.trainerId === currentUserId) trainerName = currentUserName || 'Assessor';
            if (!trainerName) trainerName = 'Assessor';

            const existingSessionId = schedulingRequest.liveSessionId?._id || schedulingRequest.liveSessionId;
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
                    platform: values.platform || 'Google Meet'
                });
                await updateRequest({
                    id: schedulingRequest._id,
                    scheduledAt: scheduledAtIso
                }).unwrap();
                messageApi.success('Assessment rescheduled successfully');
            } else {
                const payload = {
                    title: values.title,
                    description: values.description?.trim() || `Live assessment for ${schedulingRequest.courseId?.title || 'course'}.`,
                    category: 'Live Assessment',
                    sessionType: 'Online',
                    assignmentType: 'Individual',
                    assignedEmployees: [employeeId],
                    departments: [],
                    dateTime: scheduledAtIso,
                    duration: values.duration,
                    trainerId: values.trainerId,
                    trainerName,
                    meetingLink: values.meetingLink,
                    platform: values.platform || 'Google Meet',
                    notificationEnabled: true,
                    attendanceMandatory: false
                };
                const res = await lmsService.scheduleSession(payload);
                const session = res?.data;
                if (!session?._id) throw new Error('Session not created');
                await updateRequest({
                    id: schedulingRequest._id,
                    status: 'Scheduled',
                    scheduledAt: scheduledAtIso,
                    liveSessionId: session._id
                }).unwrap();
                messageApi.success('Assessment scheduled successfully');
            }

            setScheduleModalOpen(false);
            setSchedulingRequest(null);
            scheduleForm.resetFields();
            refetchRequests();
            setActiveTab(ASSESSMENT_TAB_KEYS.UPCOMING);
        } catch (err: any) {
            messageApi.error(err?.data?.message || err?.message || 'Failed to schedule assessment');
        } finally {
            setScheduleSubmitting(false);
        }
    };

    const handleStartAssessment = async (record: any) => {
        const liveSessionId = record.liveSessionId?._id || record.liveSessionId;
        const meetingLink = record.liveSessionId?.meetingLink;
        if (!liveSessionId) {
            messageApi.error('No session linked. Please schedule again.');
            return;
        }
        try {
            await updateRequest({ id: record._id, status: 'Live' }).unwrap();
            messageApi.success('Assessment started');
            refetchRequests();
            if (meetingLink) {
                window.open(meetingLink, '_blank', 'noopener,noreferrer');
            } else {
                navigate(`/lms/live/${liveSessionId}`);
            }
        } catch (err: any) {
            messageApi.error(err?.data?.message || 'Failed to start assessment');
        }
    };

    const handleCancelAssessment = async (record: any) => {
        try {
            await updateRequest({ id: record._id, status: 'Cancelled' }).unwrap();
            const liveSessionId = record.liveSessionId?._id || record.liveSessionId;
            if (liveSessionId) {
                try {
                    await lmsService.updateLiveSession(liveSessionId, { status: 'Cancelled' });
                } catch (_) {}
            }
            messageApi.success('Assessment cancelled');
            refetchRequests();
            if (activeTab === ASSESSMENT_TAB_KEYS.UPCOMING) setActiveTab(ASSESSMENT_TAB_KEYS.COMPLETED);
        } catch (err: any) {
            messageApi.error(err?.data?.message || 'Failed to cancel');
        }
    };

    const handleEndSessionClick = (record: any) => {
        setEndSessionRequest(record);
        endSessionForm.resetFields();
        setEndSessionModalOpen(true);
    };

    const onEndSessionModalFinish = async (values: any) => {
        if (!endSessionRequest) return;
        setEndSessionSubmitting(true);
        try {
            const qualificationScore = endSessionRequest.courseId?.qualificationScore ?? 80;
            const score = values.performancePercentage != null ? Number(values.performancePercentage) : undefined;
            const isPassed = score != null ? score >= qualificationScore : undefined;
            await updateRequest({
                id: endSessionRequest._id,
                status: 'Completed',
                sessionNotes: values.sessionSummary,
                sessionSummary: values.sessionSummary,
                ...(score != null && { score }),
                ...(isPassed != null && { isPassed })
            }).unwrap();
            const liveSessionId = endSessionRequest.liveSessionId?._id || endSessionRequest.liveSessionId;
            if (liveSessionId) {
                await lmsService.updateLiveSession(liveSessionId, {
                    status: 'Completed',
                    outcomeSummary: values.sessionSummary,
                    outcomeKeyTakeaways: values.sessionNotes
                });
            }
            messageApi.success('Session ended and saved');
            setEndSessionModalOpen(false);
            setEndSessionRequest(null);
            endSessionForm.resetFields();
            refetchRequests();
            setActiveTab(ASSESSMENT_TAB_KEYS.COMPLETED);
        } catch (err: any) {
            messageApi.error(err?.data?.message || 'Failed to end session');
        } finally {
            setEndSessionSubmitting(false);
        }
    };

    const handleRejectRequest = async (record: any) => {
        try {
            await updateRequest({ id: record._id, status: 'Rejected' }).unwrap();
            messageApi.success('Request rejected');
            refetchRequests();
        } catch (err: any) {
            messageApi.error(err?.data?.message || 'Failed to reject');
        }
    };

    /** Renders primary + secondary action buttons for use in expanded body (session-card-actions). Same UI pattern as live session. */
    const renderActionButtons = (record: any) => {
        const actions = getActionsForRequest(record);
        const scheduledReached = isScheduledTimeReached(record.scheduledAt);
        const primaryButtons: React.ReactNode[] = [];
        const secondaryButtons: React.ReactNode[] = [];

        if (actions.primary?.visible) {
            const label = actions.primary.label;
            if (actions.primary.key === 'schedule') {
                primaryButtons.push(
                    <Button key="schedule" type="primary" size="large" onClick={() => handleScheduleAssessment(record)}>
                        {label}
                    </Button>
                );
            } else if (actions.primary.key === 'start') {
                const disabled = record.status === 'Scheduled' && !scheduledReached;
                primaryButtons.push(
                    <Button
                        key="start"
                        type="primary"
                        size="large"
                        disabled={disabled}
                        onClick={() => handleStartAssessment(record)}
                    >
                        {label}
                    </Button>
                );
            } else if (actions.primary.key === 'end_session') {
                primaryButtons.push(
                    <Button key="end" type="primary" size="large" danger onClick={() => handleEndSessionClick(record)}>
                        {label}
                    </Button>
                );
            } else if (actions.primary.key === 'view_review') {
                primaryButtons.push(
                    <Button key="view" type="default" size="large" icon={<FileTextOutlined />} onClick={() => setViewReviewRequest(record)}>
                        {label}
                    </Button>
                );
            }
        }

        actions.secondary.forEach((a) => {
            if (!a.visible) return;
            if (a.key === 'cancel' || a.key === 'reject') {
                const isReject = record.status === 'Requested' && a.key === 'cancel';
                secondaryButtons.push(
                    <Button
                        key={a.key}
                        danger={a.danger}
                        ghost
                        size="large"
                        onClick={() => (isReject ? handleRejectRequest(record) : handleCancelAssessment(record))}
                    >
                        {isReject ? 'Reject' : a.label}
                    </Button>
                );
            } else if (a.key === 'end_session') {
                secondaryButtons.push(
                    <Button key="end" type="primary" size="large" danger onClick={() => handleEndSessionClick(record)}>
                        {a.label}
                    </Button>
                );
            }
        });

        if (primaryButtons.length === 0 && secondaryButtons.length === 0) return null;
        return (
            <Space size="middle" wrap style={{ gap: 8 }} className="assessment-action-buttons">
                {primaryButtons}
                {secondaryButtons}
            </Space>
        );
    };

    const formatCountdown = (scheduledAt: string | Date | undefined) => {
        const mins = getMinutesUntilScheduled(scheduledAt);
        if (mins == null || mins < 0) return null;
        if (mins < 60) return `Starts in ${mins} minute${mins !== 1 ? 's' : ''}`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m ? `Starts in ${h} hour${h !== 1 ? 's' : ''} ${m} minute${m !== 1 ? 's' : ''}` : `Starts in ${h} hour${h !== 1 ? 's' : ''}`;
    };

    /** Expanded body: same UI as Live Sessions — single row (info + Platform + Details + Review buttons left, action buttons right), toggle panels below. */
    const renderExpandedAssessmentRequest = (record: any) => {
        const countdown = record.status === 'Scheduled' && !isScheduledTimeReached(record.scheduledAt)
            ? formatCountdown(record.scheduledAt)
            : null;
        const hasReview = !!(record.sessionNotes || record.sessionSummary);
        const platform = record.liveSessionId?.platform;
        const infoText = record.status === 'Requested'
            ? 'Assessment requested. Schedule to set date and time.'
            : record.status === 'Scheduled' && countdown
                ? countdown
                : record.status === 'Scheduled'
                    ? 'Assessment scheduled.'
                    : record.status === 'Live'
                        ? 'Session is live.'
                        : ['Completed', 'Cancelled', 'Rejected'].includes(record.status)
                            ? `Assessment ${record.status.toLowerCase()}.`
                            : '';
        return (
            <div className="session-expanded-inner pt-1 pb-1" onClick={(e) => e.stopPropagation()}>
                <Divider className="session-card-divider" />
                <div className="session-expanded-toolbar session-expanded-single-row">
                    <div className="session-expanded-left">
                        <span className="session-expanded-info text-sm text-gray-600">{infoText}</span>
                        {platform && (
                            <span className="flex items-center gap-1.5 text-sm text-gray-600">
                                <LaptopOutlined className="text-gray-400" />
                                <strong>Platform:</strong> {platform}
                            </span>
                        )}
                        <Button
                            type={showDetailsForRequestId === record._id ? 'primary' : 'default'}
                            size="middle"
                            icon={<UnorderedListOutlined />}
                            onClick={() => setShowDetailsForRequestId((id) => (id === record._id ? null : record._id))}
                        >
                            Details
                        </Button>
                        <Button
                            type={showReviewForRequestId === record._id ? 'primary' : 'default'}
                            size="middle"
                            icon={<FileTextOutlined />}
                            onClick={() => setShowReviewForRequestId((id) => (id === record._id ? null : record._id))}
                        >
                            Review
                        </Button>
                    </div>
                    <div className="session-expanded-right">
                        {renderActionButtons(record)}
                    </div>
                </div>
                {showDetailsForRequestId === record._id && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <Text type="secondary" className="text-xs font-semibold uppercase tracking-wider block mb-2">Assessment details</Text>
                        <div className="space-y-1.5 text-sm text-gray-700">
                            <div><strong>Requested:</strong> {record.createdAt ? new Date(record.createdAt).toLocaleString() : ''}</div>
                            <div><strong>Scheduled:</strong> {record.scheduledAt ? new Date(record.scheduledAt).toLocaleString() : ''}</div>
                            <div>
                                <strong>Status:</strong>{' '}
                                <Tag color={STATUS_TAG_COLOR[record.status] || 'default'}>{record.status}</Tag>
                            </div>
                        </div>
                    </div>
                )}
                {showReviewForRequestId === record._id && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <Text type="secondary" className="text-xs font-semibold uppercase tracking-wider block mb-1">Review / Notes</Text>
                        {hasReview ? (
                            <Paragraph className="mb-0 text-gray-600 text-sm whitespace-pre-wrap">{record.sessionSummary || record.sessionNotes || ''}</Paragraph>
                        ) : (
                            <Text type="secondary">No review or notes for this assessment.</Text>
                        )}
                    </div>
                )}
            </div>
        );
    };

    /* Same 8-column layout as Live Sessions: LEARNER | TYPE | SESSION AT | ASSIGNED AT | DURATION | HOSTED BY | STATUS | ACTION */
    const assessmentColumnHeaders = (
        <>
            <div className="session-card-header-cell session-card-header-title">
                <span className="session-card-chevron session-card-chevron-placeholder" aria-hidden> </span>
                <span className="session-cards-column-header-label">Learner</span>
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

    const renderAssessmentCardList = (list: any[], emptyPrimary: string, emptySecondary: string) => (
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
                            <Avatar src={record.employeeId?.profilePicture} icon={<UserOutlined />} size="small" />
                            <span className="truncate">{getEmployeeDisplayName(record)}</span>
                        </div>
                    </div>
                    <div className="session-card-header-cell session-card-header-type" data-label="Type">
                        <Tag color="purple" className="session-card-type-tag">{record.type || '—'}</Tag>
                    </div>
                    <div className="session-card-header-cell session-card-header-sessionat" data-label="Session At">
                        {record.scheduledAt ? (
                            <div className="date-time-cell">
                                <span className="date-icon"><CalendarOutlined className="text-emerald-500" /></span>
                                <span className="date-text">{new Date(record.scheduledAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <span className="time-separator"> · </span>
                                <span className="time-text">{new Date(record.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                            </div>
                        ) : (
                            <span className="text-sm text-gray-400">&nbsp;</span>
                        )}
                    </div>
                    <div className="session-card-header-cell session-card-header-assignedat" data-label="Assigned At">
                        {record.createdAt ? (
                            <div className="date-time-cell">
                                <span className="date-text">{new Date(record.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                        ) : ''}
                    </div>
                    <div className="session-card-header-cell session-card-header-duration" data-label="Duration">
                        {record.liveSessionId?.duration ? `${record.liveSessionId.duration} min` : '—'}
                    </div>
                    <div className="session-card-header-cell session-card-header-host" data-label="Hosted By">
                        <span className="host-icon"><UserOutlined className="text-gray-400" /></span> {record.liveSessionId?.trainerName || '—'}
                    </div>
                    <div className="session-card-header-cell session-card-header-status" data-label="Status">
                        <Tag color={STATUS_TAG_COLOR[record.status] || 'default'}>{record.status}</Tag>
                    </div>
                    <div className="session-card-header-cell session-card-header-action" onClick={(e) => e.stopPropagation()} data-label="Action">
                        <Space size="small" style={{ gap: 8 }}>
                            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditAssessment(record)} title="Edit" />
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAssessment(record)} title="Delete" />
                        </Space>
                    </div>
                </>
            )}
            renderCardBody={renderExpandedAssessmentRequest}
            emptyPrimary={emptyPrimary}
            emptySecondary={emptySecondary}
            loading={isRequestsLoading}
            wrapperClassName=""
        />
    );

    const completedColumns = [
        {
            title: 'Learner',
            dataIndex: 'employeeId',
            key: 'employee',
            render: (emp: any) => (
                <Space>
                    <Avatar src={emp?.profilePicture} icon={<UserOutlined />} />
                    <div>
                        <div className="font-medium text-sm">{emp?.name}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{emp?.department?.name || emp?.department}</div>
                    </div>
                </Space>
            )
        },
        { title: 'Assessment', dataIndex: 'courseId', key: 'course', render: (c: any) => <Text strong className="text-sm">{c?.title || 'Generic Assessment'}</Text> },
        { title: 'Date', dataIndex: 'lastAssessmentDate', key: 'date', render: (d: string) => (d ? new Date(d).toLocaleDateString() : '-') },
        {
            title: 'Score',
            dataIndex: 'assessmentScore',
            key: 'score',
            render: (score: number) => (
                <Tag color={score >= 80 ? 'green' : score >= 50 ? 'orange' : 'red'}>{score}%</Tag>
            )
        },
        {
            title: 'Status',
            dataIndex: 'assessmentStatus',
            key: 'status',
            render: (s: string) => <Tag color={s === 'Passed' ? 'success' : s === 'Failed' ? 'error' : 'processing'}>{s}</Tag>
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => (
                <Button
                    type="link"
                    size="small"
                    onClick={() => {
                        resetAssessment({ courseId: record.courseId?._id, employeeId: record.employeeId?._id });
                        messageApi.success('Assessment reset successfully');
                        refetchResults();
                    }}
                >
                    Reset
                </Button>
            )
        }
    ];

    const tabItems = [
        {
            key: ASSESSMENT_TAB_KEYS.SCHEDULED,
            label: (
                <span className="flex items-center gap-2">
                    <ClockCircleOutlined />
                    Assessment Requests
                </span>
            ),
            children: renderAssessmentCardList(
                requestedList,
                'No assessment requests.',
                'Schedule a request to move it to Upcoming.'
            )
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
                'No upcoming or live assessments.',
                'Scheduled and live assessments appear here.'
            )
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
                <div className="space-y-6">
                    {renderAssessmentCardList(
                        completedRequestsList,
                        'No completed or cancelled requests.',
                        'Past requests and session notes appear here.'
                    )}
                    <Card title="Assessment results (scores)" className="shadow-sm border-gray-100" bordered={false} loading={isResultsLoading} bodyStyle={{ padding: 20 }}>
                        <div className="scores-table-wrapper overflow-x-auto">
                            <Table
                                columns={completedColumns}
                                dataSource={resultData?.data || []}
                                rowKey="_id"
                                locale={{ emptyText: <Empty description="No completed assessments found" /> }}
                                pagination={{ showSizeChanger: true }}
                                showSorterTooltip={false}
                            />
                        </div>
                    </Card>
                </div>
            )
        }
    ];

    return (
        <MainLayout>
            {contextHolder}
            <div className="lms-page p-4 sm:p-6 w-full max-w-7xl mx-auto space-y-6 overflow-x-hidden">
                <div className="flex flex-col sm:flex-row flex-wrap justify-between items-stretch sm:items-start gap-4">
                    <div>
                        <Title level={3} className="!mb-1 text-gray-800 tracking-tight text-lg sm:text-xl">Assessment Management</Title>
                        <Text type="secondary" className="text-sm sm:text-base block">Status-driven workflow: Requested → Scheduled → Live → Completed. Click a row to expand details.</Text>
                    </div>
                    <Space size="middle" className="w-full sm:w-auto">
                        <Button size="large" onClick={() => { refetchRequests(); refetchResults(); }} loading={isRequestsLoading} icon={<CloudSyncOutlined />} className="min-h-[44px] w-full sm:w-auto">
                            Refresh
                        </Button>
                    </Space>
                </div>

                <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} className="assessment-tabs" />

                {/* Schedule Assessment Modal — same UI as Schedule Session, Live Assessment only, participants read-only */}
                <Modal
                    title={
                        <div className="flex items-center gap-3 py-3 border-b border-gray-100 mb-0">
                            <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                <VideoCameraOutlined className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 m-0 leading-tight">Schedule Assessment</h3>
                                <p className="text-xs text-gray-500 font-normal m-0 mt-0.5">Set date, time, and meeting link. Participant is the employee who requested.</p>
                            </div>
                        </div>
                    }
                    open={scheduleModalOpen}
                    onCancel={() => { setScheduleModalOpen(false); setSchedulingRequest(null); scheduleForm.resetFields(); }}
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
                                title: `Live Assessment: ${schedulingRequest.courseId?.title || 'Assessment'}`,
                                duration: 60,
                                platform: 'Google Meet',
                                category: 'Live Assessment',
                                meetingLink: '',
                                description: ''
                            }}
                            className="pt-4"
                        >
                            <Row gutter={[24, 24]}>
                                <Col xs={24} md={12}>
                                    <div className="space-y-4">
                                        <Form.Item name="title" label="Session Title" rules={[{ required: true, min: 3, message: 'Title must be at least 3 characters' }]}>
                                            <Input size="large" placeholder="e.g. Live Assessment: Course Name" className="font-medium" />
                                        </Form.Item>
                                        <Form.Item label="Session Type">
                                            <Input size="large" value="Live Assessment" disabled className="bg-gray-50 text-gray-600" />
                                        </Form.Item>
                                        <Form.Item label="Session Participants">
                                            <Input size="large" value={getEmployeeDisplayName(schedulingRequest)} disabled className="bg-gray-50 text-gray-600" />
                                        </Form.Item>
                                        <Form.Item name="trainerId" label="Host / Assessor" rules={[{ required: true, message: 'Please select the host' }]}>
                                            <Select size="large" placeholder="Select host or assessor" showSearch optionFilterProp="children">
                                                {currentUserId && (
                                                    <Option key={currentUserId} value={currentUserId}>
                                                        <Space>
                                                            <UserOutlined />
                                                            {currentUserName ? `Myself (${currentUserName})` : 'Myself'}
                                                        </Space>
                                                    </Option>
                                                )}
                                                {employees
                                                    .filter((e: any) => e._id !== currentUserId)
                                                    .map((e: any) => (
                                                        <Option key={e._id} value={e._id}>{e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim()}</Option>
                                                    ))}
                                            </Select>
                                        </Form.Item>
                                        <Form.Item name="meetingLink" label="Meeting Link">
                                            <Input size="large" prefix={<LinkOutlined className="text-gray-400" />} placeholder="https://meet.google.com/... (optional)" />
                                        </Form.Item>
                                        <Form.Item name="description" label="Description / Notes">
                                            <Input.TextArea rows={3} placeholder="Optional notes for this assessment session" className="resize-none" />
                                        </Form.Item>
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100 h-full">
                                        <Form.Item name="scheduledAt" label="Date & Time" rules={[{ required: true, message: 'Please select date and time' }]}>
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
                                        <Form.Item name="duration" label="Duration (Minutes)" rules={[{ required: true }]}>
                                            <InputNumber size="large" min={15} step={15} className="w-full" />
                                        </Form.Item>
                                        <Divider className="my-2" />
                                        <Form.Item name="platform" label="Platform" rules={[{ required: true }]}>
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
                                <Button size="large" onClick={() => { setScheduleModalOpen(false); setSchedulingRequest(null); scheduleForm.resetFields(); }}>Cancel</Button>
                                <Button type="primary" size="large" htmlType="submit" loading={scheduleSubmitting} className="bg-primary hover:bg-primary/90 px-8 font-semibold">
                                    Schedule Assessment
                                </Button>
                            </div>
                        </Form>
                    )}
                </Modal>

                {/* End Assessment Session — review required */}
                <Modal
                    title={
                        <div className="flex items-center gap-3 py-3 border-b border-gray-100 mb-0">
                            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                                <FileTextOutlined className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 m-0 leading-tight">End Assessment Session</h3>
                                <p className="text-xs text-gray-500 font-normal m-0 mt-0.5">Please provide feedback about this assessment session.</p>
                            </div>
                        </div>
                    }
                    open={endSessionModalOpen}
                    onCancel={() => { setEndSessionModalOpen(false); setEndSessionRequest(null); endSessionForm.resetFields(); }}
                    footer={null}
                    width={560}
                    destroyOnClose
                    centered
                    className="custom-modal top-4"
                >
                    {endSessionRequest && (
                        <Form form={endSessionForm} layout="vertical" onFinish={onEndSessionModalFinish} className="pt-4">
                            <Form.Item label="Session Title">
                                <Input value={endSessionRequest.liveSessionId?.title || endSessionRequest.courseId?.title || 'Assessment'} readOnly className="bg-gray-50" />
                            </Form.Item>
                            <Form.Item label="Learner">
                                <Input value={getEmployeeDisplayName(endSessionRequest)} readOnly className="bg-gray-50" />
                            </Form.Item>
                            <Form.Item
                                name="performancePercentage"
                                label="Assessment performance (%)"
                                rules={[{ required: true, message: 'Please enter the assessment performance percentage.' }]}
                                extra={endSessionRequest.courseId?.qualificationScore != null
                                    ? `Qualification score for this course: ${endSessionRequest.courseId.qualificationScore}%`
                                    : 'Qualification score for this course: 80% (default)'}
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
                                rules={[{ required: true, message: 'Please enter how the assessment went and any observations or notes.' }]}
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="How did the assessment go? Any observations, issues, or notes?"
                                    className="resize-none"
                                />
                            </Form.Item>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <Button size="large" onClick={() => { setEndSessionModalOpen(false); setEndSessionRequest(null); endSessionForm.resetFields(); }}>Cancel</Button>
                                <Button type="primary" size="large" htmlType="submit" loading={endSessionSubmitting} className="bg-primary hover:bg-primary/90 px-8 font-semibold">
                                    Save & Complete
                                </Button>
                            </div>
                        </Form>
                    )}
                </Modal>

                {/* View Review Modal — completed assessment review/notes */}
                <Modal
                    title="View Review"
                    open={!!viewReviewRequest}
                    onCancel={() => setViewReviewRequest(null)}
                    footer={
                        <div className="flex justify-end">
                            <Button type="primary" onClick={() => setViewReviewRequest(null)}>Close</Button>
                        </div>
                    }
                    width={520}
                    centered
                >
                    {viewReviewRequest && (
                        <div className="space-y-4 pt-2">
                            <Descriptions size="small" column={1} bordered>
                                <Descriptions.Item label="Session Title">
                                    {viewReviewRequest.liveSessionId?.title || viewReviewRequest.courseId?.title || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Learner">{getEmployeeDisplayName(viewReviewRequest)}</Descriptions.Item>
                                <Descriptions.Item label="Completed">
                                    {viewReviewRequest.completedAt
                                        ? dayjs(viewReviewRequest.completedAt).format('MMM D, YYYY h:mm A')
                                        : viewReviewRequest.updatedAt
                                            ? dayjs(viewReviewRequest.updatedAt).format('MMM D, YYYY h:mm A')
                                            : '—'}
                                </Descriptions.Item>
                                {viewReviewRequest.score != null && (
                                    <Descriptions.Item label="Assessment performance">
                                        {viewReviewRequest.score}%
                                    </Descriptions.Item>
                                )}
                                <Descriptions.Item label="Review / Notes">
                                    {viewReviewRequest.sessionSummary || viewReviewRequest.sessionNotes || '—'}
                                </Descriptions.Item>
                            </Descriptions>
                        </div>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
};

export default AssessmentManagement;
