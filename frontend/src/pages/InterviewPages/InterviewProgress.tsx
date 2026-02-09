import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Clock,
  User,
  Mail,
  Phone,
  Briefcase,
  FileText,
  AlertCircle,
  Lock,
  Circle,
  Upload,
  Eye
} from "lucide-react";

const getStatusIcon = (isCompleted: boolean, status: string) => {
  if (status === "REJECTED") {
    return <AlertCircle className="h-6 w-6 text-destructive" />;
  }
  if (isCompleted) {
    return <CheckCircle2 className="h-6 w-6 text-green-500" />;
  }
  if (status === "IN_PROGRESS") {
    return <Clock className="h-6 w-6 text-blue-500 animate-pulse" />;
  }
  if (status === "SCHEDULED") {
    return <Clock className="h-6 w-6 text-orange-500" />;
  }
  return <Circle className="h-6 w-6 text-muted-foreground" />;
};

const getStatusBadge = (isCompleted: boolean, status: string) => {
  if (status === "REJECTED") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  if (isCompleted) {
    return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>;
  }
  if (status === "IN_PROGRESS") {
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">In Progress</Badge>;
  }
  if (status === "SCHEDULED") {
    return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">Scheduled</Badge>;
  }
  return <Badge variant="outline">Pending</Badge>;
};
import {
  useGetInterviewProgressQuery,
} from "@/store/api/interviewResponseApi";
import { useGetCandidateByIdQuery, useRejectCandidateMutation, useUploadCandidateDocumentMutation } from "@/store/api/candidateApi";
import { useGetJobOpeningByIdQuery, useGetJobInterviewFlowQuery } from "@/store/api/jobOpeningApi";
import { useGetInterviewFlowByJobIdQuery } from "@/store/api/interviewTemplateApi";
import { useGetCandidateInterviewsQuery } from "@/store/api/interviewApi";
import { useGetOfferByCandidateIdQuery } from "@/store/api/offerApi";
import { useGetBackgroundVerificationDetailsQuery } from "@/store/api/backgroundVerificationApi";
import { formatDate, formatCandidateStatus } from "@/utils/constants";
import { isValidObjectId } from "@/utils/helpers";
import { toast } from "sonner";
import { InterviewSession } from "./InterviewSession";
import InterviewStatusTimeline from "@/components/candidate/InterviewStatusTimeline";

