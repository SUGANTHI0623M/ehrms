import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { ArrowLeft, Plus, Trash2, GripVertical, AlertCircle, X } from "lucide-react";
import {
  useGetJobOpeningByIdQuery,
  useGetJobInterviewFlowQuery,
  useSaveJobInterviewFlowMutation,
  useGetAvailableTemplatesForRoundQuery,
} from "@/store/api/jobOpeningApi";
import { useGetUsersQuery } from "@/store/api/userApi";
import { useGetActiveBranchesQuery } from "@/store/api/branchApi";
import { toast } from "sonner";

interface InterviewRound {
  roundNumber: number;
  roundName: string;
  enabled: boolean;
  assignedInterviewers: string[]; // Array of user IDs
  assignedRole?: 'HR' | 'Senior HR' | 'Recruiter' | 'Manager' | 'Admin'; // Auto-derived, read-only
  templateId?: string;
  questions?: Array<{
    questionText: string;
    questionType: 'text' | 'textarea' | 'dropdown' | 'rating' | 'scenario' | 'multiple-choice';
    options?: string[];
    isRequired: boolean;
    maxScore?: number;
  }>;
  maxScore?: number;
  isRequired: boolean;
  branchId?: string;
}

const JobInterviewFlowManagement = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const { data: jobData } = useGetJobOpeningByIdQuery(jobId || "", {
    skip: !jobId,
  });
  const { data: flowData, isLoading: isLoadingFlow } = useGetJobInterviewFlowQuery(jobId || "", {
    skip: !jobId,
  });
  const { data: usersData } = useGetUsersQuery({ 
    limit: 1000,
    isActive: 'true' // Only fetch active users
  });
  const { data: branchesData } = useGetActiveBranchesQuery();
  const [saveFlow, { isLoading: isSaving }] = useSaveJobInterviewFlowMutation();

  const job = jobData?.data?.jobOpening;
  const existingRounds = flowData?.data?.job?.interviewRounds || [];
  const users = usersData?.data?.users || [];
  const branches = branchesData?.data?.branches || [];

  // Debug: Log users to see what we're getting
  useEffect(() => {
    if (users.length > 0) {
      console.log('📋 All users loaded:', users.length);
      console.log('Users with roles:', users.map(u => ({
        name: u.name,
        role: u.role,
        subRole: u.subRole,
        isActive: u.isActive
      })));
      
      // Log users with Employee role
      const employeeUsers = users.filter(u => u.role === 'Employee');
      console.log('👤 Employee users:', employeeUsers.length, employeeUsers.map(u => ({
        name: u.name,
        role: u.role,
        subRole: u.subRole,
        isActive: u.isActive
      })));
    }
  }, [users]);

  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize rounds from existing flow or create default
  useEffect(() => {
    if (existingRounds.length > 0) {
      setRounds(existingRounds.map((r: any) => ({
        roundNumber: r.roundNumber,
        roundName: r.roundName,
        enabled: r.enabled !== false,
        assignedInterviewers: r.assignedInterviewers?.map((id: any) =>
          typeof id === 'object' ? id._id : id
        ) || [],
        assignedRole: r.assignedRole,
        templateId: r.templateId ? (typeof r.templateId === 'object' ? r.templateId._id : r.templateId) : undefined,
        questions: r.questions || [],
        maxScore: r.maxScore,
        isRequired: r.isRequired !== false,
        branchId: r.branchId ? (typeof r.branchId === 'object' ? r.branchId._id : r.branchId) : undefined,
      })));
    } else {
      // Default: 2 rounds
      setRounds([
        {
          roundNumber: 1,
          roundName: "1st Round",
          enabled: true,
          assignedInterviewers: [],
          isRequired: true,
        },
        {
          roundNumber: 2,
          roundName: "2nd Round",
          enabled: true,
          assignedInterviewers: [],
          isRequired: true,
        },
      ]);
    }
  }, [existingRounds]);

  const handleAddRound = () => {
    if (rounds.length >= 4) {
      toast.error("Maximum 4 rounds allowed");
      return;
    }
    const nextRoundNumber = rounds.length + 1;
    const roundNames = ["1st Round", "2nd Round", "3rd Round", "Final Round"];
    setRounds([
      ...rounds,
      {
        roundNumber: nextRoundNumber,
        roundName: roundNames[nextRoundNumber - 1] || `Round ${nextRoundNumber}`,
        enabled: true,
        assignedInterviewers: [],
        isRequired: true,
      },
    ]);
  };

  const handleRemoveRound = (index: number) => {
    if (rounds.length <= 2) {
      toast.error("Minimum 2 rounds required");
      return;
    }
    const newRounds = rounds.filter((_, i) => i !== index);
    // Renumber rounds
    newRounds.forEach((r, i) => {
      r.roundNumber = i + 1;
      const roundNames = ["1st Round", "2nd Round", "3rd Round", "Final Round"];
      r.roundName = roundNames[i] || `Round ${i + 1}`;
    });
    setRounds(newRounds);
  };

  // Auto-derive role from selected interviewers
  const deriveRoleFromInterviewers = (interviewerIds: string[]): 'HR' | 'Senior HR' | 'Recruiter' | 'Manager' | 'Admin' | undefined => {
    if (interviewerIds.length === 0) return undefined;

    // Get roles and subRoles of all selected interviewers
    const effectiveRoles = interviewerIds
      .map(id => {
        const user = users.find(u => u._id === id);
        if (!user) return null;
        
        // For Employee role, use subRole if available, otherwise use role
        if (user.role === 'Employee' && user.subRole) {
          return user.subRole; // 'Senior HR', 'Junior HR', or 'Manager'
        }
        
        // For other roles, use the role directly
        return user.role;
      })
      .filter(Boolean) as string[];

    if (effectiveRoles.length === 0) return undefined;

    // Priority order: Admin > Manager > Senior HR > HR > Recruiter
    // If multiple roles, use the highest priority role
    if (effectiveRoles.some(r => r === 'Admin' || r === 'Super Admin')) return 'Admin';
    if (effectiveRoles.some(r => r === 'Manager')) return 'Manager';
    if (effectiveRoles.some(r => r === 'Senior HR')) return 'Senior HR';
    if (effectiveRoles.some(r => r === 'HR' || r === 'Junior HR')) return 'HR';
    if (effectiveRoles.some(r => r === 'Recruiter')) return 'Recruiter';

    // Default fallback
    return 'HR';
  };

  // Get available interviewers for a specific round (all eligible users are available for all rounds)
  const getAvailableInterviewers = (roundIndex: number) => {
    const availableUsers = users.filter((u) => {
      // Only show active users
      if (!u.isActive) {
        return false;
      }

      // Check if user has interview-related role or is Employee with valid subRole
      const interviewRoles = ['Super Admin', 'Admin', 'Manager', 'HR', 'Senior HR', 'Recruiter'];
      const userRole = u.role || '';
      const isInterviewerRole = interviewRoles.includes(userRole);
      
      // Check if Employee with valid subRole (Junior HR, Senior HR, or Manager)
      const validSubRoles = ['Junior HR', 'Senior HR', 'Manager'];
      const userSubRole = u.subRole || '';
      const isEmployeeWithValidSubRole = userRole === 'Employee' && 
        userSubRole && 
        validSubRoles.includes(userSubRole);

      const hasValidInterviewerRole = isInterviewerRole || isEmployeeWithValidSubRole;

      return hasValidInterviewerRole;
    });

    // Debug logging
    console.log(`🔍 Available interviewers for round ${roundIndex}:`, availableUsers.length);
    console.log('Available users:', availableUsers.map(u => ({
      name: u.name,
      role: u.role,
      subRole: u.subRole,
      isActive: u.isActive,
      _id: u._id
    })));

    return availableUsers;
  };

  const handleRoundChange = (index: number, field: keyof InterviewRound, value: any) => {
    const newRounds = [...rounds];
    (newRounds[index] as any)[field] = value;

    // Auto-derive role when interviewers change
    if (field === 'assignedInterviewers') {
      const derivedRole = deriveRoleFromInterviewers(value);
      newRounds[index].assignedRole = derivedRole;
    }

    setRounds(newRounds);
    // Clear error for this field
    if (errors[`round-${index}-${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`round-${index}-${field}`];
      setErrors(newErrors);
    }
  };

  const handleAddQuestion = (roundIndex: number) => {
    const newRounds = [...rounds];
    if (!newRounds[roundIndex].questions) {
      newRounds[roundIndex].questions = [];
    }
    newRounds[roundIndex].questions!.push({
      questionText: "",
      questionType: "textarea",
      isRequired: true,
      maxScore: 5,
    });
    setRounds(newRounds);
  };

  const handleRemoveQuestion = (roundIndex: number, questionIndex: number) => {
    const newRounds = [...rounds];
    newRounds[roundIndex].questions!.splice(questionIndex, 1);
    setRounds(newRounds);
  };

  const handleQuestionChange = (
    roundIndex: number,
    questionIndex: number,
    field: string,
    value: any
  ) => {
    const newRounds = [...rounds];
    (newRounds[roundIndex].questions![questionIndex] as any)[field] = value;
    setRounds(newRounds);
  };

  const validateRounds = (): boolean => {
    const newErrors: Record<string, string> = {};
    const enabledRounds = rounds.filter((r) => r.enabled);

    if (enabledRounds.length < 2) {
      toast.error("At least 2 rounds must be enabled");
      return false;
    }

    rounds.forEach((round, index) => {
      if (!round.enabled) return;

      if (!round.roundName || round.roundName.trim() === "") {
        newErrors[`round-${index}-roundName`] = "Round name is required";
      }
      if (!round.assignedInterviewers || round.assignedInterviewers.length === 0) {
        newErrors[`round-${index}-assignedInterviewers`] = "At least one interviewer must be assigned";
      }
      if (round.questions && round.questions.length > 0) {
        round.questions.forEach((q, qIndex) => {
          if (!q.questionText || q.questionText.trim() === "") {
            newErrors[`round-${index}-question-${qIndex}-text`] = "Question text is required";
          }
          if ((q.questionType === 'dropdown' || q.questionType === 'multiple-choice') &&
            (!q.options || q.options.length === 0)) {
            newErrors[`round-${index}-question-${qIndex}-options`] = "Options are required for this question type";
          }
        });
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!jobId) return;

    if (!validateRounds()) {
      return;
    }

    try {
      await saveFlow({
        jobId,
        interviewRounds: rounds,
      }).unwrap();

      toast.success("Interview flow saved successfully");
      navigate(`/job-openings/${jobId}`);
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to save interview flow");
    }
  };

  if (isLoadingFlow) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="text-center py-8">Loading interview flow...</div>
        </div>
      </MainLayout>
    );
  }

  if (!job) {
    return (
      <MainLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Job opening not found</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  const enabledRoundsCount = rounds.filter((r) => r.enabled).length;

  return (
    <MainLayout>
      <div className="p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(`/job-openings/${jobId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Configure Interview Flow</h1>
                <p className="text-sm text-muted-foreground">
                  {job.title} • {enabledRoundsCount} round{enabledRoundsCount !== 1 ? 's' : ''} enabled
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Interview Flow"}
            </Button>
          </div>

          {/* Job Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Job Title</Label>
                  <p className="font-semibold text-base">{job.title || "N/A"}</p>
                </div>
                {job.department && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Department</Label>
                    <p className="font-semibold text-base">{job.department}</p>
                  </div>
                )}
                {job.location && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Location</Label>
                    <p className="font-semibold text-base">{job.location}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-muted-foreground">Interview Rounds</Label>
                  <p className="font-semibold text-base">{enabledRoundsCount} round{enabledRoundsCount !== 1 ? 's' : ''} enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure interview rounds for this job. Minimum 2 rounds, maximum 4 rounds.
              Each round can have assigned interviewers, questions, and templates.
            </AlertDescription>
          </Alert>

          {/* Rounds Configuration */}
          <div className="space-y-6">
            {rounds.map((round, index) => (
              <Card key={index} className={!round.enabled ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <CardTitle>Round {round.roundNumber}: {round.roundName}</CardTitle>
                      {!round.enabled && <Badge variant="outline">Disabled</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`enabled-${index}`} className="text-sm">Enabled</Label>
                        <Switch
                          id={`enabled-${index}`}
                          checked={round.enabled}
                          onCheckedChange={(checked) =>
                            handleRoundChange(index, "enabled", checked)
                          }
                        />
                      </div>
                      {rounds.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRound(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Round Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Round Name *</Label>
                      <Input
                        value={round.roundName}
                        onChange={(e) => handleRoundChange(index, "roundName", e.target.value)}
                        placeholder="e.g., 1st Round, Final Round"
                      />
                      {errors[`round-${index}-roundName`] && (
                        <p className="text-sm text-destructive">{errors[`round-${index}-roundName`]}</p>
                      )}
                    </div>
                    {/* Role is auto-derived from interviewers - show as read-only */}
                    {round.assignedInterviewers.length > 0 && (
                      <div className="space-y-2">
                        <Label>Derived Role (Auto)</Label>
                        <div className="px-3 py-2 border rounded-md bg-muted/50">
                          <Badge variant="secondary">
                            {round.assignedRole || 'Not determined'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Automatically derived from selected interviewers
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned Interviewers */}
                  <div className="space-y-2">
                    <Label>Assigned Interviewers *</Label>
                    <Select
                      value={round.assignedInterviewers[0] || ""}
                      onValueChange={(userId) => {
                        // Allow same interviewer to be selected in multiple rounds
                        // Update the round with the selected interviewer
                        handleRoundChange(index, "assignedInterviewers", [userId]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select interviewer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const availableInterviewers = getAvailableInterviewers(index);
                          
                          // If no interviewers available, show a message
                          if (availableInterviewers.length === 0) {
                            return (
                              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                                No available interviewers. Make sure you have users with roles: Admin, Manager, HR, Senior HR, Recruiter, or Employee with subRole (Junior HR, Senior HR, Manager).
                              </div>
                            );
                          }
                          
                          return availableInterviewers.map((user) => {
                            // Display name and role/subRole
                            const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
                            const displayRole = user.role === 'Employee' && user.subRole 
                              ? `${user.role} (${user.subRole})` 
                              : user.role;
                            
                            return (
                              <SelectItem key={user._id} value={user._id}>
                                {displayName} ({displayRole})
                              </SelectItem>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                    {errors[`round-${index}-assignedInterviewers`] && (
                      <p className="text-sm text-destructive">{errors[`round-${index}-assignedInterviewers`]}</p>
                    )}
                  </div>

                  {/* Template Selection */}
                  <RoundTemplateSelector
                    round={round}
                    roundIndex={index}
                    onTemplateChange={(templateId) => handleRoundChange(index, "templateId", templateId)}
                    assignedRole={round.assignedRole}
                  />

                  {/* Round-Specific Questions (Alternative to Template) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Round-Specific Questions (Optional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddQuestion(index)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Question
                      </Button>
                    </div>
                    {round.questions && round.questions.length > 0 && (
                      <div className="space-y-3 mt-2">
                        {round.questions.map((question, qIndex) => (
                          <QuestionEditor
                            key={qIndex}
                            question={question}
                            roundIndex={index}
                            questionIndex={qIndex}
                            onChange={handleQuestionChange}
                            onRemove={() => handleRemoveQuestion(index, qIndex)}
                            error={errors[`round-${index}-question-${qIndex}-text`]}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      If questions are added here, they will be used instead of the template.
                    </p>
                  </div>

                  {/* Additional Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Max Score (Optional)</Label>
                      <Input
                        type="number"
                        value={round.maxScore || ""}
                        onChange={(e) =>
                          handleRoundChange(index, "maxScore", e.target.value ? parseInt(e.target.value) : undefined)
                        }
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Interview Location (Branch)</Label>
                      <Select
                        value={round.branchId || "__none__"}
                        onValueChange={(value) => handleRoundChange(index, "branchId", value === "__none__" ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None (Virtual)</SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch._id} value={branch._id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        checked={round.isRequired}
                        onCheckedChange={(checked) => handleRoundChange(index, "isRequired", checked)}
                      />
                      <Label>Required Round</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Round Button */}
          {rounds.length < 4 && (
            <Button variant="outline" onClick={handleAddRound} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Round ({rounds.length}/4)
            </Button>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving} size="lg">
              {isSaving ? "Saving..." : "Save Interview Flow"}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// Round Template Selector Component
interface RoundTemplateSelectorProps {
  round: InterviewRound;
  roundIndex: number;
  onTemplateChange: (templateId: string | undefined) => void;
  assignedRole: string;
}

const RoundTemplateSelector = ({
  round,
  roundIndex,
  onTemplateChange,
  assignedRole,
}: RoundTemplateSelectorProps) => {
  const { data: templatesData } = useGetAvailableTemplatesForRoundQuery(
    { roundRole: assignedRole },
    { skip: !assignedRole }
  );

  const templates = templatesData?.data?.templates || [];

  return (
    <div className="space-y-2">
      <Label>Interview Template (Optional)</Label>
      <Select
        value={round.templateId || "__none__"}
        onValueChange={(value) => onTemplateChange(value === "__none__" ? undefined : value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select template (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None (Use round-specific questions)</SelectItem>
          {templates.map((template) => (
            <SelectItem key={template._id} value={template._id}>
              {template.templateName} ({template.interviewType})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Select a template for this round, or add round-specific questions below.
      </p>
    </div>
  );
};

// Question Editor Component
interface QuestionEditorProps {
  question: InterviewRound['questions'][0];
  roundIndex: number;
  questionIndex: number;
  onChange: (roundIndex: number, questionIndex: number, field: string, value: any) => void;
  onRemove: () => void;
  error?: string;
}

const QuestionEditor = ({
  question,
  roundIndex,
  questionIndex,
  onChange,
  onRemove,
  error,
}: QuestionEditorProps) => {
  const handleAddOption = () => {
    const currentOptions = question.options || [];
    onChange(roundIndex, questionIndex, "options", [...currentOptions, `Option ${currentOptions.length + 1}`]);
  };

  const handleOptionChange = (optIndex: number, value: string) => {
    const currentOptions = [...(question.options || [])];
    currentOptions[optIndex] = value;
    onChange(roundIndex, questionIndex, "options", currentOptions);
  };

  const handleRemoveOption = (optIndex: number) => {
    const currentOptions = [...(question.options || [])];
    currentOptions.splice(optIndex, 1);
    onChange(roundIndex, questionIndex, "options", currentOptions);
  };

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                value={question.questionText}
                onChange={(e) =>
                  onChange(roundIndex, questionIndex, "questionText", e.target.value)
                }
                placeholder="Enter question..."
                rows={2}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Question Type *</Label>
                <Select
                  value={question.questionType}
                  onValueChange={(value) =>
                    onChange(roundIndex, questionIndex, "questionType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="dropdown">Dropdown</SelectItem>
                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="scenario">Scenario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Score</Label>
                <Input
                  type="number"
                  value={question.maxScore || 5}
                  onChange={(e) =>
                    onChange(roundIndex, questionIndex, "maxScore", parseInt(e.target.value) || 5)
                  }
                  min={1}
                />
              </div>
            </div>
            {(question.questionType === "dropdown" ||
              question.questionType === "multiple-choice") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Options *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddOption}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Option
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(question.options || []).map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(optIndex, e.target.value)}
                          placeholder={`Option ${optIndex + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(optIndex)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {(!question.options || question.options.length === 0) && (
                      <div className="text-sm text-muted-foreground italic">No options added.</div>
                    )}
                  </div>
                </div>
              )}
            <div className="flex items-center gap-2">
              <Switch
                checked={question.isRequired}
                onCheckedChange={(checked) =>
                  onChange(roundIndex, questionIndex, "isRequired", checked)
                }
              />
              <Label>Required Question</Label>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} className="mt-1">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobInterviewFlowManagement;

