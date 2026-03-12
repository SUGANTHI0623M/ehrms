import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input, Select, Form, message, Modal, Spin, Button as AntButton, DatePicker, TimePicker } from "antd";
import { Download, Calendar, MapPin, User, Briefcase, GraduationCap, FileText, Clock, Video, Building2, AlertCircle, XCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetCandidateByIdQuery, useUpdateCandidateMutation, useUpdateCandidateStatusMutation, useGetCandidatesQuery, useRejectCandidateMutation, type Candidate } from "@/store/api/candidateApi";
import {
  useGetCandidateInterviewsQuery,
  useScheduleInterviewMutation,
  useUpdateInterviewMutation
} from "@/store/api/interviewApi";
import InterviewStatusTimeline from "@/components/candidate/InterviewStatusTimeline";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useGetInterviewProgressQuery } from "@/store/api/interviewResponseApi";
import { getCandidateAction } from "@/utils/candidateActionUtils";
import { useAppSelector } from "@/store/hooks";
import { getCountryOptions } from "@/utils/countryCodeUtils";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";
import { formatCandidateStatus, getCandidateStatusColor } from "@/utils/constants";
import ScheduleInterviewModal from "@/components/candidate/ScheduleInterviewModal";

dayjs.extend(customParseFormat);

const { TextArea } = Input;
const { Option } = Select;

const InterviewStatusTimelineContainer = ({ candidate, interviews }: { candidate: any, interviews: any[] }) => {
  const { data: progressData } = useGetInterviewProgressQuery(candidate._id, {
    skip: !candidate._id
  });

  return (
    <InterviewStatusTimeline
      timeline={progressData?.data?.timeline}
    />
  );
};

const CandidateProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedRoundForSchedule, setSelectedRoundForSchedule] = useState<number | undefined>(undefined);
  const [editInterviewModalOpen, setEditInterviewModalOpen] = useState(false);
  const [editContactModalOpen, setEditContactModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [interviewForm] = Form.useForm();
  const [editContactForm] = Form.useForm();
  const currentUser = useAppSelector((state) => state.auth.user);
  
  // Get user permissions
  const userPermissions = useMemo(() => {
    if (!currentUser) return [];
    const roleId =
      typeof currentUser.roleId === "object" ? currentUser.roleId : null;
    return getUserPermissions(
      currentUser?.role,
      roleId as any,
      currentUser?.permissions || [],
    );
  }, [currentUser]);
  
  // Fetch candidates list for sidebar with pagination and infinite scroll
  const [sidebarPage, setSidebarPage] = useState(1);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const sidebarPageSize = 20;
  const observerTarget = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  
  const { 
    data: candidatesListData, 
    isLoading: isLoadingCandidatesList,
    isFetching: isFetchingCandidatesList,
    refetch: refetchCandidatesList
  } = useGetCandidatesQuery({ 
    page: sidebarPage, 
    limit: sidebarPageSize,
    search: sidebarSearch || undefined
  }, {
    refetchOnMountOrArgChange: true, // Ensure it refetches when navigating to this page
  });
  
  const hasMoreCandidates = candidatesListData?.data?.pagination 
    ? sidebarPage < candidatesListData.data.pagination.pages 
    : false;
  
  // Initialize candidates list on mount and when data changes
  useEffect(() => {
    if (candidatesListData?.data?.candidates) {
      if (sidebarPage === 1 || isInitialLoad.current) {
        // Reset on first page, search change, or initial load
        setAllCandidates(candidatesListData.data.candidates);
        isInitialLoad.current = false;
      } else {
        // Append new candidates for pagination
        setAllCandidates((prev) => {
          const existingIds = new Set(prev.map(c => c._id));
          const newCandidates = candidatesListData.data.candidates.filter(
            (c: any) => !existingIds.has(c._id)
          );
          return [...prev, ...newCandidates];
        });
      }
    }
  }, [candidatesListData, sidebarPage]);
  
  // Reset and refetch when component mounts or candidate ID changes
  useEffect(() => {
    // Reset state when navigating to a new candidate
    setSidebarPage(1);
    setAllCandidates([]);
    setSidebarSearch("");
    isInitialLoad.current = true;
    // Refetch candidates list
    refetchCandidatesList();
  }, [id, refetchCandidatesList]);
  
  // Infinite scroll for candidate cards
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreCandidates && !isFetchingCandidatesList) {
          setSidebarPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMoreCandidates, isFetchingCandidatesList]);
  
  // Reset page and clear candidates when search changes
  useEffect(() => {
    if (sidebarSearch !== "") {
      setSidebarPage(1);
      setAllCandidates([]);
      isInitialLoad.current = true;
    }
  }, [sidebarSearch]);
  
  const candidatesList = allCandidates;

  // Function to disable past dates in DatePicker
  const disablePastDate = (current: any) => {
    // Disable dates before today
    return current && current < dayjs().startOf('day');
  };
  const canEditCandidate = currentUser?.role === 'Admin';
  const countryOptions = getCountryOptions();
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("91");

  const { data: candidateData, isLoading: isLoadingCandidate, refetch: refetchCandidate } = useGetCandidateByIdQuery(id!);
  const { data: interviewsData, isLoading: isLoadingInterviews, refetch: refetchInterviews } = useGetCandidateInterviewsQuery(id!);
  const [updateCandidateStatus] = useUpdateCandidateStatusMutation();
  const [updateCandidate, { isLoading: isUpdatingCandidate }] = useUpdateCandidateMutation();
  const [updateInterview, { isLoading: isUpdating }] = useUpdateInterviewMutation();
  const [rejectCandidate, { isLoading: isRejecting }] = useRejectCandidateMutation();

  const candidate = candidateData?.data?.candidate;
  const interviews = interviewsData?.data?.interviews || [];

  // Handle schedule interview button click
  const handleScheduleClick = () => {
    if (candidate?.hiredForOtherJob) {
      message.warning(`This candidate has already been hired for ${candidate.hiredForOtherJob.jobTitle}. Cannot schedule interviews.`);
      return;
    }
    
    // Determine which round to schedule
    const currentRoundNum = candidate?.currentJobStage || candidate?.currentRound || 1;
    const isRoundCompletedStatus = [
      'HR_INTERVIEW_COMPLETED',
      'MANAGER_INTERVIEW_COMPLETED',
      'ROUND3_INTERVIEW_COMPLETED',
      'ROUND4_INTERVIEW_COMPLETED',
      'INTERVIEW_COMPLETED'
    ].includes(candidate?.status || '');
    
    const roundToSchedule = isRoundCompletedStatus && !candidate?.scheduledInterview
      ? currentRoundNum + 1
      : (action.round || currentRoundNum);
    
    setSelectedRoundForSchedule(roundToSchedule);
    setScheduleModalOpen(true);
  };

  // Handle modal close
  const handleScheduleModalClose = () => {
    setScheduleModalOpen(false);
    setSelectedRoundForSchedule(undefined);
    refetchCandidate();
    refetchInterviews();
  };

  const handleUpdateInterview = async (values: any) => {
    try {
      await updateInterview({
        id: selectedInterview._id,
        data: {
          interviewType: values.interviewType,
          interviewDate: values.interviewDate.format('YYYY-MM-DD'),
          interviewTime: values.interviewTime.format('HH:mm'),
          interviewLocation: values.interviewLocation,
          interviewMode: values.interviewMode,
          interviewerName: values.interviewerName,
          interviewerEmail: values.interviewerEmail,
          notes: values.notes,
          status: values.status,
        }
      }).unwrap();

      message.success("Interview updated successfully!");
      setEditInterviewModalOpen(false);
      interviewForm.resetFields();
      refetchInterviews();
      refetchCandidate();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update interview");
    }
  };

  const openEditInterview = (interview: any) => {
    setSelectedInterview(interview);
    interviewForm.setFieldsValue({
      interviewType: interview.interviewType,
      interviewDate: dayjs(interview.interviewDate),
      interviewTime: dayjs(interview.interviewTime, 'HH:mm'),
      interviewLocation: interview.interviewLocation,
      interviewMode: interview.interviewMode,
      interviewerName: interview.interviewerName,
      interviewerEmail: interview.interviewerEmail,
      notes: interview.notes,
      status: interview.status,
    });
    setEditInterviewModalOpen(true);
  };

  const handleOpenEditContact = () => {
    if (!candidate) return;
    const countryCode = candidate.countryCode || '91';
    setSelectedCountryCode(countryCode);
    editContactForm.setFieldsValue({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      countryCode: countryCode,
    });
    setEditContactModalOpen(true);
  };

  const handleUpdateContact = async (values: any) => {
    if (!candidate) return;
    try {
      await updateCandidate({
        id: candidate._id,
        data: {
          firstName: values.firstName?.trim(),
          lastName: values.lastName?.trim(),
          email: values.email?.trim(),
          phone: values.phone?.trim(),
          countryCode: values.countryCode?.trim() || undefined,
        }
      }).unwrap();

      message.success("Candidate details updated");
      setEditContactModalOpen(false);
      refetchCandidate();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update candidate");
    }
  };

  const handleRejectCandidate = async () => {
    if (!candidate || !rejectionReason.trim()) {
      message.error("Please provide a rejection reason");
      return;
    }

    try {
      await rejectCandidate({
        candidateId: candidate._id,
        rejectionReason: rejectionReason.trim(),
        notes: rejectionNotes.trim() || undefined,
      }).unwrap();

      message.success("Candidate rejected successfully");
      setRejectModalOpen(false);
      setRejectionReason("");
      setRejectionNotes("");
      refetchCandidate();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to reject candidate");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Hired':
      case 'Selected':
        return 'default';
      case 'Rejected':
        return 'destructive';
      case 'Interview':
      case 'Scheduled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoadingCandidate) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spin size="large" />
        </div>
      </MainLayout>
    );
  }

  if (!candidate) {
    return (
      <MainLayout>
        <div className="p-4">
          <Button onClick={() => navigate(-1)} className="mb-4">← Back</Button>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Candidate not found</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const action = getCandidateAction(candidate, currentUser);
  // Reject button should be available at all stages except when already rejected or hired
  const canReject = candidate.status !== 'REJECTED' && candidate.status !== 'HIRED' && !candidate?.hiredForOtherJob;
  
  // Determine if we should show "Move to Next Round" instead of "Schedule Interview"
  const currentRound = candidate?.currentJobStage || candidate?.currentRound || 1;
  const isRoundCompleted = [
    'HR_INTERVIEW_COMPLETED',
    'MANAGER_INTERVIEW_COMPLETED',
    'ROUND3_INTERVIEW_COMPLETED',
    'ROUND4_INTERVIEW_COMPLETED',
    'INTERVIEW_COMPLETED'
  ].includes(candidate?.status || '');
  
  const isApplied = candidate?.status === 'APPLIED' || 
                   candidate?.status === 'RE_APPLIED' || 
                   candidate?.status === 'APPLIED_FOR_MULTIPLE_JOBS';
  
  const nextRoundNumber = currentRound + 1;
  
  // Get display label for action button
  const getActionLabel = () => {
    if (action.type === 'SCHEDULE') {
      if (isRoundCompleted && !candidate?.scheduledInterview) {
        return `Schedule Round ${nextRoundNumber} Interview`;
      }
      if (isApplied) {
        return 'Schedule Interview';
      }
      return 'Schedule Interview';
    }
    return action.label;
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Candidate Profile</h1>
          <Button variant="outline" onClick={() => navigate('/candidates')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Candidates
          </Button>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-120px)] min-h-[600px]">
          {/* Left Sidebar - Candidate Cards */}
          <div className="w-full lg:w-80 flex-shrink-0 border-r-0 lg:border-r pr-0 lg:pr-4 flex flex-col h-auto lg:h-full max-h-[400px] lg:max-h-[calc(100vh-120px)]">
            <div className="flex-shrink-0 sticky top-0 bg-background z-10 pb-2 border-b mb-4">
              <h2 className="text-lg font-semibold mb-2">Candidates</h2>
              <Input
                placeholder="Search candidates..."
                className="w-full"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                allowClear
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
              {isLoadingCandidatesList && sidebarPage === 1 ? (
                <div className="text-center py-8">
                  <Spin size="small" />
                  <p className="text-sm text-muted-foreground mt-2">Loading candidates...</p>
                </div>
              ) : candidatesList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No candidates found</p>
                </div>
              ) : (
                <>
                  {candidatesList.map((c: any) => {
                const isActive = c._id === candidate._id;
                return (
                  <Card
                    key={c._id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isActive ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => navigate(`/candidate/${c._id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt={`${c.firstName} ${c.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {c.firstName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {c.firstName} {c.lastName}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {c.position || 'No position'}
                          </p>
                          <div className="mt-2">
                            <Badge
                              className={getCandidateStatusColor(c.displayStatus || c.status)}
                              variant="outline"
                            >
                              {formatCandidateStatus(c.displayStatus || c.status)}
                            </Badge>
                          </div>
                          {c.appliedJobs && c.appliedJobs.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {c.appliedJobs.length} job{c.appliedJobs.length > 1 ? 's' : ''} applied
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
                  })}
                  {/* Infinite scroll trigger */}
                  {hasMoreCandidates && (
                    <div ref={observerTarget} className="py-4 text-center">
                      {isFetchingCandidatesList ? (
                        <Spin size="small" />
                      ) : (
                        <p className="text-xs text-muted-foreground">Scroll for more</p>
                      )}
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
          </div>

          {/* Right Side - Resume and Personal Details */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-4 overflow-visible lg:overflow-hidden w-full">
            {/* Header with Action Buttons - Above Resume */}
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    {candidate.firstName} {candidate.lastName}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">{candidate.position}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(candidate.status)} className="text-sm px-3 py-1">
                    {candidate.status}
                  </Badge>
                </div>
              </div>

              {/* Status Banner - Like Indeed */}
              {(isApplied || isRoundCompleted) && (
                <div className={`mb-3 p-4 rounded-lg border ${
                  isApplied 
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-200' 
                    : 'bg-green-50 dark:bg-green-950 border-green-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="font-semibold text-blue-900 dark:text-blue-100">
                              Application Received
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              Ready to schedule the first interview
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <div>
                            <p className="font-semibold text-green-900 dark:text-green-100">
                              Round {currentRound} Completed
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Ready to move to Round {nextRoundNumber}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons Bar - Same as Table View */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
                {(() => {
                  // Permission Check Logic - Same as table view
                  let hasPermission = false;
                  switch (action.type) {
                    case "SCHEDULE":
                      hasPermission = hasAction(
                        userPermissions,
                        "interview_appointments",
                        "schedule",
                      );
                      break;
                    case "START":
                      hasPermission = hasAction(
                        userPermissions,
                        "candidates",
                        "start_interview",
                      );
                      break;
                    case "CONVERT_TO_STAFF":
                      hasPermission = hasAction(
                        userPermissions,
                        "candidates",
                        "convert_to_staff",
                      );
                      break;
                    case "VIEW_PROFILE":
                      hasPermission = hasAction(
                        userPermissions,
                        "candidates",
                        "view_profile",
                      );
                      break;
                    case "VIEW_OFFER":
                      hasPermission = hasAction(
                        userPermissions,
                        "candidates",
                        "view_offer",
                      );
                      break;
                    case "GENERATE_OFFER":
                      hasPermission = hasAction(
                        userPermissions,
                        "offer_letter",
                        "generate",
                      );
                      break;
                    case "ONBOARD":
                    case "DOCUMENT_COLLECTION":
                      hasPermission = hasAction(
                        userPermissions,
                        "document_collection",
                        "view",
                      );
                      break;
                    case "BACKGROUND_VERIFICATION":
                      hasPermission = hasAction(
                        userPermissions,
                        "background_verification",
                        "view",
                      );
                      break;
                    case "VIEW_LOGS":
                    case "VIEW_PROGRESS":
                      hasPermission = hasAction(
                        userPermissions,
                        "candidates",
                        "view",
                      );
                      break;
                    default:
                      hasPermission = true; // Allow other actions by default
                  }

                  if (!hasPermission) {
                    return (
                      <span className="text-sm text-muted-foreground px-3 py-2">
                        Restricted
                      </span>
                    );
                  }

                  // Show main action button - Show for all action types except VIEW_PROFILE and NONE
                  if (action.type === 'VIEW_PROFILE' || action.type === 'NONE') {
                    return null;
                  }

                  return (
                    <Button
                      className={action.color || (action.type === 'SCHEDULE' ? '' : '')}
                      variant={action.type === 'SCHEDULE' ? 'default' : action.variant}
                      disabled={action.disabled || !!candidate?.hiredForOtherJob}
                      size="lg"
                      onClick={() => {
                        if (candidate?.hiredForOtherJob && action.type === 'SCHEDULE') {
                          message.warning(`This candidate has already been hired for ${candidate.hiredForOtherJob.jobTitle}. Cannot schedule interviews.`);
                          return;
                        }
                        switch (action.type) {
                          case 'SCHEDULE':
                            handleScheduleClick();
                            break;
                          case 'START':
                            navigate(`/interview/candidate/${candidate._id}/progress`);
                            break;
                          case 'VIEW_PROGRESS':
                            navigate(`/interview/candidate/${candidate._id}/progress`);
                            break;
                          case 'GENERATE_OFFER':
                            navigate(`/offer-letter/create?candidateId=${candidate._id}`);
                            break;
                          case 'VIEW_OFFER':
                            navigate("/offer-letter");
                            break;
                          case 'ONBOARD':
                            navigate(`/interview/candidate/${candidate._id}/progress`);
                            break;
                          case 'DOCUMENT_COLLECTION':
                            navigate(`/onboarding`);
                            break;
                          case 'BACKGROUND_VERIFICATION':
                            const hasDocs = candidate.documents && candidate.documents.length > 0;
                            if (hasDocs) {
                              navigate(`/interview/background-verification/${candidate._id}`);
                            } else {
                              navigate(`/interview/candidate/${candidate._id}/progress`);
                            }
                            break;
                          case 'CONVERT_TO_STAFF':
                            navigate(`/hiring`);
                            break;
                          case 'VIEW_LOGS':
                            navigate(`/candidate/${candidate._id}`);
                            break;
                        }
                      }}
                    >
                      {getActionLabel()}
                    </Button>
                  );
                })()}
                
                {/* Always show Reject button if candidate can be rejected */}
                
                {/* Reject Button - Always available (except when already rejected/hired) */}
                {canReject && (
                  <Button
                    variant="outline"
                    className="border-red-500 hover:bg-red-50 text-red-600"
                    size="lg"
                    onClick={() => setRejectModalOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                )}
              </div>
            </div>

            {/* HIRED for Other Job Warning */}
            {candidate?.hiredForOtherJob && candidate.status !== 'HIRED' && (
              <div className="mb-4 flex-shrink-0">
                <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="w-6 h-6  dark:text-orange-400 flex-shrink-0 mt-1" />
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
              </div>
            )}

            {/* Resume and Personal Details Container - Tab View */}
            <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-y-auto min-h-0 w-full">
              <Tabs defaultValue="resume" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-auto mb-4">
                  <TabsTrigger value="resume" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Resume</span>
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                    <User className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Personal Details</span>
                    <span className="sm:hidden">Details</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="resume" className="mt-0 w-full">
                  <div className="flex flex-col border rounded-lg bg-muted/20 w-full">
                    {candidate.resume ? (
                      <>
                        <div className="flex-shrink-0 p-2 sm:p-3 bg-background border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm sm:text-base truncate">{candidate.resume.name || 'Resume'}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto flex-shrink-0"
                            onClick={() => window.open(candidate.resume?.url, '_blank')}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <div className="flex justify-center bg-gray-100 p-2 sm:p-4 w-full overflow-x-auto">
                          <div className="w-full max-w-full sm:max-w-4xl" style={{ minHeight: '500px', height: '800px' }}>
                            <iframe
                              src={`${candidate.resume.url}#toolbar=1&view=FitH`}
                              className="w-full h-full min-h-[500px] border border-gray-300 rounded bg-white shadow-lg"
                              title="Resume Preview"
                              style={{ display: 'block' }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No resume available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="mt-0 w-full">
                  <div className="flex flex-col border rounded-lg bg-background w-full">
                    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
                {/* Personal Details */}
                <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Personal Details
                        </CardTitle>
                        {canEditCandidate && (
                          <Button size="sm" variant="outline" onClick={handleOpenEditContact}>
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-base">{candidate.firstName} {candidate.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <p className="text-base">{candidate.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mobile Number</label>
                  <p className="text-base">{candidate.phone}</p>
                </div>
                {candidate.gender && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                    <p className="text-base">{candidate.gender}</p>
                  </div>
                )}
                {candidate.dateOfBirth && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-base">{new Date(candidate.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                )}
                {candidate.currentCity && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current City / Location</label>
                    <p className="text-base">{candidate.currentCity}</p>
                  </div>
                )}
                {candidate.preferredJobLocation && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Preferred Job Location</label>
                    <p className="text-base">{candidate.preferredJobLocation}</p>
                  </div>
                )}
                {candidate.resume && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Resume</label>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(candidate.resume?.url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {candidate.resume.name || 'View Resume'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Referral Information */}
            {candidate.source === 'REFERRAL' && (candidate.referrerId || candidate.referralMetadata) && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <User className="w-5 h-5" />
                    Referral Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {candidate.referrerId && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Referred By</label>
                      <div className="mt-1">
                        {typeof candidate.referrerId === 'object' && candidate.referrerId ? (
                          <div>
                            <p className="text-base font-semibold">
                              {candidate.referrerId.name || 
                               `${(candidate.referrerId as any).firstName || ''} ${(candidate.referrerId as any).lastName || ''}`.trim() || 
                               'Unknown'}
                            </p>
                            {candidate.referrerId.email && (
                              <p className="text-sm text-muted-foreground">{candidate.referrerId.email}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-base">Referrer ID: {typeof candidate.referrerId === 'string' ? candidate.referrerId : candidate.referrerId?._id || 'N/A'}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {candidate.referralMetadata?.relationship && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                      <p className="text-base capitalize">{candidate.referralMetadata.relationship}</p>
                    </div>
                  )}
                  {candidate.referralMetadata?.knownPeriod && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Known Period</label>
                      <p className="text-base">
                        {candidate.referralMetadata.knownPeriod === 'less-1' ? 'Less than 1 year' :
                         candidate.referralMetadata.knownPeriod === '1-3' ? '1-3 years' :
                         candidate.referralMetadata.knownPeriod === '3-5' ? '3-5 years' :
                         candidate.referralMetadata.knownPeriod === 'more-5' ? 'More than 5 years' :
                         candidate.referralMetadata.knownPeriod}
                      </p>
                    </div>
                  )}
                  {candidate.referralMetadata?.notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Referrer Notes</label>
                      <p className="text-base mt-1 whitespace-pre-wrap">{candidate.referralMetadata.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {/* Educational Details */}
                  {candidate.education && candidate.education.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" />
                          Educational Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {candidate.education.map((edu: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Highest Qualification</label>
                          <p className="text-base">{edu.qualification || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Degree / Course Name</label>
                          <p className="text-base">{edu.courseName || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Institution Name</label>
                          <p className="text-base">{edu.institution || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">University / Board</label>
                          <p className="text-base">{edu.university || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Year of Passing</label>
                          <p className="text-base">{edu.yearOfPassing || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Percentage / CGPA</label>
                          <p className="text-base">
                            {edu.percentage ? `${edu.percentage}%` : edu.cgpa ? `CGPA: ${edu.cgpa}` : '-'}
                          </p>
                        </div>
                      </div>
                            </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No educational details available
                      </CardContent>
                    </Card>
                  )}
            {/* Work Experience */}
                  {(candidate.totalYearsOfExperience || candidate.experience?.length > 0) ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5" />
                          Work Experience Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {candidate.totalYearsOfExperience && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Total Years of Experience</label>
                              <p className="text-base">{candidate.totalYearsOfExperience} years</p>
                            </div>
                          )}
                          {candidate.currentCompany && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Current Company</label>
                              <p className="text-base">{candidate.currentCompany}</p>
                            </div>
                          )}
                          {candidate.currentJobTitle && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Current Job Title</label>
                              <p className="text-base">{candidate.currentJobTitle}</p>
                            </div>
                          )}
                          {candidate.employmentType && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Employment Type</label>
                              <p className="text-base">{candidate.employmentType}</p>
                            </div>
                          )}
                        </div>
                        {candidate.experience && candidate.experience.length > 0 && (
                          <div className="space-y-4 mt-4">
                            <h4 className="font-semibold">Previous Companies:</h4>
                            {candidate.experience.map((exp: any, index: number) => (
                              <div key={index} className="border rounded-lg p-4 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                              <p className="text-base">{exp.company || '-'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Role</label>
                              <p className="text-base">{exp.role || exp.designation || '-'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Duration</label>
                              <p className="text-base">
                                {exp.durationFrom
                                  ? `${new Date(exp.durationFrom).toLocaleDateString()} - ${exp.durationTo ? new Date(exp.durationTo).toLocaleDateString() : 'Present'}`
                                  : '-'}
                              </p>
                            </div>
                          </div>
                          {exp.keyResponsibilities && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Responsibilities</label>
                              <p className="text-base whitespace-pre-wrap">{exp.keyResponsibilities}</p>
                            </div>
                          )}
                                </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No work experience details available
                      </CardContent>
                    </Card>
                  )}
            {/* Courses Completed - Show for freshers or when experience is 0 */}
            {((!candidate.totalYearsOfExperience || candidate.totalYearsOfExperience === 0) && (candidate as Candidate).courses && (candidate as Candidate).courses!.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Courses Completed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(candidate as Candidate).courses!.map((course: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Course Name</label>
                          <p className="text-base">{course.courseName || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Institution/Platform</label>
                          <p className="text-base">{course.institution || '-'}</p>
                        </div>
                        {course.startDate && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                            <p className="text-base">{new Date(course.startDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {course.completionDate && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Completion Date</label>
                            <p className="text-base">{new Date(course.completionDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {course.duration && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Duration</label>
                            <p className="text-base">{course.duration}</p>
                          </div>
                        )}
                      </div>
                      {course.description && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Description</label>
                          <p className="text-base whitespace-pre-wrap">{course.description}</p>
                        </div>
                      )}
                      {course.certificateUrl && (
                        <div>
                          <a href={course.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                            View Certificate
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {/* Internships - Show for freshers or when experience is 0 */}
            {((!candidate.totalYearsOfExperience || candidate.totalYearsOfExperience === 0) && (candidate as Candidate).internships && (candidate as Candidate).internships!.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Internships
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(candidate as Candidate).internships!.map((internship: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Company</label>
                          <p className="text-base">{internship.company || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Role</label>
                          <p className="text-base">{internship.role || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Duration</label>
                          <p className="text-base">
                            {internship.durationFrom
                              ? `${new Date(internship.durationFrom).toLocaleDateString()} - ${internship.durationTo ? new Date(internship.durationTo).toLocaleDateString() : 'Present'}`
                              : '-'}
                          </p>
                        </div>
                        {internship.mentorName && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Mentor Name</label>
                            <p className="text-base">{internship.mentorName}</p>
                          </div>
                        )}
                      </div>
                      {internship.keyResponsibilities && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Key Responsibilities</label>
                          <p className="text-base whitespace-pre-wrap">{internship.keyResponsibilities}</p>
                        </div>
                      )}
                      {internship.skillsLearned && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Skills Learned</label>
                          <p className="text-base whitespace-pre-wrap">{internship.skillsLearned}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
                {/* Application Details */}
                {candidate && (
                  <InterviewStatusTimelineContainer
                    candidate={candidate}
                    interviews={interviews}
                  />
                )}

                {/* Interviews Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Interviews {interviews.length > 0 && `(${interviews.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                      {isLoadingInterviews ? (
                        <div className="flex justify-center py-8">
                          <Spin />
                        </div>
                      ) : interviews.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">No interviews scheduled yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {interviews.map((interview: any) => (
                            <Card key={interview._id}>
                              <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                  <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Round {interview.round} - {interview.status}
                                  </CardTitle>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getStatusBadgeVariant(interview.status)}>
                                      {interview.status}
                                    </Badge>
                                    <Button size="sm" variant="outline" onClick={() => openEditInterview(interview)}>
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                                    <p className="text-base">
                                      {new Date(interview.interviewDate).toLocaleDateString()} at {interview.interviewTime}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {interview.interviewType === 'Virtual' ? (
                                    <Video className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                                    <p className="text-base">{interview.interviewType}</p>
                                  </div>
                                </div>
                                {interview.interviewLocation && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Location</label>
                                      <p className="text-base">{interview.interviewLocation}</p>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Mode</label>
                                    <p className="text-base">{interview.interviewMode}</p>
                                  </div>
                                </div>
                                {interview.interviewerName && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Interviewer</label>
                                    <p className="text-base">{interview.interviewerName}</p>
                                    {interview.interviewerEmail && (
                                      <p className="text-sm text-muted-foreground">{interview.interviewerEmail}</p>
                                    )}
                                  </div>
                                )}
                                {interview.notes && (
                                  <div className="sm:col-span-2">
                                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                                    <p className="text-base whitespace-pre-wrap">{interview.notes}</p>
                                  </div>
                                )}
                                {interview.feedback && (
                                  <div className="sm:col-span-2">
                                    <label className="text-sm font-medium text-muted-foreground">Feedback</label>
                                    <p className="text-base whitespace-pre-wrap">{interview.feedback}</p>
                                  </div>
                                )}
                                {interview.rating && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Rating</label>
                                    <p className="text-base">{interview.rating}/5</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
              </CardContent>
            </Card>

                {/* Application Details */}
                <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Job Role Applied For</label>
                  <p className="text-base">{candidate.position}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Application Source</label>
                  <p className="text-base">{candidate.source || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Application Status</label>
                  <Badge variant={getStatusBadgeVariant(candidate.status)}>
                    {candidate.status}
                  </Badge>
                </div>
                {candidate.createdBy && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created By</label>
                    <p className="text-base">{candidate.createdBy.name} ({candidate.createdBy.role || 'System'})</p>
                  </div>
                )}
                {candidate.createdAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                    <p className="text-base">{new Date(candidate.createdAt).toLocaleDateString()}</p>
                  </div>
                )}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Skills</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {candidate.skills.map((skill: string, index: number) => (
                        <Badge key={index} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Reject Candidate Modal */}
        <Modal
          title="Reject Candidate"
          open={rejectModalOpen}
          onCancel={() => {
            setRejectModalOpen(false);
            setRejectionReason("");
            setRejectionNotes("");
          }}
          footer={null}
          width={600}
        >
          <div className="space-y-4">
            <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 rounded">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Warning:</strong> This action cannot be undone. Please provide a reason for rejecting this candidate.
              </p>
            </div>
            <Form layout="vertical" onFinish={handleRejectCandidate}>
              <Form.Item
                label="Rejection Reason"
                required
                rules={[{ required: true, message: 'Please provide a rejection reason' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Enter the reason for rejecting this candidate..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </Form.Item>
              <Form.Item label="Additional Notes (Optional)">
                <TextArea
                  rows={3}
                  placeholder="Enter any additional notes..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                />
              </Form.Item>
              <Form.Item>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => {
                      setRejectModalOpen(false);
                      setRejectionReason("");
                      setRejectionNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                  <AntButton
                    type="primary"
                    danger
                    htmlType="submit"
                    loading={isRejecting}
                    disabled={!rejectionReason.trim()}
                  >
                    Reject Candidate
                  </AntButton>
                </div>
              </Form.Item>
            </Form>
          </div>
        </Modal>

        {/* Edit Contact Modal */}
        <Modal
          title="Edit Candidate Contact"
          open={editContactModalOpen}
          onCancel={() => {
            setEditContactModalOpen(false);
            editContactForm.resetFields();
          }}
          footer={null}
          width={520}
          destroyOnHidden
        >
          <Form
            form={editContactForm}
            layout="vertical"
            onFinish={handleUpdateContact}
          >
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, message: 'First name is required' }]}
            >
              <Input placeholder="Enter first name" />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, message: 'Last name is required' }]}
            >
              <Input placeholder="Enter last name" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}
            >
              <Input placeholder="Enter email" />
            </Form.Item>
            <Form.Item
              name="countryCode"
              label="Country Code"
              rules={[{ required: true, message: "Country code is required" }]}
            >
              <Select
                value={selectedCountryCode}
                onChange={(value) => {
                  setSelectedCountryCode(value);
                  editContactForm.setFieldsValue({ countryCode: value });
                }}
                showSearch
                filterOption={(input, option) => {
                  const label = typeof option?.label === 'string' ? option.label : String(option?.label || '');
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {countryOptions.map((country) => (
                  <Option key={country.value} value={country.value}>
                    {country.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="phone"
              label="Mobile Number"
              rules={[
                { required: true, message: 'Phone number is required' },
                {
                  pattern: /^[0-9]{10}$/,
                  message: 'Mobile number must be exactly 10 digits'
                }
              ]}
            >
              <Input 
                placeholder="Enter phone number"
                maxLength={10}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  editContactForm.setFieldsValue({ phone: value });
                }}
              />
            </Form.Item>
            <Form.Item>
              <div className="flex justify-end gap-2">
                <AntButton 
                  onClick={() => {
                    setEditContactModalOpen(false);
                    editContactForm.resetFields();
                  }}
                  style={{ height: '32px' }}
                >
                  Cancel
                </AntButton>
                <AntButton 
                  type="primary" 
                  htmlType="submit" 
                  loading={isUpdatingCandidate}
                  style={{ height: '32px' }}
                >
                  Save Changes
                </AntButton>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* Schedule Interview Modal - Using the proper component */}
        {candidate && (
          <ScheduleInterviewModal
            isOpen={scheduleModalOpen}
            onClose={handleScheduleModalClose}
            candidateId={candidate._id}
            candidateName={`${candidate.firstName} ${candidate.lastName}`}
            roundNumber={selectedRoundForSchedule}
          />
        )}

        {/* Edit Interview Modal */}
        <Modal
          title="Edit Interview"
          open={editInterviewModalOpen}
          onCancel={() => {
            setEditInterviewModalOpen(false);
            interviewForm.resetFields();
            setSelectedInterview(null);
          }}
          footer={null}
          width={600}
        >
          <Form
            form={interviewForm}
            layout="vertical"
            onFinish={handleUpdateInterview}
          >
            <Form.Item
              name="interviewType"
              label="Interview Type"
              rules={[{ required: true, message: 'Please select interview type' }]}
            >
              <Select>
                <Select.Option value="Virtual">Virtual</Select.Option>
                <Select.Option value="In-Person">In-Person</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="interviewDate"
              label="Interview Date"
              rules={[{ required: true, message: 'Please select interview date' }]}
            >
              <DatePicker 
                className="w-full" 
                disabledDate={disablePastDate}
              />
            </Form.Item>

            <Form.Item
              name="interviewTime"
              label="Interview Time"
              rules={[{ required: true, message: 'Please select interview time' }]}
            >
              <TimePicker className="w-full" format="HH:mm" />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.interviewType !== currentValues.interviewType}
            >
              {({ getFieldValue }) =>
                getFieldValue('interviewType') === 'In-Person' ? (
                  <Form.Item
                    name="interviewLocation"
                    label="Interview Location"
                    rules={[{ required: true, message: 'Location is required for In-Person interviews' }]}
                  >
                    <Input placeholder="Enter interview location" />
                  </Form.Item>
                ) : (
                  <Form.Item name="interviewLocation" label="Interview Location">
                    <Input placeholder="Enter interview location (optional for Virtual)" />
                  </Form.Item>
                )
              }
            </Form.Item>

            <Form.Item
              name="interviewMode"
              label="Interview Mode"
              rules={[{ required: true, message: 'Please select interview mode' }]}
            >
              <Select>
                <Select.Option value="Virtual">Virtual</Select.Option>
                <Select.Option value="Direct">Direct</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="interviewerName"
              label="Interviewer Name"
            >
              <Input placeholder="Enter interviewer name" />
            </Form.Item>

            <Form.Item
              name="interviewerEmail"
              label="Interviewer Email"
            >
              <Input type="email" placeholder="Enter interviewer email" />
            </Form.Item>

            <Form.Item
              name="status"
              label="Interview Status"
            >
              <Select>
                <Select.Option value="Scheduled">Scheduled</Select.Option>
                <Select.Option value="Completed">Completed</Select.Option>
                <Select.Option value="Selected">Selected</Select.Option>
                <Select.Option value="Rejected">Rejected</Select.Option>
                <Select.Option value="Rescheduled">Rescheduled</Select.Option>
                <Select.Option value="Cancelled">Cancelled</Select.Option>
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
                <Button onClick={() => {
                  setEditInterviewModalOpen(false);
                  interviewForm.resetFields();
                  setSelectedInterview(null);
                }}>
                  Cancel
                </Button>
                <AntButton size="large" style={{ height: '40px' }} type="primary" htmlType="submit" loading={isUpdating}>
                  Update Interview
                </AntButton>
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </main>
    </MainLayout>
  );
};

export default CandidateProfile;
