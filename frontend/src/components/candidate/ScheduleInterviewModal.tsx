import { useState, useEffect } from "react";
import { Modal, Form, Select, Input, message } from "antd";
import { Button } from "@/components/ui/button";
import { useScheduleInterviewMutation } from "@/store/api/interviewApi";
import { useGetCandidateByIdQuery } from "@/store/api/candidateApi";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import ClockTimePicker from "@/components/ui/clock-time-picker";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

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
    const [scheduleInterview, { isLoading: isScheduling }] = useScheduleInterviewMutation();
    const { data: candidateData } = useGetCandidateByIdQuery(candidateId || "", { skip: !candidateId });
    const candidate = candidateData?.data?.candidate;

    // Combined Date Time State
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setScheduledDate(undefined);
            form.resetFields();
        }
    }, [isOpen, form]);

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
        if (!scheduledDate) {
            message.error("Please select an interview date and time");
            return;
        }

        // Validate that the selected date/time is not in the past
        if (isDateTimeInPast(scheduledDate)) {
            message.error("Please select a future date and time for the interview");
            return;
        }

        try {
            await scheduleInterview({
                candidateId: candidateId,
                data: {
                    interviewType: 'Virtual', // Default value
                    interviewDate: format(scheduledDate, 'yyyy-MM-dd'),
                    interviewTime: format(scheduledDate, 'HH:mm'),
                    interviewMode: values.interviewMode,
                    notes: values.notes,
                    round: roundNumber || 1
                }
            }).unwrap();

            message.success(`Interview scheduled successfully for ${candidateName}`);
            onClose();
            form.resetFields();
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
            width={720}
        >
            <div className="mb-6 bg-slate-50 p-4 rounded-md border">
                <h3 className="text-lg font-semibold mb-2">{candidateName}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <span className="font-medium">Applied For:</span>
                    <span>{candidate?.position || "N/A"}</span>
                </div>
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
                    interviewMode: 'Virtual',
                }}
            >
                <div className="mb-6">
                    <Label className="mb-2 block">Schedule Interview</Label>
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal h-10 px-3",
                                    !scheduledDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduledDate ? (
                                    format(scheduledDate, "MMM dd, yyyy - hh:mm a")
                                ) : (
                                    <span>Pick a date and time</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[2000]" align="start">
                            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
                                <div className="p-4">
                                    <div className="mb-2 font-semibold text-sm">Select Date</div>
                                    <Calendar
                                        mode="single"
                                        selected={scheduledDate}
                                        onSelect={(date) => {
                                            if (date) {
                                                const newDate = new Date(scheduledDate || new Date());
                                                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                                // If selecting today, ensure time is set to at least current time + 1 hour
                                                const now = new Date();
                                                if (startOfDay(newDate).getTime() === startOfDay(now).getTime()) {
                                                    // If today is selected, set minimum time to 1 hour from now
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
                                <div className="p-4">
                                    <ClockTimePicker
                                        date={scheduledDate}
                                        setDate={(date) => { if (date) setScheduledDate(date); }}
                                    />
                                    <div className="mt-4 flex justify-end">
                                        <Button size="sm" onClick={() => setIsPopoverOpen(false)}>
                                            Set Time
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                </div>

                <Form.Item
                    name="interviewMode"
                    label="Interview Mode"
                    rules={[{ required: true, message: 'Please select interview mode' }]}
                >
                    <Select>
                        <Select.Option value="Virtual">Virtual</Select.Option>
                        <Select.Option value="Direct">In-Person</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    name="notes"
                    label="Notes"
                >
                    <TextArea rows={4} placeholder="Enter any additional notes" />
                </Form.Item>

                <Form.Item>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => {
                            onClose();
                            form.resetFields();
                        }}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isScheduling}>
                            {isScheduling ? "Scheduling..." : "Schedule Interview"}
                        </Button>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ScheduleInterviewModal;