const InterviewProgress = () => {
  const { candidateId: candidateIdParam } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);

  // State for modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");

  // Onboarding Modal State
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  // Logs Modal State
  const [logsRound, setLogsRound] = useState<any>(null);

  // Mock Onboarding Documents (since real onboarding might not exist yet)
  const requiredDocuments = [
    { _id: "doc1", name: "Personal Information Form", required: true, status: "NOT_STARTED" },
    { _id: "doc2", name: "Bank Account Details", required: true, status: "NOT_STARTED" },
    { _id: "doc3", name: "PAN Card Copy", required: true, status: "NOT_STARTED" },
    { _id: "doc4", name: "Aadhar Card Copy", required: true, status: "NOT_STARTED" },
    { _id: "doc5", name: "Educational Certificates", required: true, status: "NOT_STARTED" },
    { _id: "doc6", name: "Previous Employment Proof", required: false, status: "NOT_STARTED" },
  ];

  // Validate candidateId from URL params
  const candidateId = candidateIdParam && isValidObjectId(candidateIdParam)
    ? candidateIdParam
    : null;

  // Redirect if invalid candidateId
  useEffect(() => {
    if (candidateIdParam && !candidateId) {
      toast.error("Invalid candidate ID in URL");
      navigate("/candidates");
    }
  }, [candidateIdParam, candidateId, navigate]);

  const [searchParams] = useSearchParams();
  const interviewId = searchParams.get("interviewId");

  const { data: progressData, isLoading } = useGetInterviewProgressQuery(
    candidateId ? { candidateId, interviewId: interviewId || undefined } : "",
    { skip: !candidateId }
  );


  const { data: candidateData, refetch: refetchCandidate } = useGetCandidateByIdQuery(candidateId || "", {
    skip: !candidateId,
  });

  const { data: interviewsData } = useGetCandidateInterviewsQuery(candidateId || "", { skip: !candidateId });
  const candidateStatus = candidateData?.data?.candidate?.status;
  const isHired = candidateStatus === "HIRED";
  const { data: offerData } = useGetOfferByCandidateIdQuery(candidateId || "", { 
    skip: !candidateId || isHired 
  });
  // Only fetch BV details if candidate is in eligible status
  const isBVEligible = candidateStatus === "OFFER_ACCEPTED" || candidateStatus === "HIRED";

  const { data: bgvData } = useGetBackgroundVerificationDetailsQuery(candidateId || "", {
    skip: !candidateId || !isBVEligible
  });



  // Get job interview flow to show all rounds
  const jobId = candidateData?.data?.candidate?.jobId
    ? (typeof candidateData.data.candidate.jobId === 'object'
      ? candidateData.data.candidate.jobId._id
      : candidateData.data.candidate.jobId)
    : null;

  const { data: jobOpeningData } = useGetJobOpeningByIdQuery(jobId || "", { skip: !jobId });

  // Get Interview Flow (InterviewTemplate) - primary source of truth
  const { data: interviewFlowData } = useGetInterviewFlowByJobIdQuery(jobId || "", {
    skip: !jobId,
  });

  // Fallback to job interviewRounds if Interview Flow doesn't exist
  const { data: jobFlowData } = useGetJobInterviewFlowQuery(jobId || "", {
    skip: !jobId || !!interviewFlowData?.data?.flow,
  });

  // Get rounds from Interview Flow (preferred) or job interviewRounds (fallback)
  const interviewFlow = interviewFlowData?.data?.flow;
  const flowRounds = interviewFlow?.rounds || [];
  const jobRounds = jobFlowData?.data?.job?.interviewRounds || [];

  // Use Interview Flow rounds if available, otherwise use job rounds
  const rawRounds = flowRounds.length > 0 ? flowRounds : jobRounds;

  // Create a safe copy of rounds with roundNumber injected if missing (crucial for Template rounds)
  const allRounds = rawRounds.map((r: any, index: number) => ({
    ...r,
    roundNumber: r.roundNumber || (index + 1)
  }));

  const enabledRounds = allRounds
    .filter((r: any) => r.enabled !== false)
    .sort((a: any, b: any) => a.roundNumber - b.roundNumber);

  const isPrivileged = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || currentUser?.role === 'Senior HR';

  const visibleRounds = enabledRounds.filter((roundConfig: any) => {
    // If restricted user and specific interview requested, show only that round
    if (!isPrivileged && interviewId) {
      const roundProgress = progress.find((p) => p.round === roundConfig.roundNumber);
      return roundProgress && roundProgress.interviewId === interviewId;
    }
    return true;
  });

  const [rejectCandidate, { isLoading: isRejecting }] = useRejectCandidateMutation();

  const candidate = candidateData?.data?.candidate;
  const progress = progressData?.data?.progress || [];
  const interviews = interviewsData?.data?.interviews || [];

  const handleRejectCandidate = async () => {
    if (!candidateId || !rejectionReason.trim()) return;

    try {
      await rejectCandidate({
        candidateId: candidateId,
        rejectionReason: rejectionReason,
        notes: rejectionNotes
      }).unwrap();

      toast.success("Candidate rejected successfully");
      setRejectModalOpen(false);
      navigate("/candidates");
    } catch (error) {
      toast.error("Failed to reject candidate");
      console.error(error);
    }
  };

  const [uploadCandidateDocument] = useUploadCandidateDocumentMutation();

  const handleDocumentUpload = async (documentType: string, file: File) => {
    if (!candidateId) {
      toast.error("Candidate ID not found");
      return;
    }

    setUploadingDocId(documentType);

    try {
      await uploadCandidateDocument({
        candidateId,
        documentType,
        file
      }).unwrap();

      toast.success("Document uploaded successfully");
      refetchCandidate();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error?.data?.error?.message || "Failed to upload document");
    } finally {
      setUploadingDocId(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="text-center py-8">Loading progress...</div>
        </main>
      </MainLayout>
    );
  }

  if (!candidateId) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="text-center py-8 text-muted-foreground">
            Invalid candidate ID. Please select a valid candidate.
          </div>
        </main>
      </MainLayout>
    );
  }

  if (!candidate || !progressData) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="text-center py-8 text-muted-foreground">
            Candidate or progress data not found
          </div>
        </main>
      </MainLayout>
    );
  }



  const isHR = currentUser?.role === "HR" || currentUser?.role === "Senior HR" || currentUser?.role === "Admin" || currentUser?.role === "Super Admin";
  const isManager = currentUser?.role === "Manager" || currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Interview Progress</h1>
              <p className="text-muted-foreground">
                Track and manage candidate interview process
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Generate Offer Letter button for SELECTED candidates - Hide if HIRED or hired for other job */}
              {(isHR || isManager) && candidate.status === 'SELECTED' && !isHired && !candidate?.hiredForOtherJob && (
                <Button
                  onClick={() => navigate(`/offer-letter/create?candidateId=${candidateId}`)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Offer Letter
                </Button>
              )}
              {/* Bug Fix #1: Upload Documents button should only appear after offer acceptance - Hide if HIRED or hired for other job */}
              {(isHR || isManager) && candidate.status === 'OFFER_ACCEPTED' && !isHired && !candidate?.hiredForOtherJob && (
                <Button
                  onClick={() => setIsOnboardingModalOpen(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/candidates")}>
                Back to Candidates
              </Button>
            </div>
          </div>

          {/* HIRED Status Message */}
          {isHired && (
            <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                      Candidate Converted to Employee
                    </h3>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      This candidate has been successfully converted to an employee. 
                      Offer letter and onboarding details are no longer available for this candidate.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* HIRED for Other Job Warning */}
          {candidate?.hiredForOtherJob && !isHired && (
            <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                      Candidate Already Hired for Another Job
                    </h3>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      This candidate has already been hired and converted to an employee for <strong>{candidate.hiredForOtherJob.jobTitle}</strong>. 
                      They cannot proceed with the interview process for this job. Please contact HR if this is an error.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 1️⃣ Candidate Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Candidate Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-semibold">
                        {candidate.firstName} {candidate.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold">{candidate.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold">{candidate.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Position Applied</p>
                      <p className="font-semibold">{candidate.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Candidate Source</p>
                      <p className="font-semibold">{candidate.source || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Current Status</p>
                    <Badge
                      variant={
                        candidate.status === "SELECTED"
                          ? "default"
                          : candidate.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {formatCandidateStatus(candidate.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2️⃣ Interview Status Timeline */}
          <InterviewStatusTimeline
            timeline={progressData?.data?.timeline}
          />

          {/* Bug Fix #2: Interview Actions section removed entirely - this is a tracking page, not an action page */}
          {/* Rejection should happen during active interview rounds, not on the progress page */}

          {/* Rounds Timeline - Round-Based */}
          <Card>
            <CardHeader>
              <CardTitle>Interview Rounds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {visibleRounds.length > 0 ? (
                  visibleRounds.map((roundConfig: any) => {
                    // Find corresponding progress for this round
                    const roundProgress = progress.find((p) => p.round === roundConfig.roundNumber);

                    // DEBUG: Log round matching
                    console.log(`[InterviewProgress] Round ${roundConfig.roundNumber}:`, {
                      roundConfig,
                      roundProgress,
                      allProgress: progress,
                      isCompleted: roundProgress?.isCompleted,
                      status: roundProgress?.status
                    });

                    const isCompleted = roundProgress?.isCompleted || false;
                    const isLocked = roundConfig.roundNumber > 1 &&
                      !progress.some((p) => p.round === roundConfig.roundNumber - 1 && p.isCompleted && p.recommendation === "PROCEED");


                    // Check if user can access this round
                    const canAccess = roundProgress?.canAccess ||
                      (currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') ||
                      (roundConfig.assignedInterviewers?.some((id: any) => {
                        const interviewerId = typeof id === 'object' ? id._id : id;
                        return interviewerId === currentUser?.id;
                      }));

                    return (
                      <div
                        key={roundConfig.roundNumber}
                        className={`flex items-start gap-4 p-4 border rounded-lg ${isLocked ? 'opacity-60' : ''
                          }`}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {isLocked ? (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            getStatusIcon(isCompleted, roundProgress?.status || "PENDING")
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{roundConfig.roundName}</h3>
                              <p className="text-sm text-muted-foreground">
                                Round {roundConfig.roundNumber} - {roundConfig.assignedRole || "Interview"} Round
                                {roundConfig.assignedInterviewers && roundConfig.assignedInterviewers.length > 0 && (
                                  <span className="ml-2">
                                    • {roundConfig.assignedInterviewers.length} interviewer{roundConfig.assignedInterviewers.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Bug Fix #3: Completed rounds should not show as Pending */}
                              {isLocked ? (
                                <Badge variant="outline">Locked</Badge>
                              ) : isCompleted ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLogsRound(roundProgress)}
                                    className="h-8"
                                  >
                                    <FileText className="w-3 h-3 mr-2" />
                                    View Logs
                                  </Button>
                                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
                                </>
                              ) : (
                                getStatusBadge(false, roundProgress?.status || "PENDING")
                              )}
                            </div>
                          </div>

                          {/* Bug Fix #4: Show interview logs and answers for completed rounds */}
                          {isCompleted && roundProgress && (
                            <div className="space-y-4 mt-4">
                              {/* Summary Stats */}
                              <div className="grid grid-cols-2 gap-4 text-sm p-3 bg-muted/50 rounded-lg">
                                {roundProgress.overallScore !== undefined && (
                                  <div>
                                    <span className="text-muted-foreground">Score: </span>
                                    <span className="font-semibold">
                                      {roundProgress.overallScore.toFixed(1)}
                                    </span>
                                  </div>
                                )}
                                {roundProgress.recommendation && (
                                  <div>
                                    <span className="text-muted-foreground">Recommendation: </span>
                                    <Badge
                                      variant={
                                        roundProgress.recommendation === "PROCEED"
                                          ? "default"
                                          : "destructive"
                                      }
                                      className="ml-2"
                                    >
                                      {roundProgress.recommendation}
                                    </Badge>
                                  </div>
                                )}
                                {roundProgress.completedAt && (
                                  <div>
                                    <span className="text-muted-foreground">Completed: </span>
                                    <span>{formatDate(roundProgress.completedAt)}</span>
                                  </div>
                                )}
                                {roundProgress.interviewer && (
                                  <div>
                                    <span className="text-muted-foreground">Interviewer: </span>
                                    <span>{roundProgress.interviewer}</span>
                                  </div>
                                )}
                              </div>

                              {/* Interview Logs moved to Modal */}

                              {/* Overall Remarks */}
                              {roundProgress.remarks && (
                                <div className="p-3 border rounded-lg bg-muted/30">
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Overall Remarks:</p>
                                  <p className="text-sm">{roundProgress.remarks}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {isLocked && (
                            <p className="text-sm text-muted-foreground">
                              This round will unlock after the previous round is completed and approved.
                            </p>
                          )}

                          {!isLocked && !roundProgress && (
                            <p className="text-sm text-muted-foreground">
                              Interview not yet scheduled for this round
                            </p>
                          )}

                          {!isLocked && !isCompleted && roundProgress && (
                            <p className="text-sm text-muted-foreground">
                              Interview status: {roundProgress.status}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Fallback to old progress display if no rounds configured
                  progress.map((round, index) => (
                    <div
                      key={round.interviewId}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(round.isCompleted, round.status)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{round.roundName}</h3>
                            <p className="text-sm text-muted-foreground">
                              Round {round.round} - Assigned to: {round.assignedRole || "N/A"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(round.isCompleted, round.status)}
                          </div>
                        </div>

                        {round.isCompleted && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {round.overallScore !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Score: </span>
                                <span className="font-semibold">
                                  {round.overallScore.toFixed(1)}
                                </span>
                              </div>
                            )}
                            {round.recommendation && (
                              <div>
                                <span className="text-muted-foreground">Recommendation: </span>
                                <Badge
                                  variant={
                                    round.recommendation === "PROCEED"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="ml-2"
                                >
                                  {round.recommendation}
                                </Badge>
                              </div>
                            )}
                            {round.completedAt && (
                              <div>
                                <span className="text-muted-foreground">Completed: </span>
                                <span>{formatDate(round.completedAt)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {enabledRounds.length === 0 && progress.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No interview rounds configured for this job. Please configure interview rounds first.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Reject Candidate Dialog */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Reject Candidate</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this candidate. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">
                  Rejection Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Enter the reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectionNotes">Additional Notes (Optional)</Label>
                <Textarea
                  id="rejectionNotes"
                  placeholder="Any additional notes..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectCandidate}
                disabled={isRejecting || !rejectionReason.trim()}
              >
                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      {/* Onboarding Details Dialog - Hide if HIRED */}
      {!isHired && (
      <Dialog open={isOnboardingModalOpen} onOpenChange={setIsOnboardingModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Onboarding Details - {candidate.firstName} {candidate.lastName}
            </DialogTitle>
            <DialogDescription>
              Manage documents and track onboarding progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Employee Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Candidate Name</Label>
                <p className="font-medium">{candidate.firstName} {candidate.lastName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Department</Label>
                <p className="font-medium">{(jobOpeningData?.data?.jobOpening as any)?.department || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Designation</Label>
                <p className="font-medium">{jobOpeningData?.data?.jobOpening?.title || candidate.position}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Expected Joining</Label>
                <p className="font-medium">
                  {candidate.expectedJoining ? formatDate(candidate.expectedJoining) : "Not Set"}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Overall Progress</Label>
                <span className="font-bold">0%</span>
              </div>
              <Progress value={0} className="h-3" />
            </div>

            {/* Documents List */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Required Documents</Label>
              {requiredDocuments.map((doc) => (
                <div
                  key={doc._id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{doc.name}</p>
                      {doc.required && (
                        <span className="text-xs text-red-500">Required</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Not Started</Badge>
                    <div className="flex gap-1">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleDocumentUpload(doc._id, file);
                            }
                          }}
                          disabled={uploadingDocId === doc._id}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={uploadingDocId === doc._id}
                          asChild
                        >
                          <span>
                            {uploadingDocId === doc._id ? (
                              "Uploading..."
                            ) : (
                              <>
                                <Upload className="w-3 h-3 mr-1" />
                                Upload
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOnboardingModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Interview Logs Dialog */}
      <Dialog open={!!logsRound} onOpenChange={(open) => !open && setLogsRound(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Interview Logs - {logsRound?.roundName || "Round Details"}
            </DialogTitle>
            <DialogDescription>
              Detailed Q&A and interviewer remarks
            </DialogDescription>
          </DialogHeader>

          {logsRound && (
            <div className="space-y-6 py-4">
              {/* Score Summary in Modal */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Interviewer</span>
                  <p className="font-medium">{logsRound.interviewer || "N/A"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Completed Date</span>
                  <p className="font-medium">{logsRound.completedAt ? formatDate(logsRound.completedAt) : "N/A"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Overall Score</span>
                  <p className="font-medium text-lg">{logsRound.overallScore !== undefined ? logsRound.overallScore.toFixed(1) : "N/A"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Recommendation</span>
                  <div className="mt-1">
                    <Badge
                      variant={logsRound.recommendation === "PROCEED" ? "default" : "destructive"}
                    >
                      {logsRound.recommendation || "N/A"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Overall Remarks in Modal */}
              {logsRound.remarks && (
                <div className="space-y-2">
                  <Label>Overall Remarks</Label>
                  <div className="p-3 border rounded-lg bg-muted/30 text-sm">
                    {logsRound.remarks}
                  </div>
                </div>
              )}

              {/* Q&A List */}
              {logsRound.responses && logsRound.responses.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Questions & Answers ({logsRound.responses.length} question{logsRound.responses.length !== 1 ? 's' : ''})</h4>
                  <div className="space-y-4">
                    {logsRound.responses.map((response: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question {idx + 1}</span>
                              <div className="flex items-center gap-2">
                                {response.score !== undefined && response.score !== null && (
                                  <Badge variant="outline" className="font-semibold">
                                    Score: {response.score} / {response.maxScore || 'N/A'}
                                  </Badge>
                                )}
                                {response.isSatisfactory !== undefined && (
                                  <Badge variant={response.isSatisfactory ? "default" : "secondary"}>
                                    {response.isSatisfactory ? "Satisfactory" : "Not Satisfactory"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="font-medium text-base mt-2">{response.questionText || response.question || 'Question not available'}</p>
                            {response.questionType && (
                              <p className="text-xs text-muted-foreground mt-1">Type: {response.questionType}</p>
                            )}
                          </div>

                          <div className="pl-4 border-l-2 border-muted">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Answer</p>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                              {Array.isArray(response.answer) 
                                ? response.answer.join(', ') 
                                : (response.answer !== null && response.answer !== undefined 
                                    ? String(response.answer) 
                                    : 'No answer provided')}
                            </p>
                          </div>

                          {response.remarks && (
                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-sm mt-2">
                              <span className="font-semibold text-xs text-blue-700 dark:text-blue-300">Interviewer Note: </span>
                              <p className="text-blue-900 dark:text-blue-100 mt-1 whitespace-pre-wrap">{response.remarks}</p>
                            </div>
                          )}
                          {response.answeredAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Answered at: {formatDate(response.answeredAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No detailed Q&A logs available for this round.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsRound(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout >
  );
};

export default InterviewProgress;
