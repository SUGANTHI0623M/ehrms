import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAppSelector } from "@/store/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import {
    useGetInterviewByIdQuery,
} from "@/store/api/interviewApi";
import {
    useGetInterviewFlowByJobIdQuery,
} from "@/store/api/interviewTemplateApi";
import {
    useGetInterviewResponseQuery,
    useSubmitInterviewResponseMutation,
} from "@/store/api/interviewResponseApi";
import { useGetCandidateByIdQuery } from "@/store/api/candidateApi";
import { toast } from "sonner";
import { formatDate } from "@/utils/constants";

// Export reusable session component
export const InterviewSession = ({ interviewId }: { interviewId: string }) => {
    const navigate = useNavigate();
    const currentUser = useAppSelector((state) => state.auth.user);

    // Validate interviewId
    useEffect(() => {
        if (interviewId && ["1", "2", "3", "final"].includes(interviewId.toLowerCase())) {
            console.error("Invalid interviewId - this route is reserved for candidate selection, not interview execution");
            toast.error("Invalid interview route.");
        }
    }, [interviewId]);

    const { data: interviewData } = useGetInterviewByIdQuery(interviewId || "", {
        skip: !interviewId || ["1", "2", "3", "final"].includes(interviewId?.toLowerCase() || ""),
    });

    const interview = interviewData?.data?.interview;
    const jobId = interview?.jobOpeningId
        ? (typeof interview.jobOpeningId === 'object' ? interview.jobOpeningId._id : interview.jobOpeningId)
        : null;
    const jobStage = interview?.jobStage || interview?.round || 1;

    // Get InterviewTemplate (Flow) linked to the job
    const { data: interviewFlowData } = useGetInterviewFlowByJobIdQuery(jobId || "", {
        skip: !jobId,
    });

    const { data: candidateData } = useGetCandidateByIdQuery(
        typeof interview?.candidateId === "object"
            ? interview.candidateId._id
            : interview?.candidateId || "",
        { skip: !interview }
    );

    const interviewFlow = interviewFlowData?.data?.flow;
    const flowRounds = interviewFlow?.rounds || [];

    const currentRoundIndex = jobStage - 1;
    const currentRound = flowRounds[currentRoundIndex];

    const isAssigned = currentRound?.assignedInterviewers?.some((id: any) => {
        const interviewerId = typeof id === 'object' ? id._id : id;
        return interviewerId === currentUser?.id;
    }) || false;

    const userRole = currentUser?.role || '';
    const roleMatches = currentRound?.assignedRole === userRole ||
        (currentRound?.assignedRole === 'Recruiter' && (userRole === 'HR' || userRole === 'Senior HR')) ||
        (currentRound?.assignedRole === 'HR' && userRole === 'Senior HR') ||
        userRole === 'Super Admin' ||
        userRole === 'Admin';

    const canAccess = isAssigned || roleMatches;

    const questions = currentRound?.questions || [];

    const { data: responseData } = useGetInterviewResponseQuery(
        {
            interviewId: interviewId || "",
            roundNumber: jobStage,
        },
        { skip: !interviewId }
    );

    const [submitResponse, { isLoading: isSubmitting }] = useSubmitInterviewResponseMutation();

    const candidate = candidateData?.data?.candidate;
    const existingResponse = responseData?.data?.response;

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            responses: [] as any[],
            overallFeedback: "",
            recommendation: "PROCEED" as "PROCEED" | "REJECT" | "HOLD" | "FURTHER_ROUND",
        },
    });

    useEffect(() => {
        if (existingResponse) {
            setValue("responses", existingResponse.responses);
            setValue("overallFeedback", existingResponse.overallFeedback || "");
            setValue("recommendation", existingResponse.recommendation);
        } else if (questions.length > 0) {
            const initialResponses = questions.map((q: any, index: number) => ({
                questionId: q._id || `q-${index}-${q.questionText?.substring(0, 20) || 'question'}`,
                questionText: q.questionText,
                questionType: q.questionType,
                answer: "",
                score: undefined,
                remarks: "",
                isSatisfactory: undefined,
            }));
            setValue("responses", initialResponses);
        }
    }, [questions, existingResponse, setValue]);

    const responses = watch("responses") || [];

    const onSubmit = async (data: any) => {
        if (!interviewId) return;

        const requiredQuestions = questions.filter((q: any) => q.isRequired);

        const missingRequired = requiredQuestions.filter((q: any, index: number) => {
            const response = data.responses.find((r: any) => {
                const qId = q._id?.toString();
                const rId = r.questionId?.toString();
                const qText = q.questionText?.toLowerCase().trim();
                const rText = r.questionText?.toLowerCase().trim();

                if (qId && rId && qId === rId) return true;
                if (qText && rText && qText === rText) return true;
                if (rId && rId.startsWith(`q-${index}-`)) return true;

                return false;
            });
            return !response || !response.answer || response.answer.toString().trim() === '';
        });

        // Validate scores
        const invalidScores = questions.filter((q: any, index: number) => {
            const response = data.responses[index];
            const score = response?.score;
            const maxScore = q.maxScore || 100; // Fallback only if absolutely missing, but ideally it should be present

            if (score === undefined || score === null || score === "") return true; // Missing score
            if (isNaN(Number(score))) return true; // Not a number
            if (Number(score) < 0) return true; // Negative score
            if (Number(score) > maxScore) return true; // Exceeds max
            return false;
        });

        if (invalidScores.length > 0) {
            toast.error(`Please provide valid scores for all questions. Scores must be positive and not exceed the maximum allowed.`);
            return;
        }

        if (missingRequired.length > 0) {
            toast.error(`Please answer all required questions: ${missingRequired.map((q: any) => q.questionText).join(', ')}`);
            return;
        }

        // Confirmation for Reject
        if (data.recommendation === 'REJECT') {
            const confirmed = window.confirm("Are you sure you want to reject this candidate? This action cannot be undone.");
            if (!confirmed) return;
        }

        try {
            const result = await submitResponse({
                interviewId,
                responses: data.responses.map((r: any) => ({
                    questionId: r.questionId,
                    questionText: r.questionText,
                    questionType: r.questionType,
                    answer: r.answer,
                    score: r.score,
                    remarks: r.remarks,
                    isSatisfactory: r.isSatisfactory,
                })),
                overallFeedback: data.overallFeedback,
                recommendation: data.recommendation,
            }).unwrap();

            toast.success(`Round ${jobStage} completed successfully`);

            if (result.data.nextRoundUnlocked && result.data.nextInterview) {
                const nextInterviewId = typeof result.data.nextInterview === 'string'
                    ? result.data.nextInterview
                    : (result.data.nextInterview as any)?._id || result.data.nextInterview;

                toast.info(`Moving to next round...`);
                // Force refresh or navigation
                // If we are in InterviewProgress, this might trigger a re-render if we invalidate tags properly
                // But explicit navigation ensures we load the new ID
                if (window.location.pathname.includes('/progress')) {
                    // If embedded in progress page, refresh data
                    window.location.reload();
                } else if (candidate?._id) {
                    navigate(`/interview/candidate/${candidate._id}/progress`);
                } else {
                    // Fallback
                    navigate("/candidates");
                }
            } else if (result.data.recommendation === 'REJECT') {
                if (candidate?._id) {
                    navigate(`/interview/candidate/${candidate._id}/progress`);
                } else {
                    navigate("/candidates");
                }
            } else {
                // Default fallback
                if (candidate?._id) {
                    navigate(`/interview/candidate/${candidate._id}/progress`);
                } else {
                    navigate("/candidates");
                }
            }
        } catch (error: any) {
            const errorMessage = error?.data?.error?.message || "Failed to submit interview";
            toast.error(errorMessage);

            if (error?.data?.error?.code === 'INTERVIEWER_NOT_ASSIGNED') {
                toast.error("You are not assigned to conduct this round.");
            }
        }
    };

    if (!interview || !candidate) {
        return <div className="text-center py-8">Loading interview details...</div>;
    }

    const isLoadingFlow = !interviewFlowData && jobId;

    if (!isLoadingFlow && questions.length === 0 && !existingResponse && currentRound) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>No interview questions configured for this round.</strong>
                        <br />
                        Please configure questions in the Interview Flow.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (isLoadingFlow) {
        return <div className="text-center py-8">Loading interview questions...</div>;
    }

    // Permission check
    if (!canAccess && currentRound) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        You are not assigned to conduct {currentRound.roundName}.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    const isCompleted = existingResponse?.isCompleted || false;
    const roundName = currentRound?.roundName || interview.stageName || `Round ${jobStage}`;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{roundName}</h1>
                    <p className="text-sm text-muted-foreground">
                        {currentRound?.assignedRole || 'Interview'} Round
                    </p>
                </div>
                <Badge variant={isCompleted ? "default" : "secondary"}>
                    {isCompleted ? "Completed" : "In Progress"}
                </Badge>
            </div>

            {/* Candidate Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Candidate Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Candidate Name</Label>
                            <p className="text-base font-medium">{candidateName}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Job Role Applied For</Label>
                            <p className="text-base font-medium">{candidate.position || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Interview Date</Label>
                            <p className="text-base font-medium">
                                {formatDate(interview.interviewDate)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Round</Label>
                            <p className="text-base font-medium">{roundName}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Questions Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Interview Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {questions.map((question: any, index: number) => {
                            const response = responses[index] || {};
                            return (
                                <QuestionResponseForm
                                    key={question._id || `q-${index}`}
                                    question={question}
                                    response={response}
                                    index={index}
                                    register={register}
                                    watch={watch}
                                    setValue={setValue}
                                    errors={errors}
                                    isReadOnly={isCompleted}
                                />
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Evaluation / Submission */}
                {!isCompleted && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Evaluation & Submission</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label htmlFor="overallFeedback" className="text-sm font-medium">Overall Feedback</Label>
                                <Textarea
                                    id="overallFeedback"
                                    {...register("overallFeedback")}
                                    placeholder="Enter overall feedback..."
                                    rows={4}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Recommendation</Label>
                                <RadioGroup
                                    value={watch("recommendation")}
                                    onValueChange={(value) => setValue("recommendation", value)}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="PROCEED" id="proceed" />
                                        <Label htmlFor="proceed" className="font-normal cursor-pointer">Select</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="REJECT" id="reject" />
                                        <Label htmlFor="reject" className="font-normal cursor-pointer text-red-600 font-semibold">Reject Candidate</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || questions.some((q: any, index: number) => {
                                        const r = responses[index];
                                        const score = r?.score;
                                        const maxScore = q.maxScore || 100;
                                        return score === undefined || score === "" || isNaN(score) || Number(score) > maxScore;
                                    })}
                                    size="lg"
                                >
                                    {isSubmitting ? "Submitting..." : `Submit ${roundName}`}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Completed View */}
                {isCompleted && existingResponse && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="font-semibold">{roundName} Completed</span>
                                </div>
                                <div>
                                    <Label>Overall Score</Label>
                                    <p className="text-2xl font-bold">{existingResponse.overallScore?.toFixed(1) || "N/A"}</p>
                                </div>
                                <div>
                                    <Label>Recommendation</Label>
                                    <Badge variant={existingResponse.recommendation === "PROCEED" ? "default" : "destructive"}>
                                        {existingResponse.recommendation}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </form>
        </div>
    );
};

