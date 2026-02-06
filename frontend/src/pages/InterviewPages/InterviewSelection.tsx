import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ArrowRight, UserCircle, Award, CheckCircle2, XCircle, FileText, X } from "lucide-react";
import {
  useGetCandidatesQuery,
  useGetCandidatesForRoundQuery,
  useUpdateCandidateStatusMutation
} from "@/store/api/candidateApi";
import ScheduleInterviewModal from "@/components/candidate/ScheduleInterviewModal";
import { getCandidateAction } from "@/utils/candidateActionUtils";
import { toast } from "sonner";
import { formatDate, getRoundedStatusLabel, formatCandidateStatus } from "@/utils/constants";
import { Pagination } from "@/components/ui/Pagination";

interface InterviewSelectionProps {
  type: "round" | "progress" | "selected";
  roundNumber?: number | 'final'; // For round-based selection
}

const InterviewSelection = ({ type, roundNumber }: InterviewSelectionProps) => {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"selected" | "rejected">("selected");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default 10

  // Mutations
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateCandidateStatusMutation();

  // Schedule Interview Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedCandidateForSchedule, setSelectedCandidateForSchedule] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Hook for "Progress" view (Legacy)
  const { data: allCandidatesData, isLoading: isLoadingAll } = useGetCandidatesQuery(
    {
      search: search || undefined,
      page: page,
      limit: pageSize,
    },
    { skip: type !== 'progress' }
  );

  // Hook for "Round" view
  const { data: roundCandidatesData, isLoading: isLoadingRound, refetch: refetchRoundCandidates } = useGetCandidatesForRoundQuery(
    {
      roundNumber: roundNumber!,
      search: search || undefined,
      page: page,
      limit: pageSize,
    },
    { skip: type !== 'round' || !roundNumber }
  );

  // Hook for "Selected / Rejected" view
  // We use the generic 'getCandidates' query which supports status filtering
  const { data: tabCandidatesData, isLoading: isLoadingTabCandidates } = useGetCandidatesQuery(
    {
      search: search || undefined,
      status: activeTab === 'selected' ? 'SELECTED' : 'REJECTED',
      page,
      limit: pageSize,
    },
    { skip: type !== 'selected' }
  );

  const isLoading =
    (type === 'progress' && isLoadingAll) ||
    (type === 'round' && isLoadingRound) ||
    (type === 'selected' && isLoadingTabCandidates);

  // Determine which candidates to show
  let candidates: any[] = [];

  if (type === 'progress') {
    const allCandidates = allCandidatesData?.data?.candidates || [];
    // Filter candidates based on type for progress view
    candidates = allCandidates.filter((candidate: any) => {
      // Show all candidates who have at least started the process or are relevant
      return ["INTERVIEW_SCHEDULED", "HR_INTERVIEW_IN_PROGRESS", "HR_INTERVIEW_COMPLETED",
        "MANAGER_INTERVIEW_IN_PROGRESS", "MANAGER_INTERVIEW_COMPLETED", "SELECTED", "REJECTED", "HIRED"].includes(candidate.status);
    });
  } else if (type === 'round') {
    candidates = roundCandidatesData?.data?.candidates || [];
  } else if (type === 'selected') {
    candidates = tabCandidatesData?.data?.candidates || [];
  }

  // Get pagination data based on view type
  const paginationData = 
    type === 'selected' ? tabCandidatesData?.data?.pagination :
    type === 'round' ? roundCandidatesData?.data?.pagination :
    type === 'progress' ? allCandidatesData?.data?.pagination :
    null;

  // Handle Select Candidate (for INTERVIEW_COMPLETED candidates)
  const handleSelect = async (candidateId: string) => {
    try {
      await updateStatus({
        id: candidateId,
        status: 'SELECTED'
      }).unwrap();

      toast.success("Candidate selected successfully");
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to select candidate");
    }
  };

  // Handle Reject Candidate (for INTERVIEW_COMPLETED candidates)
  const handleReject = async (candidateId: string) => {
    try {
      await updateStatus({
        id: candidateId,
        status: 'REJECTED'
      }).unwrap();

      toast.success("Candidate rejected successfully");
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to reject candidate");
    }
  };

  const getRoundLabel = (roundNum?: number | string) => {
    if (roundNum === 1) return "Round 1 (First Round)";
    if (roundNum === 2) return "Round 2 (Second Round)";
    if (roundNum === 3) return "Round 3";
    if (roundNum === 4 || roundNum === 'final') return "Final Round";
    return `Round ${roundNum}`;
  };

  const getTitle = () => {
    if (type === "round" && roundNumber) {
      return `${getRoundLabel(roundNumber)} - Select Candidate`;
    }
    if (type === "progress") {
      return "Interview Progress - Select Candidate";
    }
    if (type === "selected") {
      return "Selected / Rejected Candidates";
    }
    return "Select Candidate";
  };

  const getDescription = () => {
    if (type === "round" && roundNumber) {
      return `Select a candidate to conduct ${getRoundLabel(roundNumber).toLowerCase()}`;
    }
    if (type === "progress") {
      return "Select a candidate to view their interview progress";
    }
    if (type === "selected") {
      return "Manage selected and rejected candidates";
    }
    return "Select a candidate";
  };

  // Render content logic
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4">
          <div className="text-center py-8">Loading candidates...</div>
        </div>
      );
    }

    // Common Table Headers
    const renderTableHeaders = () => (
      <TableHeader>
        <TableRow>
          <TableHead>Candidate Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Position</TableHead>
          {type !== 'selected' && <TableHead>Status</TableHead>}
          {type === 'selected' && <TableHead>{activeTab === 'selected' ? 'Selected On' : 'Rejected On'}</TableHead>}
          {type === "round" && <TableHead>Interview Schedules</TableHead>}
          <TableHead className="text-center">Action</TableHead>
        </TableRow>
      </TableHeader>
    );

    const renderTableBody = () => (
      <TableBody>
        {candidates.map((candidate: any) => (
          <TableRow key={candidate._id} className="cursor-pointer hover:bg-accent/50">
            <TableCell className="font-medium">
              {candidate.firstName} {candidate.lastName}
            </TableCell>
            <TableCell>{candidate.email}</TableCell>
            <TableCell>{candidate.position || "-"}</TableCell>

            {/* Status Column (Simplified for Rounds, Standard for Progress) */}
            {type !== 'selected' && (
              <TableCell>
                <Badge 
                  variant="outline"
                  className={
                    candidate.status === 'INTERVIEW_COMPLETED' 
                      ? "border-yellow-500 text-yellow-700 bg-yellow-50" 
                      : ""
                  }
                >
                  {type === 'round'
                    ? getRoundedStatusLabel(candidate.status, candidate.scheduledInterview)
                    : candidate.status === 'INTERVIEW_COMPLETED' 
                      ? 'Ready for Selection'
                      : formatCandidateStatus(candidate.status)
                  }
                </Badge>
              </TableCell>
            )}

            {/* Date Column for Selected/Rejected */}
            {type === 'selected' && (
              <TableCell>
                {activeTab === 'selected'
                  // Prefer selectedOn, fallback to updatedAt for backward compatibility
                  ? formatDate(candidate.selectedOn || candidate.updatedAt)
                  // Prefer rejectedOn, fallback to updatedAd
                  : formatDate(candidate.rejectedOn || candidate.updatedAt)
                }
              </TableCell>
            )}

            {type === "round" && (
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {candidate.scheduledInterview ? (
                    <>
                      Scheduled: {new Date(candidate.scheduledInterview.interviewDate).toLocaleDateString()}
                    </>
                  ) : "Not Scheduled"}
                </span>
              </TableCell>
            )}

            <TableCell className="text-center">
              {type === 'selected' ? (
                // Custom Actions for Selected / Rejected Module
                activeTab === 'selected' ? (
                  // Show Select/Reject buttons for INTERVIEW_COMPLETED candidates
                  // Show Onboarding button for already SELECTED candidates
                  candidate.status === 'INTERVIEW_COMPLETED' ? (
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50"
                        onClick={() => handleReject(candidate._id)}
                        disabled={isUpdatingStatus}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleSelect(candidate._id)}
                        disabled={isUpdatingStatus}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Select
                      </Button>
                    </div>
                  ) : (
                    // Already SELECTED - show Generate Offer Letter button
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => navigate(`/offer-letter/create?candidateId=${candidate._id}`)}
                      disabled={isUpdatingStatus}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Offer Letter
                    </Button>
                  )
                ) : (
                  // Rejected Tab - No Actions / Read Only
                  <span className="text-muted-foreground text-sm">—</span>
                )
              ) : (
                // Standard Actions for other modules
                (() => {
                  const action = getCandidateAction(candidate, currentUser);
                  return (
                    <Button
                      size="sm"
                      variant={action.variant || "default"}
                      disabled={action.disabled}
                      onClick={() => {
                        if (action.type === 'SCHEDULE') {
                          setSelectedCandidateForSchedule({
                            id: candidate._id,
                            name: `${candidate.firstName} ${candidate.lastName}`
                          });
                          setIsScheduleModalOpen(true);
                        } else if (action.type === 'START' || action.type === 'VIEW_LOGS' || action.type === 'VIEW_PROGRESS') {
                          navigate(action.path || `/interview/candidate/${candidate._id}/progress`);
                        } else if (action.path) {
                          navigate(action.path);
                        } else {
                          navigate(`/interview/candidate/${candidate._id}/progress`);
                        }
                      }}
                    >
                      {action.label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  );
                })()
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );

    return (
      <div className="border rounded-lg">
        <Table>
          {renderTableHeaders()}
          {renderTableBody()}
        </Table>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {type === 'selected' ? <Award className="w-5 h-5 text-yellow-600" /> : <UserCircle className="w-5 h-5" />}
            {getTitle()}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{getDescription()}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search candidates by name, email, or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-10 ${search ? "pr-10" : ""}`}
              />
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>

            {/* Selected / Rejected Tabs */}
            {type === 'selected' ? (
              <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "selected" | "rejected")} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="selected" className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Selected Candidates
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Rejected Candidates
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="selected">
                  {candidates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No selected candidates found.
                    </div>
                  ) : renderContent()}
                </TabsContent>

                <TabsContent value="rejected">
                  {candidates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No rejected candidates found.
                    </div>
                  ) : renderContent()}
                </TabsContent>
              </Tabs>
            ) : (
              // Non-Selected Views (Round, Progress)
              candidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No candidates found.
                </div>
              ) : renderContent()
            )}

            {/* Pagination for all views */}
            {(paginationData || (type === 'progress' && allCandidatesData?.data) || (type === 'round' && roundCandidatesData?.data)) && (
              <div className="mt-6 pt-4 border-t">
                <Pagination
                  page={paginationData?.page || page}
                  pageSize={pageSize}
                  total={paginationData?.total || candidates.length}
                  pages={paginationData?.pages || Math.ceil((paginationData?.total || candidates.length) / pageSize)}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  showPageSizeSelector={true}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setSelectedCandidateForSchedule(null);
          // Refetch candidates list to show updated interview status
          if (type === 'round') {
            refetchRoundCandidates();
          }
        }}
        candidateId={selectedCandidateForSchedule?.id || null}
        candidateName={selectedCandidateForSchedule?.name || ""}
        roundNumber={typeof roundNumber === 'number' ? roundNumber : undefined}
      />
    </div>
  );
};

export default InterviewSelection;

