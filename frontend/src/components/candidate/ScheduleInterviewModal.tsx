import { useState, useEffect, useMemo } from "react";
import { Modal, Form, Select, Input, message, DatePicker, TimePicker } from "antd";
import { Button } from "@/components/ui/button";
import { useScheduleInterviewMutation } from "@/store/api/interviewApi";
import { useGetCandidateByIdQuery } from "@/store/api/candidateApi";
import { useGetJobOpeningByIdQuery, useGetJobInterviewFlowQuery } from "@/store/api/jobOpeningApi";
import { useGetUsersQuery } from "@/store/api/userApi";
import { useGetActiveBranchesQuery } from "@/store/api/branchApi";
import { useGetInterviewTemplateByIdQuery } from "@/store/api/interviewTemplateApi";
import { useAppSelector } from "@/store/hooks";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import ClockTimePicker from "@/components/ui/clock-time-picker";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import dayjs, { Dayjs } from "dayjs";

const { TextArea } = Input;

interface ScheduleInterviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidateId: string | null;
    candidateName: string;
    roundNumber?: number;
}

const ScheduleInterviewModal = ({ isOpen, onClose, candidateId, candidateName, roundNumber }: ScheduleInterviewModalProps) => {
    const [form] = Form.useForm();
    const currentUser = useAppSelector((state) => state.auth.user);
    const [scheduleInterview, { isLoading: isScheduling }] = useScheduleInterviewMutation();
    const { data: candidateData } = useGetCandidateByIdQuery(candidateId || "", { skip: !candidateId });
    const candidate = candidateData?.data?.candidate;
    
    // Get job ID from candidate
    const jobId = useMemo(() => {
        if (!candidate?.jobId) return null;
        return typeof candidate.jobId === 'string' ? candidate.jobId : candidate.jobId._id;
    }, [candidate]);
    
    // Fetch job and interview flow to get assigned interviewer for the round
    const { data: jobData } = useGetJobOpeningByIdQuery(jobId || "", { skip: !jobId });
    const { data: flowData } = useGetJobInterviewFlowQuery(jobId || "", { skip: !jobId });
    
    // Get round details from interview flow
    const roundDetails = useMemo(() => {
        if (!flowData?.data?.job?.interviewRounds || !roundNumber) return null;
        
        const round = flowData.data.job.interviewRounds.find((r: any) => r.roundNumber === roundNumber);
        if (!round) return null;
        
        // Get the first assigned interviewer ID
        const interviewerId = round.assignedInterviewers && round.assignedInterviewers.length > 0
            ? (typeof round.assignedInterviewers[0] === 'object' 
                ? round.assignedInterviewers[0]._id 
                : round.assignedInterviewers[0])
            : null;
        
        return {
            roundNumber: round.roundNumber,
            roundName: round.roundName,
            assignedInterviewerId: interviewerId,
            assignedRole: round.assignedRole,
            templateId: round.templateId ? (typeof round.templateId === 'object' ? round.templateId._id : round.templateId) : null,
            branchId: round.branchId ? (typeof round.branchId === 'object' ? round.branchId._id : round.branchId) : null,
            questions: round.questions || [],
            maxScore: round.maxScore,
            isRequired: round.isRequired
        };
    }, [flowData, roundNumber]);
    
    // Fetch users to get interviewer details
    const { data: usersData } = useGetUsersQuery({
        isActive: 'true',
        limit: 1000,
        companyId: currentUser?.companyId
    }, { skip: !currentUser?.companyId });
    
    // Fetch branches to get location details
    const { data: branchesData } = useGetActiveBranchesQuery();
    
    // Fetch template details if template is assigned
    const { data: templateData } = useGetInterviewTemplateByIdQuery(roundDetails?.templateId || "", {
        skip: !roundDetails?.templateId
    });
    
    // Get interviewer details
    const interviewer = useMemo(() => {
        if (!roundDetails?.assignedInterviewerId || !usersData?.data?.users) return null;
        return usersData.data.users.find((u: any) => u._id === roundDetails.assignedInterviewerId);
    }, [roundDetails, usersData]);
    
    // Get branch details
    const branch = useMemo(() => {
        if (!roundDetails?.branchId || !branchesData?.data?.branches) return null;
        return branchesData.data.branches.find((b: any) => b._id === roundDetails.branchId);
    }, [roundDetails, branchesData]);

    // Combined Date Time State
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // Detect mobile screen
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setScheduledDate(undefined);
            // Set default interview mode based on branch
            const defaultMode = branch ? 'Direct' : 'Virtual';
            form.resetFields();
            form.setFieldsValue({ interviewMode: defaultMode });
        }
    }, [isOpen, form, branch]);

    // Function to disable past dates
    const isDateDisabled = (date: Date) => {
        const today = startOfDay(new Date());
        return isBefore(date, today);
    };

    // Function to check if selected date/time is in the past
    const isDateTimeInPast = (date: Date) => {
        return isBefore(date, new Date());
    };

    const handleScheduleInterview = async (values: any) => {
        if (!candidateId) return;
        
        let finalDate: Date | undefined = scheduledDate;
        
        // For mobile, combine date and time from form values
        if (isMobile && values.interviewDate && values.interviewTime) {
            const date = dayjs(values.interviewDate);
            const time = dayjs(values.interviewTime);
            const combined = date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0);
            finalDate = combined.toDate();
            setScheduledDate(finalDate);
        }
        
        if (!finalDate) {
            message.error("Please select an interview date and time");
            return;
        }

        // Validate that the selected date/time is not in the past
        if (isDateTimeInPast(finalDate)) {
            message.error("Please select a future date and time for the interview");
            return;
        }

        try {
            // Use assigned interviewer from flow, or fallback if not found
            if (!roundDetails?.assignedInterviewerId || !interviewer) {
                message.error("No interviewer assigned for this round in the interview flow. Please configure the interview flow first.");
                return;
            }
            
            // Determine interview type based on branch
            const interviewType = branch ? 'In-Person' : 'Virtual';
            
            await scheduleInterview({
                candidateId: candidateId,
                data: {
                    interviewType: interviewType,
                    interviewDate: format(finalDate, 'yyyy-MM-dd'),
                    interviewTime: format(finalDate, 'HH:mm'),
                    interviewMode: values.interviewMode,
                    interviewerId: roundDetails.assignedInterviewerId,
                    interviewerName: interviewer.name || '',
                    interviewerEmail: interviewer.email || '',
                    notes: values.notes,
                    round: roundNumber || 1,
                    branchId: roundDetails.branchId || undefined,
                    templateId: roundDetails.templateId || undefined
                }
            }).unwrap();

            message.success(`Interview scheduled successfully for ${candidateName}`);
            onClose();
            form.resetFields();
            setScheduledDate(undefined);
        } catch (error: any) {
            message.error(error?.data?.error?.message || "Failed to schedule interview");
        }
    };

    return (
        <Modal
            title="Schedule Interview"
            open={isOpen}
            onCancel={() => {
                onClose();
                form.resetFields();
            }}
            footer={null}
            width={typeof window !== 'undefined' && window.innerWidth < 768 ? '95%' : 720}
            className="[&_.ant-modal-content]:!max-h-[95vh] [&_.ant-modal-content]:!overflow-y-auto [&_.ant-modal-body]:!p-4 sm:[&_.ant-modal-body]:!p-6"
            style={{ top: typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : undefined }}
        >
            <div className="mb-4 sm:mb-6 bg-slate-50 p-3 sm:p-4 rounded-md border space-y-2">
                <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 break-words">{candidateName}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                        <span className="font-medium">Applied For:</span>
                        <span className="break-words">{jobData?.data?.jobOpening?.title || candidate?.position || "N/A"}</span>
                    </div>
                </div>
                
                {/* Display Round Details from Interview Flow */}
                {!flowData && jobId && (
                    <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-muted-foreground">Loading interview flow details...</p>
                    </div>
                )}
                {flowData && !roundDetails && (
                    <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-orange-600">
                            No interview flow configured for this job or round {roundNumber} is not enabled. Please configure the interview flow first.
                        </p>
                    </div>
                )}
                {roundDetails && (
                    <div className="pt-2 border-t border-gray-200">
                        <div className="text-xs sm:text-sm space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">Round:</span>
                                <span className="text-gray-600">{roundDetails.roundName || `Round ${roundDetails.roundNumber}`}</span>
                            </div>
                            {roundDetails.assignedRole && (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">Role:</span>
                                    <span className="text-gray-600">{roundDetails.assignedRole}</span>
                                </div>
                            )}
                            {branch && (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">Location:</span>
                                    <span className="text-gray-600">
                                        {branch.name}
                                        {branch.address && (
                                            <span className="text-xs text-gray-500 ml-1">
                                                ({branch.address.city || ''}{branch.address.state ? `, ${branch.address.state}` : ''})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                            {templateData?.data?.template && (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-700">Template:</span>
                                    <span className="text-gray-600">{templateData.data.template.templateName || templateData.data.template.flowName}</span>
                                </div>
                            )}
                            {roundDetails.questions && roundDetails.questions.length > 0 && (
                                <div className="flex items-start gap-2">
                                    <span className="font-medium text-gray-700">Questions:</span>
                                    <span className="text-gray-600">{roundDetails.questions.length} question(s) configured</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {candidate?.source === 'REFERRAL' && (
                    <div className="mt-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-semibold">
                            Referred
                        </span>
                    </div>
                )}
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleScheduleInterview}
                initialValues={{
                    interviewMode: branch ? 'Direct' : 'Virtual',
                }}
            >
                {/* Mobile: Use Ant Design DatePicker and TimePicker */}
                {isMobile ? (
                    <>
                        <Form.Item
                            name="interviewDate"
                            label={<span className="text-sm sm:text-base">Interview Date *</span>}
                            rules={[{ required: true, message: 'Please select interview date' }]}
                        >
                            <DatePicker
                                className="w-full text-sm"
                                disabledDate={(current) => current && current < dayjs().startOf('day')}
                                placeholder="Select date"
                                format="YYYY-MM-DD"
                                onChange={(date) => {
                                    if (date) {
                                        const newDate = new Date(scheduledDate || new Date());
                                        newDate.setFullYear(date.year(), date.month(), date.date());
                                        setScheduledDate(newDate);
                                        form.setFieldsValue({ interviewDate: date });
                                    }
                                }}
                            />
                        </Form.Item>
                        <Form.Item
                            name="interviewTime"
                            label={<span className="text-sm sm:text-base">Interview Time *</span>}
                            rules={[{ required: true, message: 'Please select interview time' }]}
                        >
                            <TimePicker
                                className="w-full text-sm"
                                format="HH:mm"
                                placeholder="Select time"
                                onChange={(time) => {
                                    if (time && scheduledDate) {
                                        const newDate = new Date(scheduledDate);
                                        newDate.setHours(time.hour(), time.minute(), 0, 0);
                                        setScheduledDate(newDate);
                                        form.setFieldsValue({ interviewTime: time });
                                    }
                                }}
                            />
                        </Form.Item>
                    </>
                ) : (
                    /* Desktop: Use Clock Time Picker */
                    <div className="mb-4 sm:mb-6">
                        <Label className="mb-2 block text-sm sm:text-base">Schedule Interview</Label>
                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-10 px-2 sm:px-3 text-xs sm:text-sm",
                                        !scheduledDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                    <span className="truncate">
                                        {scheduledDate ? (
                                            format(scheduledDate, "MMM dd, yyyy - hh:mm a")
                                        ) : (
                                            "Pick a date and time"
                                        )}
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                                className="w-[calc(100vw-2rem)] max-w-[600px] lg:max-w-[700px] p-0 z-[2000]" 
                                align="start"
                                sideOffset={4}
                                side="left"
                            >
                                <div className="flex flex-row divide-x" style={{ maxHeight: '85vh' }}>
                                    <div className="p-3 md:p-4 flex-shrink-0 overflow-y-auto" style={{ maxHeight: '85vh' }}>
                                        <div className="mb-2 font-semibold text-sm md:text-base">Select Date</div>
                                        <div className="flex justify-center">
                                            <Calendar
                                                mode="single"
                                                selected={scheduledDate}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        const newDate = new Date(scheduledDate || new Date());
                                                        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                                        const now = new Date();
                                                        if (startOfDay(newDate).getTime() === startOfDay(now).getTime()) {
                                                            const minTime = new Date(now.getTime() + 60 * 60 * 1000);
                                                            if (newDate.getTime() < minTime.getTime()) {
                                                                newDate.setHours(minTime.getHours(), minTime.getMinutes(), 0, 0);
                                                            }
                                                        }
                                                        setScheduledDate(newDate);
                                                    }
                                                }}
                                                disabled={isDateDisabled}
                                                initialFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 md:p-4 flex-shrink-0 flex flex-col" style={{ maxHeight: '85vh' }}>
                                        <div className="flex-1 overflow-y-auto overflow-x-auto pb-2">
                                            <ClockTimePicker
                                                date={scheduledDate}
                                                setDate={(date) => { if (date) setScheduledDate(date); }}
                                            />
                                        </div>
                                        <div className="mt-4 pt-3 pb-2 flex justify-end flex-shrink-0 bg-white">
                                            <Button 
                                                size="sm" 
                                                className="w-auto text-sm md:text-base" 
                                                onClick={() => setIsPopoverOpen(false)}
                                            >
                                                Set Time
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                <Form.Item
                    name="interviewMode"
                    label={<span className="text-sm sm:text-base">Interview Mode</span>}
                    rules={[{ required: true, message: 'Please select interview mode' }]}
                >
                    <Select 
                        className="text-sm sm:text-base"
                        defaultValue={branch ? 'Direct' : 'Virtual'}
                    >
                        <Select.Option value="Virtual">Virtual</Select.Option>
                        <Select.Option value="Direct">In-Person</Select.Option>
                    </Select>
                    {branch && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Branch location is configured for this round: {branch.name}
                        </p>
                    )}
                </Form.Item>

                {/* Display assigned interviewer from flow (read-only) */}
                <Form.Item
                    label={<span className="text-sm sm:text-base">Assigned Interviewer</span>}
                >
                    <div className="p-3 bg-slate-50 rounded-md border">
                        {interviewer ? (
                            <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm">
                                    {interviewer.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {interviewer.role === 'Employee' && interviewer.subRole 
                                        ? `${interviewer.role} (${interviewer.subRole})` 
                                        : interviewer.role}
                                    {interviewer.email && ` • ${interviewer.email}`}
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground">
                                {flowData ? "No interviewer assigned for this round in the interview flow" : "Loading..."}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Interviewer is assigned from the interview flow configuration. To change, update the interview flow for this job.
                    </p>
                </Form.Item>

                <Form.Item
                    name="notes"
                    label={<span className="text-sm sm:text-base">Notes</span>}
                >
                    <TextArea 
                        rows={3} 
                        className="text-sm sm:text-base"
                        placeholder="Enter any additional notes" 
                    />
                </Form.Item>

                <Form.Item>
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2">
                        <Button 
                            variant="outline" 
                            type="button" 
                            className="w-full sm:w-auto text-sm sm:text-base"
                            onClick={() => {
                                onClose();
                                form.resetFields();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isScheduling}
                            className="w-full sm:w-auto text-sm sm:text-base"
                        >
                            {isScheduling ? "Scheduling..." : "Schedule Interview"}
                        </Button>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ScheduleInterviewModal;
