import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
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
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import {
  useGetInterviewByIdQuery,
} from "@/store/api/interviewApi";
import {
  useGetInterviewTemplateByIdQuery,
} from "@/store/api/interviewTemplateApi";
import {
  useGetAvailableTemplatesForRoundQuery,
} from "@/store/api/jobOpeningApi";
import {
  useGetInterviewResponseQuery,
  useSubmitInterviewResponseMutation,
} from "@/store/api/interviewResponseApi";
import { useGetCandidateByIdQuery } from "@/store/api/candidateApi";
import { toast } from "sonner";
import { formatDate } from "@/utils/constants";

const HRInterviewScreen = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();

  const { data: interviewData } = useGetInterviewByIdQuery(interviewId || "", {
    skip: !interviewId,
  });
  const { data: candidateData } = useGetCandidateByIdQuery(
    typeof interviewData?.data?.interview?.candidateId === "object"
      ? interviewData.data.interview.candidateId._id
      : interviewData?.data?.interview?.candidateId || "",
    { skip: !interviewData }
  );

  // Get template ID from interview or job stage
  const templateId = interviewData?.data?.interview?.templateId ||
    (typeof interviewData?.data?.interview?.templateId === 'object'
      ? interviewData.data.interview.templateId._id
      : null);

  // Fetch template by ID if available, otherwise fetch by interview type
  const { data: templateByIdData } = useGetInterviewTemplateByIdQuery(templateId || "", {
    skip: !templateId,
  });
  const { data: templatesByTypeData } = useGetAvailableTemplatesForRoundQuery(
    { roundRole: "HR" },
    {
      skip: !!templateId, // Skip if we have a template ID
    }
  );

  // Get the first template ID from the list if no templateId is provided
  const fallbackTemplateId = !templateId && templatesByTypeData?.data?.templates?.[0]?._id;
  
  // Fetch full template details for fallback template
  const { data: fallbackTemplateData } = useGetInterviewTemplateByIdQuery(fallbackTemplateId || "", {
    skip: !fallbackTemplateId || !!templateId,
  });

  // Use template from ID if available, otherwise use first HR template from list
  const templateData = templateId ? templateByIdData : fallbackTemplateData;
  const { data: responseData } = useGetInterviewResponseQuery(
    {
      interviewId: interviewId || "",
      roundNumber: 1,
    },
    { skip: !interviewId }
  );
  const [submitResponse, { isLoading: isSubmitting }] = useSubmitInterviewResponseMutation();

  const interview = interviewData?.data?.interview;
  const candidate = candidateData?.data?.candidate;
  const template = templateData?.data?.template;
  const existingResponse = responseData?.data?.response;

  // Get questions from template (Q&A-only structure)
  const questions = template?.questions || [];

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      responses: [] as any[],
      overallFeedback: "",
      recommendation: "PROCEED" as "PROCEED" | "REJECT" | "HOLD",
    },
  });

  // Initialize form with existing response or template questions
  useEffect(() => {
    if (existingResponse) {
      setValue("responses", existingResponse.responses);
      setValue("overallFeedback", existingResponse.overallFeedback || "");
      setValue("recommendation", existingResponse.recommendation);
    } else if (questions.length > 0) {
      const initialResponses = questions.map((q: any) => ({
        questionId: q._id,
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


    // Confirmation for Rejection
    if (data.recommendation === "REJECT") {
      if (!window.confirm("Are you sure you want to REJECT this candidate? This action cannot be undone.")) {
        return;
      }
    }

    try {
      await submitResponse({
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

      toast.success("HR interview completed successfully");
      // Navigate to interview progress or manager round if approved
      if (data.recommendation === "PROCEED" && candidate?._id) {
        navigate(`/interview/candidate/${candidate._id}/progress`);
      } else {
        navigate("/candidates");
      }
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to submit interview");
    }
  };

  if (!interview || !candidate) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading interview details...</div>
      </div>
    );
  }

  const candidateName = `${candidate.firstName} ${candidate.lastName}`;
  const isCompleted = existingResponse?.isCompleted || false;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/interview/create/hr")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">HR Interview</h1>
              <p className="text-sm text-muted-foreground">
                {interview.stageName || "HR Interview Round"}
              </p>
            </div>
          </div>
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
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div>
                  <Badge variant={isCompleted ? "default" : "secondary"} className="mt-1">
                    {isCompleted ? "Completed" : "In Progress"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Loading Message */}
        {!template && (
          <Card>
            <CardHeader>
              <CardTitle>Loading Interview Template</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please wait while we load the interview template...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Interview Questions */}
        {template && questions.length > 0 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interview Questions</CardTitle>
                {interview.stageName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Stage: {interview.stageName}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {questions.map((question: any, index: number) => {
                  const response = responses[index] || {};
                  return (
                    <QuestionResponseForm
                      key={question._id || index}
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

            {/* HR Validation */}
            {!isCompleted && (
              <Card>
                <CardHeader>
                  <CardTitle>HR Validation & Submission</CardTitle>
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
                    <Label className="text-sm font-medium">HR Recommendation</Label>
                    <RadioGroup
                      value={watch("recommendation")}
                      onValueChange={(value) => setValue("recommendation", value)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PROCEED" id="proceed" />
                        <Label htmlFor="proceed" className="font-normal cursor-pointer">
                          Select (Proceed to Next Round)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="REJECT" id="reject" className="border-red-500 text-red-500" />
                        <Label htmlFor="reject" className="font-medium cursor-pointer text-red-600">
                          Reject Candidate
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={isSubmitting} size="lg">
                      {isSubmitting ? "Submitting..." : "Submit HR Round"}
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
                      <span className="font-semibold">HR Round Completed</span>
                    </div>
                    <div>
                      <Label>Overall Score</Label>
                      <p className="text-2xl font-bold">
                        {existingResponse.overallScore?.toFixed(1) || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label>Recommendation</Label>
                      <Badge
                        variant={
                          existingResponse.recommendation === "PROCEED"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {existingResponse.recommendation}
                      </Badge>
                    </div>
                    {existingResponse.overallFeedback && (
                      <div>
                        <Label>Feedback</Label>
                        <p className="text-sm">{existingResponse.overallFeedback}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        )}

        {/* Empty State */}
        {template && questions.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">
                No questions found in this interview template.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
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
              <Label className="text-sm font-medium">Score (1-{question.maxScore || 5}, positive integers only)<span className="text-red-500 ml-1">*</span></Label>
              <Input
                type="number"
                {...register(`responses.${index}.score`, {
                  valueAsNumber: true,
                  required: "Score is required",
                  min: { value: 1, message: "Score must be a positive number" },
                  max: { value: question.maxScore || 5, message: `Max score is ${question.maxScore || 5}` },
                  validate: (value) => {
                                    if (value < 1) return "Score must be at least 1";
                                    if (value > (question.maxScore || 5)) return `Score cannot exceed ${question.maxScore || 5}`;
                                    if (!Number.isInteger(value)) return "Score must be a whole number";
                                    return true;
                                }
                })}
                min={1}
                max={question.maxScore || 5}
                step="1"
                placeholder="Enter score"
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
                                    if (value && parseInt(value) > (question.maxScore || 5)) {
                                        value = String(question.maxScore || 5);
                                    }
                                    e.target.value = value;
                                    // Update form value
                                    setValue(`responses.${index}.score`, value ? parseInt(value) : undefined);
                                }}
                className={`w-full ${errors?.responses?.[index]?.score ? "border-red-500" : ""}`}
              />
              {errors?.responses?.[index]?.score && (
                <p className="text-xs text-red-500 mt-1">{errors.responses[index].score.message}</p>
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

export default HRInterviewScreen;

