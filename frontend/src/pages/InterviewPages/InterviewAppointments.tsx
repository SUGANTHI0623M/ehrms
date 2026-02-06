import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Eye, Edit, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import MainLayout from "@/components/MainLayout";
import dayjs, { Dayjs } from "dayjs";
import { DatePicker, TimePicker } from "antd";
import ClockTimePicker from "@/components/ui/clock-time-picker";
import { format, isBefore, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  useGetInterviewAppointmentsStatsQuery,
  useGetInterviewAppointmentsQuery,
  useGetInterviewCalendarQuery,
} from "@/store/api/interviewAppointmentsApi";
import { useUpdateInterviewMutation, useDeleteInterviewMutation, useGetInterviewByIdQuery } from "@/store/api/interviewApi";
import { useGetJobOpeningByIdQuery, useGetJobInterviewFlowQuery } from "@/store/api/jobOpeningApi";
import { toast } from "sonner";
import {
  formatInterviewStatus,
  getInterviewStatusColor,
} from "@/utils/constants";
import { useNavigate } from "react-router-dom";
import { getCandidateIdFromInterview } from "@/utils/helpers";
import { useAppSelector } from "@/store/hooks";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";
import { Pagination } from "@/components/ui/Pagination";
import { useGetCandidatesQuery } from "@/store/api/candidateApi";
import { useGetUsersQuery } from "@/store/api/userApi";

