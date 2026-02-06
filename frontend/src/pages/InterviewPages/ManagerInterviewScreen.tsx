import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import MainLayout from "@/components/MainLayout";
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
import { ArrowLeft, CheckCircle2 } from "lucide-react";
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
  useGetCandidateInterviewResponsesQuery,
} from "@/store/api/interviewResponseApi";
import { useGetCandidateByIdQuery } from "@/store/api/candidateApi";
import { toast } from "sonner";
import { formatDate } from "@/utils/constants";

const ManagerInterviewScreen = () => {
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
    { roundRole: "Manager" },
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

  // Use template from ID if available, otherwise use first Manager template from list
  const templateData = templateId ? templateByIdData : fallbackTemplateData;
  const { data: responseData } = useGetInterviewResponseQuery(
    {
      interviewId: interviewId || "",
      roundNumber: interviewData?.data?.interview?.round || 2,
    },
    { skip: !interviewId || !interviewData }
  );
  const { data: allResponsesData } = useGetCandidateInterviewResponsesQuery(
    typeof interviewData?.data?.interview?.candidateId === "object"
      ? interviewData.data.interview.candidateId._id
      : interviewData?.data?.interview?.candidateId || "",
    { skip: !interviewData }
  );
  const [submitResponse, { isLoading: isSubmitting }] = useSubmitInterviewResponseMutation();

  const interview = interviewData?.data?.interview;
  const candidate = candidateData?.data?.candidate;
  const template = templateData?.data?.template;
  const existingResponse = responseData?.data?.response;
  const allResponses = allResponsesData?.data?.responses || [];

  // Get HR round summary (previous round)
  const hrResponse = allResponses.find((r) => r.roundNumber === 1);

  // Get questions from template (Q&A-only structure)
  const questions = template?.questions || [];

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      responses: [] as any[],
      overallFeedback: "",
      recommendation: "SELECTED" as "SELECTED" | "REJECTED" | "FURTHER_ROUND",
    },
  });

  useEffect(() => {
    if (existingResponse) {
      setValue("responses", existingResponse.responses);
      setValue("overallFeedback", existingResponse.overallFeedback || "");
      setValue("recommendation", existingResponse.finalDecision || existingResponse.recommendation);
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
  const isCompleted = existingResponse?.isCompleted || false;

  const onSubmit = async (data: any) => {
    if (!interviewId) return;


    // Confirmation for Rejection
    if (data.recommendation === "REJECTED") {
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
        recommendation: data.recommendation === "SELECTED" ? "PROCEED" : "REJECT", // Map to API values
      }).unwrap();

      toast.success("Manager interview completed successfully");
      // Navigate to interview progress
      if (candidate?._id) {
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
      <MainLayout>
        <main className="p-4">
          <div className="text-center py-8">Loading interview details...</div>
        </main>
      </MainLayout>
    );
  }

  const candidateName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/candidates")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Manager Interview</h1>
              <p className="text-muted-foreground">
                {interview.stageName || `Stage ${interview.jobStage || interview.round || 2}`} - Manager Interview
              </p>
            </div>
          </div>

          {/* Candidate Info */}
          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Candidate Name</Label>
                  <p className="font-medium">{candidateName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Job Role</Label>
                  <p className="font-medium">{candidate.position || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={isCompleted ? "default" : "secondary"}>
                    {isCompleted ? "Completed" : "In Progress"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HR Round Summary */}
          {hrResponse && (
            <Card>
              <CardHeader>
                <CardTitle>HR Round Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-muted-foreground">Overall Score</Label>
                  <p className="font-semibold">
                    {hrResponse.overallScore?.toFixed(1) || "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Recommendation</Label>
                  <Badge variant={hrResponse.recommendation === "PROCEED" ? "default" : "destructive"}>
                    {hrResponse.recommendation}
                  </Badge>
                </div>
                {hrResponse.overallFeedback && (
                  <div>
                    <Label className="text-muted-foreground">Feedback</Label>
                    <p className="text-sm">{hrResponse.overallFeedback}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manager Interview Questions */}
          {template && questions.length > 0 && (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle>Manager Interview Questions</CardTitle>
                  {template.description && (
                    <Alert>
                      <AlertDescription>{template.description}</AlertDescription>
                    </Alert>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
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

              {/* Final Manager Decision */}
              {!isCompleted && (
                <Card>
                  <CardHeader>
                    <CardTitle>Step 3: Final Manager Decision</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="overallFeedback">Overall Feedback</Label>
                      <Textarea
                        id="overallFeedback"
                        {...register("overallFeedback")}
                        placeholder="Enter overall feedback..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Final Outcome</Label>
                      <RadioGroup
                        value={watch("recommendation")}
                        onValueChange={(value) => setValue("recommendation", value)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="SELECTED" id="selected" />
                          <Label htmlFor="selected" className="font-normal cursor-pointer">
                            Select
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="REJECTED" id="rejected" className="border-red-500 text-red-500" />
                          <Label htmlFor="rejected" className="font-medium cursor-pointer text-red-600">
                            Reject
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Interview Decision"}
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
                        <span className="font-semibold">Manager Round Completed</span>
                      </div>
                      <div>
                        <Label>Overall Score</Label>
                        <p className="text-2xl font-bold">
                          {existingResponse.overallScore?.toFixed(1) || "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label>Final Decision</Label>
                        <Badge
                          variant={
                            existingResponse.finalDecision === "SELECTED"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {existingResponse.finalDecision || existingResponse.recommendation}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </form>
          )}
        </div>
      </main>
    </MainLayout>
  );
};

// Reuse QuestionResponseForm from HRInterviewScreen
const QuestionResponseForm = ({
  question,
  response,
  index,
  register,
  watch,
  setValue,
  errors,
  isReadOnly,
}: any) => {
  const currentResponse = watch(`responses.${index}`) || response;

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">
            {index + 1}. {question.questionText}
            {question.isRequired && <span className="text-red-500"> *</span>}
          </Label>
          {question.evaluationCriteria && (
            <p className="text-sm text-muted-foreground">
              {question.evaluationCriteria}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Answer</Label>
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

        {!isReadOnly && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Score (1-{question.maxScore || 5}, positive integers only)<span className="text-red-500 ml-1">*</span></Label>
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
              <Label>Remarks / Notes</Label>
              <Textarea
                {...register(`responses.${index}.remarks`)}
                placeholder="Additional notes..."
                rows={2}
                defaultValue={currentResponse.remarks || ""}
              />
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register(`responses.${index}.isSatisfactory`)}
              className="rounded"
              defaultChecked={currentResponse.isSatisfactory}
            />
            <Label>Satisfactory</Label>
          </div>
        )}

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

export default ManagerInterviewScreen;

