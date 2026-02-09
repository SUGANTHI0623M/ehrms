import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X } from "lucide-react";
import {
  useCreateInterviewTemplateMutation,
  useUpdateInterviewTemplateMutation,
  useGetInterviewTemplateByIdQuery,
  type InterviewTemplate,
  type InterviewRound,
  type InterviewQuestion,
} from "@/store/api/interviewTemplateApi";
import { useGetJobOpeningsQuery, useGetJobOpeningByIdQuery } from "@/store/api/jobOpeningApi";
import { useGetUsersQuery } from "@/store/api/userApi";
import { toast } from "sonner";

// Helper function to generate system round names based on index (0-based)
const getRoundName = (index: number): string => {
  if (index === 3) return "Final";
  return `Round ${index + 1}`;
};

const questionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum([
    "text",
    "textarea",
    "dropdown",
    "rating",
    "scenario",
    "multiple-choice",
  ]),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(true),
  scoringType: z.enum(["rating", "pass-fail", "weighted"]).optional(),
  maxScore: z.number().min(1).optional(),
  weight: z.number().min(0).max(10).optional(),
  evaluationCriteria: z.string().optional(),
  redFlags: z.array(z.string()).optional(),
});

const roundSchema = z.object({
  roundName: z.string().optional(), // Optional - backend will compute based on index
  enabled: z.boolean(),
  assignedInterviewers: z.array(z.string()), // No min requirement here - validated conditionally
  questions: z.array(questionSchema), // No min requirement here - validated conditionally
  maxScore: z.number().min(1).optional(),
  isRequired: z.boolean().default(true),
}).superRefine((round, ctx) => {
  // Only validate enabled rounds
  if (!round.enabled) {
    return; // Skip validation for disabled rounds
  }

  // Validate interviewers for enabled rounds
  if (!round.assignedInterviewers || round.assignedInterviewers.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one interviewer is required for enabled rounds",
      path: ["assignedInterviewers"],
    });
  }

  // Validate questions for enabled rounds
  if (!round.questions || round.questions.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one question is required for enabled rounds",
      path: ["questions"],
    });
  }
});

