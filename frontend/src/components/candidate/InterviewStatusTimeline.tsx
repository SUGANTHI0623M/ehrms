import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock, AlertCircle, FileText, UserCheck, Briefcase, XCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import dayjs from 'dayjs';

const InterviewStatusTimeline: React.FC<any> = ({ timeline }) => {
    const navigate = useNavigate();
    const { candidateId } = useParams<{ candidateId: string }>();
    if (!timeline) {
        return <div className="p-4 bg-red-50 text-red-500 rounded border border-red-200">
            Timeline data is missing. Please check backend logs.
        </div>;
    }

    if (!timeline.stages) {
        return <div className="p-4 bg-yellow-50 text-yellow-600 rounded border border-yellow-200">
            Timeline stages are empty.
        </div>;
    }

    const { stages } = timeline;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500 text-white border-green-500';
            case 'active': return 'bg-blue-500 text-white border-blue-500 shadow-lg'; // Active stage
            case 'rejected': return 'bg-red-500 text-white border-red-500';
            case 'failed': return 'bg-red-500 text-white border-red-500';
            default: return 'bg-white text-gray-300 border-gray-200'; // Pending -> grey outline
        }
    };

    const getIcon = (stepId: string) => {
        if (stepId === 'applied') return <FileText className="w-4 h-4" />;
        if (stepId === 'interview_scheduled') return <Clock className="w-4 h-4" />;
        if (stepId.startsWith('round_')) return <UserCheck className="w-4 h-4" />;
        if (stepId === 'generate_offer') return <FileText className="w-4 h-4" />;
        if (stepId === 'document_collection') return <FileText className="w-4 h-4" />; // Or specific icon
        if (stepId === 'background_verification') return <UserCheck className="w-4 h-4" />;
        if (stepId === 'onboarded') return <Briefcase className="w-4 h-4" />;
        return <Circle className="w-4 h-4" />;
    };

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Interview Process
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative flex items-start justify-between w-full px-2 min-w-[800px] overflow-x-auto pb-4 custom-scrollbar">
                    {/* Progress Bar Background */}
                    <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-100 -translate-y-1/2 z-0 mx-8" style={{ width: 'calc(100% - 4rem)' }} />

                    {stages.map((step: any, index: number) => {
                        const isLast = index === stages.length - 1;
                        const isCompleted = step.status === 'completed';
                        const isActive = step.status === 'active';
                        const isRejected = step.status === 'rejected' || step.status === 'failed';

                        // Calculate progress line to next step
                        // If this step is completed, the line to the next step should be colored? 
                        // Usually: if step[i] is completed AND step[i+1] is active/completed, line is green.
                        const nextStep = stages[index + 1];
                        const showLine = !isLast;
                        const isLineActive = isCompleted && (nextStep?.status === 'completed' || nextStep?.status === 'active' || nextStep?.status === 'rejected');

                        // Handle click for actionable steps
                        const handleStepClick = () => {
                            if (step.id === 'generate_offer' && isActive && candidateId) {
                                navigate(`/offer-letter/create?candidateId=${candidateId}`);
                            }
                        };

                        const isClickable = step.id === 'generate_offer' && isActive && candidateId;

                        return (
                            <div 
                                key={step.id} 
                                className={cn(
                                    "flex-1 flex flex-col items-center relative group min-w-[100px] z-10",
                                    isClickable && "cursor-pointer"
                                )}
                                onClick={handleStepClick}
                            >
                                {/* Connector Line Segment */}
                                {showLine && (
                                    <div className={cn(
                                        "absolute top-5 left-1/2 w-full h-[2px] -translate-y-1/2 transition-all duration-500",
                                        isLineActive ? "bg-green-500" : "bg-transparent" // Transparent because we have base gray line, but maybe we want to overlay green
                                    )} style={{ zIndex: -1 }} />
                                )}

                                {/* Timeline Node */}
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 relative bg-white",
                                        getStatusColor(step.status),
                                        isActive ? "scale-110 shadow-lg" : "",
                                        isClickable && "hover:scale-125 hover:shadow-xl"
                                    )}
                                >
                                    {getIcon(step.id)}
                                </div>

                                {/* Content */}
                                <div className="mt-3 text-center px-1 flex flex-col items-center">
                                    <div className={cn(
                                        "font-medium text-xs uppercase tracking-wide mb-0.5",
                                        isActive ? "text-blue-600 font-bold" :
                                            isCompleted ? "text-green-600" :
                                                isRejected ? "text-red-600" : "text-slate-400",
                                        isClickable && "hover:text-blue-700"
                                    )}>
                                        {step.label}
                                    </div>
                                    {step.date && (
                                        <div className="text-[10px] text-slate-400 font-medium">
                                            {dayjs(step.date).format('MMM D')}
                                        </div>
                                    )}
                                    {step.subLabel && step.subLabel !== step.date && (
                                        <div className="text-[10px] text-slate-400 max-w-[120px] truncate">
                                            {step.subLabel}
                                        </div>
                                    )}
                                    {isClickable && (
                                        <div className="text-[10px] text-blue-600 font-medium mt-1">
                                            Click to generate
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default InterviewStatusTimeline;
