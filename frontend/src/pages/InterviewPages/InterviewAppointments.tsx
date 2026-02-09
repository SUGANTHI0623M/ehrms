import { useState, useEffect } from "react";
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
  DialogTrigger,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Search, Eye, Edit, Plus, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import MainLayout from "@/components/MainLayout";
import {
  useGetInterviewAppointmentsStatsQuery,
  useGetInterviewAppointmentsQuery,
  useGetInterviewCalendarQuery,
} from "@/store/api/interviewAppointmentsApi";
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
import ScheduleInterviewModal from "@/components/candidate/ScheduleInterviewModal";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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
  
  // Candidate selection state
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<{ id: string; name: string; position: string } | null>(null);
  const [isCandidatePopoverOpen, setIsCandidatePopoverOpen] = useState(false);
  
  // Schedule Interview Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const { data: statsData, isLoading: isLoadingStats } =
    useGetInterviewAppointmentsStatsQuery();
  const { data: appointmentsData, isLoading: isLoadingAppointments } =
    useGetInterviewAppointmentsQuery({
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
      limit: pageSize,
    });

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

  // Fetch candidates for selection
  const { data: candidatesData, isLoading: isLoadingCandidates } = useGetCandidatesQuery({
    search: candidateSearch || undefined,
    limit: 100, // Get more candidates for selection
    page: 1,
  });

  const candidates = candidatesData?.data?.candidates || [];

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

  // Handle candidate selection
  const handleCandidateSelect = (candidate: any) => {
    setSelectedCandidate({
      id: candidate._id,
      name: `${candidate.firstName} ${candidate.lastName}`,
      position: candidate.position || "N/A"
    });
    setIsCandidatePopoverOpen(false);
    setCandidateSearch("");
  };

  // Handle schedule interview - open the ScheduleInterviewModal
  const handleScheduleClick = () => {
    if (!selectedCandidate) {
      alert("Please select a candidate first");
      return;
    }
    setIsAddDialogOpen(false);
    setIsScheduleModalOpen(true);
  };

  // Reset form when dialog closes
  const handleDialogClose = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setSelectedCandidate(null);
      setCandidateSearch("");
    }
  };

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

            {hasAction(userPermissions, 'interview_appointments', 'schedule') && (
              <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Interview
                  </Button>
                </DialogTrigger>

                {/* RESPONSIVE DIALOG */}
                <DialogContent className="max-w-2xl w-[95vw] sm:w-full sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Schedule New Interview</DialogTitle>
                    <DialogDescription>
                      Select a candidate to schedule an interview
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-4">
                    <div className="space-y-2">
                      <Label>Select Candidate <span className="text-red-500">*</span></Label>
                      <Popover open={isCandidatePopoverOpen} onOpenChange={setIsCandidatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isCandidatePopoverOpen}
                            className="w-full justify-between"
                            disabled={isLoadingCandidates}
                          >
                            {selectedCandidate
                              ? `${selectedCandidate.name} - ${selectedCandidate.position}`
                              : "Search and select candidate..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search candidates by name, email, or position..."
                              value={candidateSearch}
                              onValueChange={setCandidateSearch}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {isLoadingCandidates ? "Loading candidates..." : "No candidates found."}
                              </CommandEmpty>
                              <CommandGroup>
                                {candidates.map((candidate) => (
                                  <CommandItem
                                    key={candidate._id}
                                    value={`${candidate.firstName} ${candidate.lastName} ${candidate.email} ${candidate.position}`}
                                    onSelect={() => handleCandidateSelect(candidate)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCandidate?.id === candidate._id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {candidate.firstName} {candidate.lastName}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {candidate.position} • {candidate.email}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {selectedCandidate && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-md border">
                        <h3 className="text-lg font-semibold mb-2">{selectedCandidate.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">Position:</span>
                          <span>{selectedCandidate.position}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDialogClose(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleScheduleClick}
                      disabled={!selectedCandidate}
                    >
                      Continue to Schedule
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
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
                          const interviewerName = interviewer
                            ? interviewer.name
                            : apt.interviewerName || "N/A";
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
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const candidateId = getCandidateIdFromInterview(apt);
                                      if (candidateId) {
                                        navigate(`/candidate/${candidateId}`);
                                      }
                                    }}
                                    disabled={!getCandidateIdFromInterview(apt)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {hasAction(userPermissions, 'interview_appointments', 'edit') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // Extract candidate ID safely (handles both string and object)
                                        const candidateId = getCandidateIdFromInterview(apt);
                                        if (candidateId) {
                                          navigate(`/interview/candidate/${candidateId}/progress`);
                                        } else {
                                          console.error('Cannot navigate: Invalid candidateId for interview', apt._id);
                                          // Optionally show a toast/alert here
                                        }
                                      }}
                                      disabled={!getCandidateIdFromInterview(apt)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
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
                        const candidateName = candidate 
                          ? `${candidate.firstName} ${candidate.lastName}` 
                          : 'N/A';
                        const position = candidate && typeof candidate === 'object' && 'position' in candidate 
                          ? String(candidate.position) 
                          : 'N/A';

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

        {/* Schedule Interview Modal */}
        <ScheduleInterviewModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setSelectedCandidate(null);
            setCandidateSearch("");
            // Refetch appointments to show the newly scheduled interview
            // The appointments query will automatically refetch
          }}
          candidateId={selectedCandidate?.id || null}
          candidateName={selectedCandidate?.name || ""}
        />
      </main>
    </MainLayout>
  );
};

export default InterviewAppointments;