const flowFormSchema = z.object({
  // flowName is auto-generated from jobOpening title

  jobOpeningId: z.string().min(1, "Job opening is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  rounds: z
    .array(roundSchema)
    .min(2, "At least 2 rounds must be enabled")
    .refine(
      (rounds) => {
        const enabledRounds = rounds.filter((r) => r.enabled);
        return enabledRounds.length >= 2 && enabledRounds.length <= 4;
      },
      {
        message: "Between 2 and 4 rounds must be enabled",
      }
    ),
});

type FlowFormData = z.infer<typeof flowFormSchema>;

interface InterviewTemplateFormProps {
  templateId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const InterviewTemplateForm = ({
  templateId,
  onSuccess,
  onCancel,
}: InterviewTemplateFormProps) => {
  const { data: templateData } = useGetInterviewTemplateByIdQuery(templateId || "", {
    skip: !templateId,
  });
  const [createFlow] = useCreateInterviewTemplateMutation();
  const [updateFlow] = useUpdateInterviewTemplateMutation();

  // Get current job opening ID when editing
  const currentJobOpeningId = React.useMemo(() => {
    if (!templateData?.data?.template?.jobOpeningId) return null;
    const jobId = templateData.data.template.jobOpeningId;
    if (typeof jobId === 'string') return jobId;
    return jobId?._id || null;
  }, [templateData]);

  // Check if job is already populated in template data
  const populatedJob = React.useMemo(() => {
    if (!templateData?.data?.template?.jobOpeningId) return null;
    const jobId = templateData.data.template.jobOpeningId;
    if (typeof jobId === 'object' && jobId !== null && 'title' in jobId) {
      return jobId as any;
    }
    return null;
  }, [templateData]);

  // Fetch current job opening when editing (to include it even if not ACTIVE)
  // Only fetch if not already populated in template data
  const { data: currentJobData, isLoading: isLoadingCurrentJob } = useGetJobOpeningByIdQuery(
    currentJobOpeningId || "", 
    {
      skip: !templateId || !currentJobOpeningId || !!populatedJob,
    }
  );

  // Fetch published (ACTIVE) job openings
  const { data: jobsData } = useGetJobOpeningsQuery({
    status: "ACTIVE",
    limit: 100,
  });
  
  // Combine published jobs with current job (when editing) to ensure it's always in the list
  const publishedJobs = React.useMemo(() => {
    const activeJobs = jobsData?.data?.jobOpenings || [];
    
    // If editing, include the current job in the list
    if (templateId) {
      // First check if job is already populated in template data
      if (populatedJob && populatedJob._id) {
        const isAlreadyInList = activeJobs.some(job => job._id === populatedJob._id);
        if (!isAlreadyInList) {
          return [populatedJob, ...activeJobs];
        }
      }
      // Otherwise check if we fetched it separately
      else if (currentJobData?.data?.jobOpening) {
        const currentJob = currentJobData.data.jobOpening;
        const isAlreadyInList = activeJobs.some(job => job._id === currentJob._id);
        if (!isAlreadyInList) {
          return [currentJob, ...activeJobs];
        }
      }
    }
    return activeJobs;
  }, [jobsData, currentJobData, populatedJob, templateId]);

  // Fetch users for interviewer assignment
  const { data: usersData } = useGetUsersQuery({
    limit: 1000,
  });
  const users = usersData?.data?.users || [];
  const interviewerUsers = users.filter(
    (u) => ["Admin", "Manager", "HR", "Senior HR", "Recruiter"].includes(u.role)
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FlowFormData>({
    resolver: zodResolver(flowFormSchema),
    defaultValues: {
      jobOpeningId: "",
      description: "",
      isActive: true,
      rounds: [
        {
          roundName: getRoundName(0), // "Round 1"
          enabled: true,
          assignedInterviewers: [],
          questions: [
            {
              questionText: "",
              questionType: "textarea",
              isRequired: true,
              scoringType: "rating",
              maxScore: 5,
              weight: 1,
            },
          ],
          isRequired: true,
        },
        {
          roundName: getRoundName(1), // "Round 2"
          enabled: true,
          assignedInterviewers: [],
          questions: [
            {
              questionText: "",
              questionType: "textarea",
              isRequired: true,
              scoringType: "rating",
              maxScore: 5,
              weight: 1,
            },
          ],
          isRequired: true,
        },
        {
          roundName: getRoundName(2), // "Round 3"
          enabled: false,
          assignedInterviewers: [],
          questions: [],
          isRequired: false,
        },
        {
          roundName: getRoundName(3), // "Final"
          enabled: false,
          assignedInterviewers: [],
          questions: [],
          isRequired: false,
        },
      ],
    },
  });

  const { fields: roundFields, append: appendRound, remove: removeRound } = useFieldArray({
    control,
    name: "rounds",
  });

  // Populate form when editing - wait for job data to be available
  useEffect(() => {
    if (templateData?.data?.template && templateId) {
      const template = templateData.data.template;
      
      // Get job ID - prefer from populated data or fetched data
      let jobId: string | null = null;
      
      if (populatedJob?._id) {
        jobId = populatedJob._id;
      } else if (currentJobData?.data?.jobOpening?._id) {
        jobId = currentJobData.data.jobOpening._id;
      } else if (currentJobOpeningId) {
        jobId = currentJobOpeningId;
      } else {
        // Fallback: extract from template
        const templateJobId = typeof template.jobOpeningId === 'string' 
          ? template.jobOpeningId 
          : template.jobOpeningId?._id;
        jobId = templateJobId || null;
      }
      
      // Set jobOpeningId once we have a valid ID
      // The job will be in publishedJobs list (we add it above), so we can set it
      if (jobId) {
        const currentValue = watch("jobOpeningId");
        // Only update if the value is different to avoid unnecessary re-renders
        if (currentValue !== jobId) {
          setValue("jobOpeningId", jobId, { shouldValidate: false });
        }
      }
      
      setValue("description", template.description || "");
      setValue("isActive", template.isActive !== undefined ? template.isActive : true);
      if (template.rounds && template.rounds.length > 0) {
        // Ensure round names are system-generated based on index
        const roundsWithSystemNames = template.rounds.map((round: any, index: number) => ({
          ...round,
          roundName: getRoundName(index) // Override with system-generated name
        }));
        setValue("rounds", roundsWithSystemNames);
      }
    }
  }, [templateData, templateId, setValue, publishedJobs, populatedJob, currentJobData, currentJobOpeningId, isLoadingCurrentJob]);

  const onSubmit = async (data: FlowFormData) => {
    console.log("=== Create Interview Flow - onSubmit called ===");
    console.log("Form data:", data);
    try {

      // Validate flow-level required fields
      // If editing and jobOpeningId is missing, try to get it from current data
      let finalJobOpeningId = data.jobOpeningId;
      
      if (!finalJobOpeningId || finalJobOpeningId.trim() === "") {
        if (templateId) {
          // When editing, try to get job ID from loaded data
          if (populatedJob?._id) {
            finalJobOpeningId = populatedJob._id;
          } else if (currentJobData?.data?.jobOpening?._id) {
            finalJobOpeningId = currentJobData.data.jobOpening._id;
          } else if (currentJobOpeningId) {
            finalJobOpeningId = currentJobOpeningId;
          }
        }
        
        if (!finalJobOpeningId || finalJobOpeningId.trim() === "") {
          toast.error("Job opening must be selected");
          return;
        }
      }

      // Filter to only enabled rounds
      const enabledRounds = data.rounds.filter((r) => r.enabled);

      if (enabledRounds.length < 2) {
        toast.error("At least 2 rounds must be enabled");
        return;
      }
      if (enabledRounds.length > 4) {
        toast.error("Maximum 4 rounds allowed");
        return;
      }

      // Validate each enabled round (double-check, though Zod should catch this)
      for (let i = 0; i < enabledRounds.length; i++) {
        const round = enabledRounds[i];
        const roundDisplayName = getRoundName(i);
        if (!round.assignedInterviewers || round.assignedInterviewers.length === 0) {
          toast.error(`${roundDisplayName}: At least one interviewer must be assigned`);
          return;
        }
        if (!round.questions || round.questions.length === 0) {
          toast.error(`${roundDisplayName}: At least one question is required`);
          return;
        }
      }

      // Determine Flow Name based on Job Opening
      const selectedJob = publishedJobs.find(j => j._id === finalJobOpeningId);
      let derivedFlowName = selectedJob?.title;

      // When editing, if job not found in published list (e.g. inactive), try to get from existing template
      if (!derivedFlowName && templateId && templateData?.data?.template) {
        const tmplJob = templateData.data.template.jobOpeningId;
        // Check if jobOpeningId is populated with title
        if (tmplJob && typeof tmplJob === 'object' && 'title' in tmplJob) {
          derivedFlowName = (tmplJob as any).title;
        } else if (currentJobTitle) {
          derivedFlowName = currentJobTitle;
        } else {
          // Ultimate fallback to existing name
          derivedFlowName = templateData.data.template.flowName;
        }
      }

      if (!derivedFlowName) derivedFlowName = "Interview Flow";

      // Build payload - include all rounds (enabled and disabled) as backend expects them
      const payload = {
        flowName: derivedFlowName,
        jobOpeningId: finalJobOpeningId,
        description: data.description?.trim() || undefined,
        isActive: data.isActive !== undefined ? data.isActive : true,
        rounds: data.rounds.map((round, index) => ({
          // roundName is auto-generated by backend based on index, but we send it for reference
          roundName: getRoundName(index),
          enabled: round.enabled,
          assignedInterviewers: round.assignedInterviewers || [],
          // assignedRole is auto-derived from interviewers on backend
          questions: (round.questions || []).map((q) => ({
            questionText: q.questionText.trim(),
            questionType: q.questionType,
            options: q.options && q.options.length > 0 ? q.options : undefined,
            isRequired: q.isRequired !== false,
            scoringType: q.scoringType || undefined,
            maxScore: q.maxScore || undefined,
            weight: q.weight || undefined,
            evaluationCriteria: q.evaluationCriteria?.trim() || undefined,
            redFlags: q.redFlags && q.redFlags.length > 0 ? q.redFlags : undefined,
          })),
          maxScore: round.maxScore || undefined,
          isRequired: round.isRequired !== false,
        })),
      };

      console.log("Create Interview Flow Payload:", payload);

      if (templateId) {
        await updateFlow({ id: templateId, data: payload }).unwrap();
        toast.success("Interview flow updated successfully");
      } else {
        await createFlow(payload).unwrap();
        toast.success("Interview flow created successfully");
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage =
        error?.data?.error?.message ||
        error?.data?.error?.details?.join(", ") ||
        "Failed to save interview flow";
      toast.error(errorMessage);
      console.error("Flow submission error:", error);
    }
  };

  const enabledRoundsCount = watch("rounds")?.filter((r) => r.enabled).length || 0;

  // Handle form validation errors
  const onError = (errors: any) => {
    console.error("Form validation errors:", errors);
    // Show first validation error
    if (errors.jobOpeningId) {
      toast.error(errors.jobOpeningId.message || "Job opening is required");
    } else if (errors.rounds) {
      // Check for round-level errors
      const roundErrors = errors.rounds;
      if (Array.isArray(roundErrors)) {
        for (let i = 0; i < roundErrors.length; i++) {
          const roundError = roundErrors[i];
          if (roundError) {
            if (roundError.assignedInterviewers) {
              toast.error(`${getRoundName(i)}: ${roundError.assignedInterviewers.message}`);
              return;
            }
            if (roundError.questions) {
              toast.error(`${getRoundName(i)}: ${roundError.questions.message}`);
              return;
            }
          }
        }
      }
      if (roundErrors?.message) {
        toast.error(roundErrors.message);
      }
    } else {
      toast.error("Please fix the form errors before submitting");
    }
  };

  // Check if we're still loading job data when editing
  const isJobDataLoading = templateId && !populatedJob && isLoadingCurrentJob;
  
  // Get the current job title for display
  const currentJobTitle = React.useMemo(() => {
    if (populatedJob?.title) return populatedJob.title;
    if (currentJobData?.data?.jobOpening?.title) return currentJobData.data.jobOpening.title;
    return null;
  }, [populatedJob, currentJobData]);

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 pb-4">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">


          <div className="space-y-2">
            <Label htmlFor="jobOpeningId">
              Job Opening <span className="text-red-500">*</span>
            </Label>
            {isJobDataLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Loading job opening...</span>
              </div>
            ) : (
              <Select
                value={watch("jobOpeningId") || ""}
                onValueChange={(value) => setValue("jobOpeningId", value, { shouldValidate: true })}
                disabled={!!templateId} // Disable when editing
              >
                <SelectTrigger id="jobOpeningId">
                  <SelectValue placeholder="Select a published job opening">
                    {(() => {
                      const selectedId = watch("jobOpeningId");
                      if (selectedId && currentJobTitle) {
                        return currentJobTitle;
                      }
                      const selectedJob = publishedJobs.find(j => j._id === selectedId);
                      return selectedJob?.title;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {publishedJobs.map((job) => (
                    <SelectItem key={job._id} value={job._id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.jobOpeningId && (
              <p className="text-sm text-red-500">{errors.jobOpeningId.message}</p>
            )}
            {publishedJobs.length === 0 && !templateId && !isJobDataLoading && (
              <p className="text-sm text-muted-foreground">
                No published job openings available. Please publish a job opening first.
              </p>
            )}
            {templateId && !isJobDataLoading && currentJobTitle && (
              <p className="text-xs text-muted-foreground">
                Current job: {currentJobTitle}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Flow description..."
              rows={3}
            />
          </div>

          {/* Status Toggle - Only show when editing */}
          {templateId && (
            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={watch("isActive")}
                onCheckedChange={(checked) => setValue("isActive", checked)}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Status: <span className="font-medium">{watch("isActive") ? "Active" : "Inactive"}</span>
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interview Rounds Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Interview Rounds Configuration</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Minimum 2 rounds required, maximum 4 rounds allowed. Round 1 & 2 are mandatory.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {roundFields.map((round, roundIndex) => (
              <RoundForm
                key={round.id}
                roundIndex={roundIndex}
                register={register}
                watch={watch}
                setValue={setValue}
                control={control}
                errors={errors.rounds?.[roundIndex]}
                onRemove={() => {
                  // Prevent deleting Round 1 (index 0) and Round 2 (index 1)
                  if (roundIndex < 2) {
                    toast.error("Round 1 and Round 2 cannot be deleted");
                    return;
                  }
                  if (enabledRoundsCount > 2) {
                    removeRound(roundIndex);
                  } else {
                    toast.error("At least 2 rounds must be enabled");
                  }
                }}
                canRemove={roundFields.length > 2 && roundIndex >= 2}
                interviewerUsers={interviewerUsers}
                allAssignedInterviewers={watch("rounds")
                  ?.flatMap((r) => r.assignedInterviewers || [])
                  .filter(Boolean)}
              />
            ))}
          </div>

          {/* Add Round Button */}
          {roundFields.length < 4 && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nextIndex = roundFields.length;
                  appendRound({
                    roundName: getRoundName(nextIndex),
                    enabled: false,
                    assignedInterviewers: [],
                    questions: [],
                    isRequired: false,
                  });
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Round {roundFields.length + 1 === 3 ? "3" : "Final"}
              </Button>
            </div>
          )}

          {errors.rounds && (
            <p className="text-sm text-red-500">{errors.rounds.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t sticky bottom-0 bg-background z-10">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : templateId ? "Update Flow" : "Create Flow"}
        </Button>
      </div>
    </form>
  );
};

// Round Form Component
interface RoundFormProps {
  roundIndex: number;
  register: any;
  watch: any;
  setValue: any;
  control: any;
  errors: any;
  onRemove: () => void;
  canRemove: boolean;
  interviewerUsers: any[];
  allAssignedInterviewers: string[];
}

const RoundForm = ({
  roundIndex,
  register,
  watch,
  setValue,
  control,
  errors,
  onRemove,
  canRemove,
  interviewerUsers,
  allAssignedInterviewers,
}: RoundFormProps) => {
  const round = watch(`rounds.${roundIndex}`);
  const isEnabled = round?.enabled;
  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control,
    name: `rounds.${roundIndex}.questions`,
  });

  const selectedInterviewers = round?.assignedInterviewers || [];
  const selectedInterviewerId = selectedInterviewers.length > 0 ? selectedInterviewers[0] : "";

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Label>Round Name</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm font-medium px-3 py-1.5">
                    {getRoundName(roundIndex)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    (System-generated, cannot be changed)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) =>
                    setValue(`rounds.${roundIndex}.enabled`, checked)
                  }
                />
                <Label>Enabled</Label>
              </div>
            </div>

            {isEnabled && (
              <>
                <div className="space-y-2">
                  <Label>
                    Assigned Interviewer <span className="text-red-500">*</span> <span className="text-xs text-muted-foreground">(Single selection)</span>
                  </Label>
                  <Select
                    value={selectedInterviewerId}
                    onValueChange={(userId) => {
                      // Use replacement logic (Single Select)
                      setValue(`rounds.${roundIndex}.assignedInterviewers`, [userId]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select interviewer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {interviewerUsers
                        .filter((u) =>
                          // Include if not used elsewhere OR if it's the current selection for this round
                          !allAssignedInterviewers.includes(u._id) || selectedInterviewers.includes(u._id)
                        )
                        .map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* Validation Error */}
                  {errors?.assignedInterviewers && (
                    <p className="text-sm text-red-500">
                      {errors.assignedInterviewers.message}
                    </p>
                  )}

                  {/* Role is automatically derived from selected interviewers on the backend */}
                  {selectedInterviewers.length > 0 && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        Role will be set to: {interviewerUsers.find(u => u._id === selectedInterviewerId)?.role || 'Unknown'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      Questions <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendQuestion({
                          questionText: "",
                          questionType: "textarea",
                          isRequired: true,
                          scoringType: "rating",
                          maxScore: 5,
                          weight: 1,
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Question
                    </Button>
                  </div>

                  {questionFields.map((question, questionIndex) => (
                    <QuestionForm
                      key={question.id}
                      roundIndex={roundIndex}
                      questionIndex={questionIndex}
                      register={register}
                      watch={watch}
                      setValue={setValue}
                      errors={errors?.questions?.[questionIndex]}
                      onRemove={() => removeQuestion(questionIndex)}
                      canRemove={questionFields.length > 1}
                    />
                  ))}
                  {errors?.questions && (
                    <p className="text-sm text-red-500">{errors.questions.message}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {canRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


// Question Form Component
interface QuestionFormProps {
  roundIndex: number;
  questionIndex: number;
  register: any;
  watch: any;
  setValue: any;
  errors: any;
  onRemove: () => void;
  canRemove: boolean;
}

const QuestionForm = ({
  roundIndex,
  questionIndex,
  register,
  watch,
  setValue,
  errors,
  onRemove,
  canRemove,
}: QuestionFormProps) => {
  // Use specific field watch to avoid re-rendering entire form on every keystroke, 
  // but here we need questionType and options.
  // Note: Watching the entire question object might be heavy, but it's safe for this scale.
  const questionPath = `rounds.${roundIndex}.questions.${questionIndex}`;
  const questionType = watch(`${questionPath}.questionType`);
  const options = watch(`${questionPath}.options`);
  const maxScore = watch(`${questionPath}.maxScore`);

  return (
    <Card className="bg-background/50 border ml-4">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label>
                Question Text <span className="text-red-500">*</span>
              </Label>
              <Textarea
                {...register(`${questionPath}.questionText`)}
                placeholder="Enter question..."
                rows={2}
              />
              {errors?.questionText && (
                <p className="text-sm text-red-500">{errors.questionText.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={questionType || "textarea"}
                  onValueChange={(value) =>
                    setValue(`${questionPath}.questionType`, value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="dropdown">Dropdown</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="scenario">Scenario</SelectItem>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max Score</Label>
                <Input
                  type="number"
                  {...register(`${questionPath}.maxScore`, {
                    valueAsNumber: true,
                    min: { value: 1, message: "Score must be at least 1" },
                    required: "Max score is required"
                  })}
                  min={1}
                  placeholder="5"
                />
                {errors?.maxScore && (
                  <p className="text-sm text-red-500">{errors.maxScore.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  {...register(`${questionPath}.isRequired`)}
                  className="rounded"
                  defaultChecked={true}
                />
                <Label>Required</Label>
              </div>
            </div>

            {(questionType === "dropdown" || questionType === "multiple-choice") && (
              <div className="space-y-2">
                <Label>
                  Options (one per line) <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={3}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const newOptions = rawValue
                      .split("\n")
                      .map((opt) => opt.trim())
                      .filter((opt) => opt.length > 0);

                    // Update options array
                    setValue(`${questionPath}.options`, newOptions, {
                      shouldValidate: true,
                      shouldDirty: true
                    });
                  }}
                  // Display from watch, but fallback to empty string
                  // We join by newline for the textarea display
                  defaultValue={options?.join("\n") || ""}
                />
                <p className="text-xs text-muted-foreground">
                  Enter each option on a new line.
                </p>
                {errors?.options && (
                  <p className="text-sm text-red-500">{errors.options.message}</p>
                )}
              </div>
            )}
          </div>

          {canRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InterviewTemplateForm;