// Helper function to format date as YYYY-MM-DD without timezone issues
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const InterviewAppointments = () => {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const userPermissions = getUserPermissions(currentUser?.role, currentUser?.roleId, currentUser?.permissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default 10
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());

  // Handle date selection - also update visible month if needed
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Update visible month to match selected date's month
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const { data: statsData, isLoading: isLoadingStats } =
    useGetInterviewAppointmentsStatsQuery();
  const { data: appointmentsData, isLoading: isLoadingAppointments, refetch: refetchAppointments } =
    useGetInterviewAppointmentsQuery({
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
      limit: pageSize,
    });
  const [updateInterview, { isLoading: isUpdating }] = useUpdateInterviewMutation();
  const [deleteInterview, { isLoading: isDeleting }] = useDeleteInterviewMutation();
  
  // State for reschedule modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedInterviewForReschedule, setSelectedInterviewForReschedule] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [isReschedulePopoverOpen, setIsReschedulePopoverOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Fetch company users (needed for reschedule interviewer lookup)
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery({
    isActive: 'true',
    limit: 1000,
    companyId: currentUser?.companyId
  }, { skip: !currentUser?.companyId });
  
  // Get interview details for reschedule
  const interviewIdForReschedule = selectedInterviewForReschedule?._id;
  const { data: interviewData } = useGetInterviewByIdQuery(interviewIdForReschedule || "", { 
    skip: !interviewIdForReschedule 
  });
  
  // Get job ID from interview (try multiple sources)
  const jobIdForReschedule = useMemo(() => {
    // First try from fetched interview data
    if (interviewData?.data?.interview?.jobOpeningId) {
      const jobId = interviewData.data.interview.jobOpeningId;
      return typeof jobId === 'string' ? jobId : jobId?._id || null;
    }
    // Fallback to selected interview data
    if (selectedInterviewForReschedule?.jobOpeningId) {
      const jobId = selectedInterviewForReschedule.jobOpeningId;
      return typeof jobId === 'string' ? jobId : jobId?._id || null;
    }
    return null;
  }, [interviewData, selectedInterviewForReschedule]);
  
  // Fetch job and interview flow for reschedule
  const { data: jobDataForReschedule } = useGetJobOpeningByIdQuery(jobIdForReschedule || "", { 
    skip: !jobIdForReschedule 
  });
  const { data: flowDataForReschedule } = useGetJobInterviewFlowQuery(jobIdForReschedule || "", { 
    skip: !jobIdForReschedule 
  });
  
  // Get round details and assigned interviewer from flow
  const rescheduleRoundDetails = useMemo(() => {
    if (!flowDataForReschedule?.data?.job?.interviewRounds) return null;
    
    // Get round number from interview (jobStage or round)
    const roundNumber = selectedInterviewForReschedule?.jobStage || selectedInterviewForReschedule?.round || 1;
    const round = flowDataForReschedule.data.job.interviewRounds.find((r: any) => r.roundNumber === roundNumber);
    
    if (!round) return null;
    
    // Get assigned interviewer ID
    const interviewerId = round.assignedInterviewers && round.assignedInterviewers.length > 0
      ? (typeof round.assignedInterviewers[0] === 'object' 
          ? round.assignedInterviewers[0]._id 
          : round.assignedInterviewers[0])
      : null;
    
    return {
      roundNumber: round.roundNumber,
      roundName: round.roundName,
      assignedInterviewerId: interviewerId,
      assignedRole: round.assignedRole
    };
  }, [flowDataForReschedule, selectedInterviewForReschedule]);
  
  // Get interviewer details for reschedule
  const rescheduleInterviewer = useMemo(() => {
    if (!rescheduleRoundDetails?.assignedInterviewerId || !usersData?.data?.users) return null;
    return usersData.data.users.find((u: any) => u._id === rescheduleRoundDetails.assignedInterviewerId);
  }, [rescheduleRoundDetails, usersData]);
  
  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize reschedule date when interview is selected
  useEffect(() => {
    if (selectedInterviewForReschedule && selectedInterviewForReschedule.interviewDate && selectedInterviewForReschedule.interviewTime) {
      try {
        const interviewDate = new Date(selectedInterviewForReschedule.interviewDate);
        const [hours, minutes] = selectedInterviewForReschedule.interviewTime.split(':').map(Number);
        interviewDate.setHours(hours, minutes, 0, 0);
        setRescheduleDate(interviewDate);
      } catch (error) {
        console.error('Error initializing reschedule date:', error);
        setRescheduleDate(undefined);
      }
    } else {
      setRescheduleDate(undefined);
    }
  }, [selectedInterviewForReschedule]);

  // Get current month and year from visible month for calendar data
  const currentMonth = visibleMonth.getMonth() + 1;
  const currentYear = visibleMonth.getFullYear();

  // Fetch calendar data for the visible month
  const { data: calendarData, isLoading: isLoadingCalendar } = useGetInterviewCalendarQuery({
    month: currentMonth,
    year: currentYear,
  });

  // Debug: Log when selected date or calendar data changes
  useEffect(() => {
    if (selectedDate && calendarData?.data) {
      const dateKey = formatDateKey(selectedDate);
      const interviewsForDate = calendarData.data.calendar?.[dateKey] || [];
      console.log('Selected Date:', selectedDate.toLocaleDateString());
      console.log('Date Key:', dateKey);
      console.log('Interviews found:', interviewsForDate.length);
      console.log('Available calendar keys:', Object.keys(calendarData.data.calendar || {}));
    }
  }, [selectedDate, calendarData]);

  // Filter eligible interviewers: Admin, Manager, HR, Senior HR, Recruiter, and Employees with valid subRoles
  // This matches the same logic used in JobInterviewFlowManagement
  // Note: usersData is already declared above for reschedule functionality
  const interviewerUsers = (usersData?.data?.users || []).filter((user: any) => {
    // Only show active users
    if (!user.isActive) {
      return false;
    }

    // Check company match
    const userCompanyId = typeof user.companyId === 'string' 
      ? user.companyId 
      : user.companyId?._id;
    if (userCompanyId !== currentUser?.companyId) {
      return false;
    }

    // Check if user has interview-related role
    const interviewRoles = ['Super Admin', 'Admin', 'Manager', 'HR', 'Senior HR', 'Recruiter'];
    const userRole = user.role || '';
    const isInterviewerRole = interviewRoles.includes(userRole);
    
    // Check if Employee with valid subRole (Junior HR, Senior HR, or Manager)
    const validSubRoles = ['Junior HR', 'Senior HR', 'Manager'];
    const userSubRole = user.subRole || '';
    const isEmployeeWithValidSubRole = userRole === 'Employee' && 
      userSubRole && 
      validSubRoles.includes(userSubRole);

    return isInterviewerRole || isEmployeeWithValidSubRole;
  });

  // Handle reschedule interview
  const handleReschedule = async (interviewId: string, newDate: string, newTime: string) => {
    try {
      // Use assigned interviewer from flow (don't allow changing)
      const interviewerId = rescheduleRoundDetails?.assignedInterviewerId;
      const interviewer = rescheduleInterviewer;
      
      if (!interviewerId || !interviewer) {
        toast.error("No interviewer assigned for this round in the interview flow. Please configure the interview flow first.");
        return;
      }
      
      const updateData: any = {
        interviewDate: newDate,
        interviewTime: newTime,
        status: 'RESCHEDULED',
        interviewerId: interviewerId,
        interviewerName: interviewer.name || '',
        interviewerEmail: interviewer.email || ''
      };
      
      await updateInterview({
        id: interviewId,
        data: updateData
      }).unwrap();
      toast.success('Interview rescheduled successfully');
      setIsRescheduleModalOpen(false);
      setSelectedInterviewForReschedule(null);
      refetchAppointments();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || 'Failed to reschedule interview');
    }
  };

  // Handle cancel interview
  const handleCancel = async (interviewId: string) => {
    if (!confirm('Are you sure you want to cancel this interview?')) {
      return;
    }
    try {
      await deleteInterview(interviewId).unwrap();
      toast.success('Interview cancelled successfully');
      refetchAppointments();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || 'Failed to cancel interview');
    }
  };

  const stats = statsData?.data?.stats
    ? [
      {
        title: "Total",
        value: statsData.data.stats.total.toString(),
        color: "text-primary",
      },
      {
        title: "Today",
        value: statsData.data.stats.today.toString(),
        color: "text-green-600",
      },
      {
        title: "Upcoming",
        value: statsData.data.stats.upcoming.toString(),
        color: "text-orange-500",
      },
      {
        title: "Completed",
        value: statsData.data.stats.completed.toString(),
        color: "text-muted-foreground",
      },
    ]
    : [
      { title: "Total", value: "0", color: "text-primary" },
      { title: "Today", value: "0", color: "text-green-600" },
      { title: "Upcoming", value: "0", color: "text-orange-500" },
      { title: "Completed", value: "0", color: "text-muted-foreground" },
    ];

  const appointments = appointmentsData?.data?.interviews || [];

  const filteredAppointments = appointments.filter((apt) => {
    const candidate =
      typeof apt.candidateId === "object" ? apt.candidateId : null;
    const candidateName = candidate
      ? `${candidate.firstName} ${candidate.lastName}`
      : "";
    const matchesSearch =
      !searchQuery ||
      candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt._id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <MainLayout>
      <main className="p-3 sm:p-4">
        <div className="space-y-6">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">
              Interview Appointments
            </h1>
            <p className="text-sm text-muted-foreground">
              Interviews are scheduled from the candidate progress page based on interview flow templates.
            </p>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SCHEDULED TABLE + CALENDAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* TABLE */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                  <CardTitle>Scheduled Interviews</CardTitle>

                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search interviews..."
                        className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      )}
                    </div>

                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Interviewer</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAppointments ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            Loading interviews...
                          </TableCell>
                        </TableRow>
                      ) : filteredAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No interviews found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAppointments.map((apt) => {
                          const candidate =
                            typeof apt.candidateId === "object"
                              ? apt.candidateId
                              : null;
                          const interviewer =
                            typeof apt.interviewerId === "object"
                              ? apt.interviewerId
                              : null;
                          const candidateName = candidate
                            ? `${candidate.firstName} ${candidate.lastName}`
                            : "N/A";
                          // Get interviewer name - check multiple sources
                          let interviewerName = apt.interviewerName || null;
                          if (!interviewerName || interviewerName === "N/A") {
                            if (interviewer && typeof interviewer === 'object') {
                              // Check for name property (User model has 'name' field)
                              if (interviewer.name) {
                                interviewerName = interviewer.name;
                              } else if (interviewer.email) {
                                interviewerName = interviewer.email;
                              }
                            }
                          }
                          // Final fallback
                          if (!interviewerName || interviewerName === "N/A") {
                            interviewerName = apt.interviewerEmail || 'Not Assigned';
                          }
                          const interviewDate = new Date(apt.interviewDate);

                          return (
                            <TableRow key={apt._id}>
                              <TableCell className="font-medium">
                                {String(apt._id).slice(-6)}
                              </TableCell>
                              <TableCell>{candidateName}</TableCell>
                              <TableCell>
                                {candidate &&
                                  typeof candidate === "object" &&
                                  "position" in candidate
                                  ? String(candidate.position)
                                  : "N/A"}
                              </TableCell>
                              <TableCell>{interviewerName}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm">
                                    {interviewDate.toLocaleDateString()}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {apt.interviewTime}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {apt.interviewMode}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getInterviewStatusColor(
                                    apt.status
                                  )}
                                >
                                  {formatInterviewStatus(apt.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const candidateId = getCandidateIdFromInterview(apt);
                                      if (candidateId) {
                                        navigate(`/interview/candidate/${candidateId}/progress`);
                                      }
                                    }}
                                    disabled={!getCandidateIdFromInterview(apt)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {hasAction(userPermissions, 'interview_appointments', 'edit') && (
                                    <>
                                      {apt.status === 'SCHEDULED' && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedInterviewForReschedule(apt);
                                              setIsRescheduleModalOpen(true);
                                            }}
                                            disabled={isUpdating}
                                            title="Reschedule"
                                          >
                                            <Clock className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCancel(apt._id)}
                                            disabled={isDeleting}
                                            title="Cancel"
                                          >
                                            <X className="w-4 h-4 text-red-500" />
                                          </Button>
                                        </>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          // Extract candidate ID safely (handles both string and object)
                                          const candidateId = getCandidateIdFromInterview(apt);
                                          if (candidateId) {
                                            navigate(`/candidate/${candidateId}`);
                                          } else {
                                            console.error('Cannot navigate: Invalid candidateId for interview', apt._id);
                                            // Optionally show a toast/alert here
                                          }
                                        }}
                                        disabled={!getCandidateIdFromInterview(apt)}
                                        title="Edit"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {appointmentsData?.data && (
                  <div className="mt-6 pt-4 border-t">
                    <Pagination
                      page={appointmentsData.data.pagination?.page || page}
                      pageSize={pageSize}
                      total={appointmentsData.data.pagination?.total || (appointmentsData.data.interviews?.length || 0)}
                      pages={appointmentsData.data.pagination?.pages || Math.ceil((appointmentsData.data.pagination?.total || appointmentsData.data.interviews?.length || 0) / pageSize)}
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
              </CardContent>
            </Card>

            {/* CALENDAR PANEL */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-2">
                {/* Calendar Wrapper → Centers on small screens */}
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    month={visibleMonth}
                    onMonthChange={setVisibleMonth}
                    className="rounded-md border w-full sm:w-auto"
                  />
                </div>

                {/* Selected Date's Schedule */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    {selectedDate ? (
                      selectedDate.toDateString() === new Date().toDateString() 
                        ? "Today's Schedule" 
                        : `${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} Schedule`
                    ) : "Select a date"}
                  </h4>

                  <div className="flex flex-col gap-3">
                    {(() => {
                      if (!selectedDate) {
                        return (
                          <div className="p-3 border border-border rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">
                              Please select a date to view interviews
                            </p>
                          </div>
                        );
                      }

                      if (isLoadingCalendar) {
                        return (
                          <div className="p-3 border border-border rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">
                              Loading interviews...
                            </p>
                          </div>
                        );
                      }

                      // Format selected date as YYYY-MM-DD to match calendar data keys (timezone-safe)
                      const selectedDateKey = formatDateKey(selectedDate);
                      
                      // Also try UTC format in case backend uses UTC dates
                      const selectedDateKeyUTC = selectedDate.toISOString().split('T')[0];
                      
                      // Get interviews for the selected date from calendar data
                      // Try both local and UTC date keys
                      let selectedDateInterviews = 
                        calendarData?.data?.calendar?.[selectedDateKey] || 
                        calendarData?.data?.calendar?.[selectedDateKeyUTC] || 
                        [];
                      
                      // If no interviews found, try to find by comparing dates directly
                      // This handles any timezone conversion issues
                      if (selectedDateInterviews.length === 0 && calendarData?.data?.interviews) {
                        const selectedYear = selectedDate.getFullYear();
                        const selectedMonth = selectedDate.getMonth();
                        const selectedDay = selectedDate.getDate();
                        
                        // Try local date comparison
                        selectedDateInterviews = calendarData.data.interviews.filter((interview: any) => {
                          const interviewDate = new Date(interview.interviewDate);
                          const interviewYear = interviewDate.getFullYear();
                          const interviewMonth = interviewDate.getMonth();
                          const interviewDay = interviewDate.getDate();
                          
                          return (
                            interviewYear === selectedYear &&
                            interviewMonth === selectedMonth &&
                            interviewDay === selectedDay
                          );
                        });
                        
                        // If still no matches, try UTC comparison
                        if (selectedDateInterviews.length === 0) {
                          const selectedUTC = new Date(Date.UTC(
                            selectedDate.getFullYear(),
                            selectedDate.getMonth(),
                            selectedDate.getDate()
                          ));
                          const selectedUTCKey = selectedUTC.toISOString().split('T')[0];
                          
                          selectedDateInterviews = calendarData.data.interviews.filter((interview: any) => {
                            const interviewDate = new Date(interview.interviewDate);
                            const interviewUTCKey = interviewDate.toISOString().split('T')[0];
                            return interviewUTCKey === selectedUTCKey;
                          });
                        }
                      }

                      if (selectedDateInterviews.length === 0) {
                        const dateStr = selectedDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                        return (
                          <div className="p-3 border border-border rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">
                              No interviews scheduled for {dateStr}
                            </p>
                          </div>
                        );
                      }

                      // Sort by interview time
                      const sortedInterviews = [...selectedDateInterviews].sort((a, b) => {
                        const timeA = a.interviewTime || '';
                        const timeB = b.interviewTime || '';
                        return timeA.localeCompare(timeB);
                      });

                      return sortedInterviews.map((apt) => {
                        const candidate = typeof apt.candidateId === 'object' ? apt.candidateId : null;
                        const interviewer = typeof apt.interviewerId === 'object' ? apt.interviewerId : null;
                        const candidateName = candidate 
                          ? `${candidate.firstName} ${candidate.lastName}` 
                          : 'N/A';
                        const position = candidate && typeof candidate === 'object' && 'position' in candidate 
                          ? String(candidate.position) 
                          : 'N/A';
                        // Get interviewer name for calendar view - prioritize backend-provided interviewerName
                        let interviewerName = apt.interviewerName || null;
                        
                        // If interviewerName is not set or is 'N/A', try to extract from populated interviewer object
                        if (!interviewerName || interviewerName === 'N/A') {
                          if (interviewer && typeof interviewer === 'object') {
                            // User model has 'name' field, not firstName/lastName
                            if (interviewer.name) {
                              interviewerName = interviewer.name;
                            } else if (interviewer.email) {
                              interviewerName = interviewer.email;
                            }
                          }
                        }
                        
                        // Final fallback
                        if (!interviewerName || interviewerName === 'N/A') {
                          interviewerName = apt.interviewerEmail || 'Not Assigned';
                        }

                        return (
                          <div 
                            key={apt._id} 
                            className="p-3 border border-border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{apt.interviewTime || 'N/A'}</span>
                            </div>
                            <div className="flex flex-col sm:items-end gap-1">
                              <p className="text-sm font-medium text-foreground">
                                {candidateName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {position}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Interviewer: {interviewerName}
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reschedule Interview Modal */}
        {selectedInterviewForReschedule && (
          <Dialog 
            open={isRescheduleModalOpen} 
            onOpenChange={(open) => {
              setIsRescheduleModalOpen(open);
              if (!open) {
                setSelectedInterviewForReschedule(null);
                setRescheduleDate(undefined);
              }
            }}
          >
            <DialogContent className="w-[95%] sm:w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Reschedule Interview</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Update the date and time for this interview
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 sm:py-4">
                {/* Mobile: Use Ant Design DatePicker and TimePicker */}
                {isMobile ? (
                  <>
                    <div>
                      <Label className="text-sm sm:text-base mb-2 block">New Interview Date *</Label>
                      <DatePicker
                        className="w-full text-sm"
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                        defaultValue={rescheduleDate ? dayjs(rescheduleDate) : undefined}
                        format="YYYY-MM-DD"
                        onChange={(date) => {
                          if (date) {
                            const newDate = new Date(rescheduleDate || selectedInterviewForReschedule.interviewDate || new Date());
                            newDate.setFullYear(date.year(), date.month(), date.date());
                            setRescheduleDate(newDate);
                            setSelectedInterviewForReschedule({
                              ...selectedInterviewForReschedule,
                              newDate: date.format('YYYY-MM-DD')
                            });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-sm sm:text-base mb-2 block">New Interview Time *</Label>
                      <TimePicker
                        className="w-full text-sm"
                        format="HH:mm"
                        defaultValue={rescheduleDate && selectedInterviewForReschedule.interviewTime 
                          ? dayjs(selectedInterviewForReschedule.interviewTime, 'HH:mm') 
                          : undefined}
                        placeholder="Select time"
                        onChange={(time) => {
                          if (time && rescheduleDate) {
                            const newDate = new Date(rescheduleDate);
                            newDate.setHours(time.hour(), time.minute(), 0, 0);
                            setRescheduleDate(newDate);
                            setSelectedInterviewForReschedule({
                              ...selectedInterviewForReschedule,
                              newTime: time.format('HH:mm')
                            });
                          }
                        }}
                      />
                    </div>
                  </>
                ) : (
                  /* Desktop: Use Clock Time Picker */
                  <div>
                    <Label className="text-sm sm:text-base mb-2 block">New Interview Date & Time *</Label>
                    <Popover open={isReschedulePopoverOpen} onOpenChange={setIsReschedulePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 px-2 sm:px-3 text-xs sm:text-sm",
                            !rescheduleDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">
                            {rescheduleDate ? (
                              format(rescheduleDate, "MMM dd, yyyy - hh:mm a")
                            ) : (
                              "Pick a date and time"
                            )}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-[calc(100vw-2rem)] max-w-[600px] lg:max-w-[700px] p-0 z-[2000]" 
                        align="start"
                        sideOffset={4}
                        side="left"
                      >
                        <div className="flex flex-row divide-x" style={{ maxHeight: '85vh' }}>
                          <div className="p-3 md:p-4 flex-shrink-0 overflow-y-auto" style={{ maxHeight: '85vh' }}>
                            <div className="mb-2 font-semibold text-sm md:text-base">Select Date</div>
                            <div className="flex justify-center">
                              <Calendar
                                mode="single"
                                selected={rescheduleDate}
                                onSelect={(date) => {
                                  if (date) {
                                    const newDate = new Date(rescheduleDate || selectedInterviewForReschedule.interviewDate || new Date());
                                    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                    const now = new Date();
                                    if (startOfDay(newDate).getTime() === startOfDay(now).getTime()) {
                                      const minTime = new Date(now.getTime() + 60 * 60 * 1000);
                                      if (newDate.getTime() < minTime.getTime()) {
                                        newDate.setHours(minTime.getHours(), minTime.getMinutes(), 0, 0);
                                      }
                                    }
                                    setRescheduleDate(newDate);
                                  }
                                }}
                                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                                initialFocus
                              />
                            </div>
                          </div>
                          <div className="p-3 md:p-4 flex-shrink-0 flex flex-col" style={{ maxHeight: '85vh' }}>
                            <div className="flex-1 overflow-y-auto overflow-x-auto pb-2">
                              <ClockTimePicker
                                date={rescheduleDate}
                                setDate={(date) => { 
                                  if (date) {
                                    setRescheduleDate(date);
                                    setSelectedInterviewForReschedule({
                                      ...selectedInterviewForReschedule,
                                      newDate: format(date, 'yyyy-MM-dd'),
                                      newTime: format(date, 'HH:mm')
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div className="mt-4 pt-3 pb-2 flex justify-end flex-shrink-0 bg-white">
                              <Button 
                                size="sm" 
                                className="w-auto text-sm md:text-base" 
                                onClick={() => setIsReschedulePopoverOpen(false)}
                              >
                                Set Time
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                {/* Display round and assigned interviewer from flow (read-only) */}
                <div>
                  <Label className="text-sm sm:text-base">Round Details</Label>
                  <div className="p-3 bg-slate-50 rounded-md border space-y-2">
                    {rescheduleRoundDetails ? (
                      <>
                        <div>
                          <span className="text-xs text-muted-foreground">Round:</span>
                          <span className="ml-2 font-medium text-sm">
                            {rescheduleRoundDetails.roundName || `Round ${rescheduleRoundDetails.roundNumber}`}
                          </span>
                        </div>
                        {rescheduleInterviewer ? (
                          <div>
                            <span className="text-xs text-muted-foreground">Assigned Interviewer:</span>
                            <div className="mt-1">
                              <span className="font-medium text-sm">
                                {rescheduleInterviewer.name}
                              </span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                {rescheduleInterviewer.role === 'Employee' && rescheduleInterviewer.subRole 
                                  ? `${rescheduleInterviewer.role} (${rescheduleInterviewer.subRole})` 
                                  : rescheduleInterviewer.role}
                                {rescheduleInterviewer.email && ` • ${rescheduleInterviewer.email}`}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            No interviewer assigned for this round
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {flowDataForReschedule ? "Loading round details..." : "No interview flow configured for this job"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Interviewer is assigned from the interview flow configuration. To change, update the interview flow for this job.
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 sm:pt-0">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto text-xs sm:text-sm md:text-base touch-manipulation"
                  onClick={() => {
                    setIsRescheduleModalOpen(false);
                    setSelectedInterviewForReschedule(null);
                    setRescheduleDate(undefined);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full sm:w-auto text-xs sm:text-sm md:text-base touch-manipulation"
                  onClick={() => {
                    if (isMobile) {
                      // For mobile, check if date and time are set in the state
                      if (selectedInterviewForReschedule.newDate && selectedInterviewForReschedule.newTime) {
                        handleReschedule(
                          selectedInterviewForReschedule._id,
                          selectedInterviewForReschedule.newDate,
                          selectedInterviewForReschedule.newTime
                        );
                      } else {
                        toast.error('Please select both date and time');
                      }
                    } else {
                      // For desktop, use rescheduleDate
                      if (rescheduleDate) {
                        const newDate = format(rescheduleDate, 'yyyy-MM-dd');
                        const newTime = format(rescheduleDate, 'HH:mm');
                        handleReschedule(
                          selectedInterviewForReschedule._id,
                          newDate,
                          newTime
                        );
                      } else {
                        toast.error('Please select both date and time');
                      }
                    }
                  }}
                  disabled={isUpdating || (isMobile ? (!selectedInterviewForReschedule.newDate || !selectedInterviewForReschedule.newTime) : !rescheduleDate)}
                >
                  {isUpdating ? 'Rescheduling...' : 'Reschedule'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </MainLayout>
  );
};

export default InterviewAppointments;