// Question Response Form Component
interface QuestionResponseFormProps {
    question: any;
    response: any;
    index: number;
    register: any;
    watch: any;
    setValue: any;
    errors: any;
    isReadOnly: boolean;
}

const QuestionResponseForm = ({
    question,
    response,
    index,
    register,
    watch,
    setValue,
    errors,
    isReadOnly,
}: QuestionResponseFormProps) => {
    const currentResponse = watch(`responses.${index}`) || response;

    return (
        <Card className="bg-muted/50 border">
            <CardContent className="pt-6 pb-6 space-y-4">
                <div className="space-y-2">
                    <Label className="text-base font-semibold text-foreground">
                        {index + 1}. {question.questionText}
                        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {question.evaluationCriteria && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {question.evaluationCriteria}
                        </p>
                    )}
                </div>

                {/* Answer Input */}
                <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium">Answer</Label>
                    {question.questionType === "textarea" && (
                        <Textarea
                            {...register(`responses.${index}.answer`)}
                            placeholder="Enter your answer..."
                            rows={4}
                            disabled={isReadOnly}
                            defaultValue={currentResponse.answer || ""}
                        />
                    )}
                    {question.questionType === "text" && (
                        <Input
                            {...register(`responses.${index}.answer`)}
                            placeholder="Enter your answer..."
                            disabled={isReadOnly}
                            defaultValue={currentResponse.answer || ""}
                        />
                    )}
                    {(question.questionType === "dropdown" ||
                        question.questionType === "multiple-choice") && (
                            <Select
                                value={currentResponse.answer || ""}
                                onValueChange={(value) => setValue(`responses.${index}.answer`, value)}
                                disabled={isReadOnly}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                                <SelectContent>
                                    {question.options?.map((opt: string, optIndex: number) => (
                                        <SelectItem key={optIndex} value={opt}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    {question.questionType === "rating" && (
                        <Select
                            value={currentResponse.answer?.toString() || ""}
                            onValueChange={(value) =>
                                setValue(`responses.${index}.answer`, parseInt(value))
                            }
                            disabled={isReadOnly}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: question.maxScore || 5 }, (_, i) => i + 1).map(
                                    (num) => (
                                        <SelectItem key={num} value={num.toString()}>
                                            {num} / {question.maxScore || 5}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Score and Remarks */}
                {!isReadOnly && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Score (1-{question.maxScore}, positive integers only) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                {...register(`responses.${index}.score`, {
                                    valueAsNumber: true,
                                    required: "Score is required",
                                    max: {
                                        value: question.maxScore || 100,
                                        message: `Score cannot exceed ${question.maxScore}`
                                    },
                                    min: {
                                        value: 1,
                                        message: "Score must be a positive number"
                                    },
                                    validate: (value) => {
                                        if (value < 1) return "Score must be at least 1";
                                        if (value > (question.maxScore || 100)) return `Score cannot exceed ${question.maxScore}`;
                                        if (!Number.isInteger(value)) return "Score must be a whole number";
                                        return true;
                                    }
                                })}
                                min={1}
                                max={question.maxScore || 100}
                                step="1"
                                placeholder={`Enter score (Max ${question.maxScore})`}
                                defaultValue={currentResponse.score}
                                onKeyDown={(e) => {
                                    // Prevent negative sign, decimal point, and special characters
                                    if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.' || e.key === ',') {
                                        e.preventDefault();
                                    }
                                }}
                                onChange={(e) => {
                                    // Remove any non-numeric characters except digits
                                    let value = e.target.value.replace(/[^0-9]/g, '');
                                    // Ensure value is positive
                                    if (value && parseInt(value) < 1) {
                                        value = '1';
                                    }
                                    // Ensure value doesn't exceed max
                                    if (value && parseInt(value) > (question.maxScore || 100)) {
                                        value = String(question.maxScore || 100);
                                    }
                                    e.target.value = value;
                                    // Update form value
                                    setValue(`responses.${index}.score`, value ? parseInt(value) : undefined);
                                }}
                                className={`w-full ${errors?.responses?.[index]?.score ? "border-red-500 ring-red-500" : ""}`}
                            />
                            {errors?.responses?.[index]?.score && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.responses[index].score.message}
                                </p>
                            )}
                            {currentResponse.score > (question.maxScore || 100) && (
                                <p className="text-xs text-red-500 mt-1">
                                    Score cannot exceed the maximum score defined for this round
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Remarks / Notes</Label>
                            <Textarea
                                {...register(`responses.${index}.remarks`)}
                                placeholder="Additional notes..."
                                rows={3}
                                defaultValue={currentResponse.remarks || ""}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}

                {/* Validation Checkbox */}
                {!isReadOnly && (
                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            type="checkbox"
                            {...register(`responses.${index}.isSatisfactory`)}
                            className="rounded border-gray-300"
                            defaultChecked={currentResponse.isSatisfactory}
                        />
                        <Label className="text-sm font-normal cursor-pointer">Satisfactory</Label>
                    </div>
                )}

                {/* Display existing response if completed */}
                {isReadOnly && (
                    <div className="space-y-2">
                        <div>
                            <Label className="text-muted-foreground">Answer</Label>
                            <p>{currentResponse.answer || "N/A"}</p>
                        </div>
                        {currentResponse.score !== undefined && (
                            <div>
                                <Label className="text-muted-foreground">Score</Label>
                                <p>{currentResponse.score} / {question.maxScore || 5}</p>
                            </div>
                        )}
                        {currentResponse.remarks && (
                            <div>
                                <Label className="text-muted-foreground">Remarks</Label>
                                <p className="text-sm">{currentResponse.remarks}</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
