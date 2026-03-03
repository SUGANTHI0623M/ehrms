import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  X,
  Eye,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  useGetAttendanceQuery,
  useGetAttendanceStatsQuery,
  useApproveAttendanceMutation,
  useUpdateAttendanceMutation,
  useMarkAttendanceMutation,
  useProcessFaceMatchingMutation,
} from "@/store/api/attendanceApi";
import {
  format,
  isToday,
  isSameDay,
  addDays,
  subDays,
  parseISO,
} from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { message } from "antd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClockTimePicker from "@/components/ui/clock-time-picker";
import { formatINR } from "@/utils/currencyUtils";

const AdminAttendance = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>("Present");
  const [remarks, setRemarks] = useState<string>("");
  const [punchInTime, setPunchInTime] = useState<Date | undefined>(undefined);
  const [punchOutTime, setPunchOutTime] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");

  const [updateAttendance] = useUpdateAttendanceMutation();
  const [markAttendance] = useMarkAttendanceMutation();
  const [processFaceMatching, { isLoading: isProcessingFaceMatch }] = useProcessFaceMatchingMutation();

  // Format selected date for API
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch attendance for selected date - include all employees
  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    refetch,
  } = useGetAttendanceQuery({
    date: selectedDateStr,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: currentPage,
    limit: pageSize,
    includeAllEmployees: true, // Show all employees even if they haven't marked attendance
    search: debouncedSearchQuery || undefined, // Send search query to backend (already normalized)
  });

  const [approveAttendance] = useApproveAttendanceMutation();

  // Fetch stats for selected date
  const { data: statsData, isLoading: isLoadingStats } =
    useGetAttendanceStatsQuery({
      date: selectedDateStr,
    });

  const attendanceRecords = attendanceData?.data?.attendance || [];
  const pagination = attendanceData?.data?.pagination;
  const stats = statsData?.data?.stats;

  // Reset page when date or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, statusFilter, debouncedSearchQuery]);

  const normalizeSearch = (q: string) => q.trim().replace(/\s+/g, " ");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(normalizeSearch(searchQuery));
      setCurrentPage(1); // Reset to first page when search changes
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Navigate to previous/next day
  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";
    return format(parseISO(dateString), "hh:mm a");
  };

  const formatWorkHours = (minutes?: number) => {
    if (!minutes) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return (
          <Badge variant="default" className="bg-[#efaa1f] hover:bg-[#efaa1f]">
            Present
          </Badge>
        );
      case "Absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "Half Day":
        return <Badge variant="secondary">Half Day</Badge>;
      case "On Leave":
        return <Badge variant="outline">On Leave</Badge>;
      case "Pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">Not Marked</Badge>;
    }
  };

  const handleApprove = async () => {
    if (!selectedAttendance) return;

    try {
      await approveAttendance({
        id: selectedAttendance._id,
        status: approvalStatus,
        remarks: remarks || undefined,
      }).unwrap();

      message.success(`Attendance marked as ${approvalStatus} successfully`);
      setSelectedAttendance(null);
      setRemarks("");
      setApprovalStatus("Present");
      setPunchInTime(undefined);
      setPunchOutTime(undefined);
      refetch();
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to approve attendance",
      );
    }
  };

  const handleUpdate = async () => {
    if (!selectedAttendance) return;

    try {
      // If record doesn't have _id, it means it's a new record - create it
      if (!selectedAttendance._id) {
        const employeeId = (selectedAttendance.employeeId as any)?._id;
        if (!employeeId) {
          message.error("Employee ID is required");
          return;
        }

        const markData: any = {
          employeeId: employeeId,
          date: selectedDateStr,
          status: approvalStatus,
        };

        if (remarks) {
          markData.remarks = remarks;
        }

        if (punchInTime) {
          // Combine selected date with punch in time
          const punchInDate = new Date(selectedDate);
          punchInDate.setHours(punchInTime.getHours());
          punchInDate.setMinutes(punchInTime.getMinutes());
          punchInDate.setSeconds(punchInTime.getSeconds());
          markData.punchIn = punchInDate.toISOString();
        }

        if (punchOutTime) {
          // Combine selected date with punch out time
          const punchOutDate = new Date(selectedDate);
          punchOutDate.setHours(punchOutTime.getHours());
          punchOutDate.setMinutes(punchOutTime.getMinutes());
          punchOutDate.setSeconds(punchOutTime.getSeconds());
          markData.punchOut = punchOutDate.toISOString();
        }

        await markAttendance(markData).unwrap();
        message.success("Attendance created successfully");
      } else {
        // Update existing record
        const updateData: any = {
          status: approvalStatus,
        };

        if (remarks) {
          updateData.remarks = remarks;
        }

        if (punchInTime) {
          // Combine selected date with punch in time
          const punchInDate = new Date(selectedDate);
          punchInDate.setHours(punchInTime.getHours());
          punchInDate.setMinutes(punchInTime.getMinutes());
          punchInDate.setSeconds(punchInTime.getSeconds());
          updateData.punchIn = punchInDate.toISOString();
        } else if (selectedAttendance.punchIn) {
          // Keep existing punch in: always send ISO string so dev/local behave the same
          const existing = selectedAttendance.punchIn;
          updateData.punchIn =
            typeof existing === "string"
              ? existing
              : new Date(existing).toISOString();
        }

        if (punchOutTime) {
          // Combine selected date with punch out time
          const punchOutDate = new Date(selectedDate);
          punchOutDate.setHours(punchOutTime.getHours());
          punchOutDate.setMinutes(punchOutTime.getMinutes());
          punchOutDate.setSeconds(punchOutTime.getSeconds());
          updateData.punchOut = punchOutDate.toISOString();
        } else if (selectedAttendance.punchOut) {
          // Keep existing punch out: always send ISO string so dev/local behave the same
          const existing = selectedAttendance.punchOut;
          updateData.punchOut =
            typeof existing === "string"
              ? existing
              : new Date(existing).toISOString();
        }

        await updateAttendance({
          id: selectedAttendance._id,
          data: updateData,
        }).unwrap();
        message.success("Attendance updated successfully");
      }

      setSelectedAttendance(null);
      setRemarks("");
      setApprovalStatus("Present");
      setPunchInTime(undefined);
      setPunchOutTime(undefined);
      refetch();
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to update attendance",
      );
    }
  };

  const handleQuickApprove = async (attendance: any, status: string) => {
    try {
      // If record doesn't have _id, create new attendance record
      if (!attendance._id) {
        const employeeId = (attendance.employeeId as any)?._id;
        if (!employeeId) {
          message.error("Employee ID is required");
          return;
        }

        await markAttendance({
          employeeId: employeeId,
          date: selectedDateStr,
          status: status as
            | "Present"
            | "Pending"
            | "Absent"
            | "On Leave"
            | "Half Day"
            | "Not Marked",
        }).unwrap();
        message.success(`Attendance marked as ${status} successfully`);
      } else {
        await approveAttendance({
          id: attendance._id,
          status: status,
        }).unwrap();
        message.success(`Attendance marked as ${status} successfully`);
      }
      refetch();
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to approve attendance",
      );
    }
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6 max-w-7xl">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Employee Attendance
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                View and manage employee attendance records
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[240px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={goToNextDay}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {!isToday(selectedDate) && (
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
              )}
            </div>
          </div>

          {/* Statistics Section - Moved to Top */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 min-[1301px]:grid-cols-6 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 min-[1301px]:grid-cols-6 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-[#efaa1f]" />
                      <span className="text-sm font-medium">Present</span>
                    </div>
                    <span className="text-lg font-bold text-[#efaa1f]">
                      {stats?.present || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <UserX className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium">Absent</span>
                    </div>
                    <span className="text-lg font-bold text-red-600">
                      {stats?.absent || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">Punched In</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {stats?.punchedIn || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium">On Leave</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">
                      {stats?.onLeave || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Not Marked</span>
                    </div>
                    <span className="text-lg font-bold text-muted-foreground">
                      {stats?.notMarked || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg border-yellow-200 bg-yellow-50">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium">Pending</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">
                      {stats?.pending || 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee List Section - Full Width */}
          <div className="w-full">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>
                    Attendance for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Status Filter Tabs */}
                <Tabs
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1); // Reset to first page when switching tabs
                  }}
                  className="mb-4"
                >
                  <TabsList>
                    <TabsTrigger value="all">
                      All
                      {pagination?.total !== undefined && pagination.total > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-2 px-1.5 py-0 text-xs"
                        >
                          {pagination.total}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="Pending">
                      Pending
                      {stats?.pending !== undefined && stats.pending > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 px-1.5 py-0 text-xs"
                        >
                          {stats.pending}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="Present">
                      Present
                      {stats?.present !== undefined && stats.present > 0 && (
                        <Badge
                          variant="default"
                          className="ml-2 px-1.5 py-0 text-xs bg-[#efaa1f] hover:bg-[#efaa1f]"
                        >
                          {stats.present}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="Absent">
                      Absent
                      {stats?.absent !== undefined && stats.absent > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-2 px-1.5 py-0 text-xs"
                        >
                          {stats.absent}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="On Leave">
                      On Leave
                      {stats?.onLeave !== undefined && stats.onLeave > 0 && (
                        <Badge
                          variant="outline"
                          className="ml-2 px-1.5 py-0 text-xs"
                        >
                          {stats.onLeave}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {isLoadingAttendance ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      No attendance records found
                    </p>
                    <p className="text-sm">
                      No employees have marked attendance for this date.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Search Bar */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          type="text"
                          placeholder="Search by employee name or ID (case-insensitive)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setSearchQuery("")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            {/* <TableHead>Joining Date</TableHead> */}
                            <TableHead>Department</TableHead>
                            <TableHead>Punch In</TableHead>
                            <TableHead>Punch Out</TableHead>
                            <TableHead>Face Match</TableHead>
                            <TableHead>Work Hours</TableHead>
                            <TableHead>Late / Early / Fine</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Remarks/Reasons</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceRecords.map((record: any) => {
                            const employee = record.employeeId;
                            const name = (employee as any)?.name || "N/A";
                            const employeeId =
                              (employee as any)?.employeeId || "N/A";
                            const department =
                              (employee as any)?.department || "N/A";
                            // const joiningDate = (employee as any)?.joiningDate;

                            return (
                              <TableRow
                                key={record._id || `emp-${employee?._id}`}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {(employee as any)?.avatar ? (
                                      <img
                                        src={(employee as any).avatar}
                                        alt={name}
                                        className="w-8 h-8 rounded-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                        {name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-medium">{name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {employeeId}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                {/* <TableCell className="text-sm">
                                    {joiningDate ? format(parseISO(joiningDate), "MMM dd, yyyy") : "-"}
                                  </TableCell> */}
                                <TableCell className="text-sm">
                                  {department}
                                </TableCell>
                                <TableCell>
                                  {record.punchIn ? (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-muted-foreground" />
                                      <div>
                                        <div className="font-medium">
                                          {formatTime(record.punchIn)}
                                        </div>
                                        {record.punchInIpAddress && (
                                          <div className="text-xs text-muted-foreground">
                                            IP: {record.punchInIpAddress}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {record.punchOut ? (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-muted-foreground" />
                                      <div>
                                        <div className="font-medium">
                                          {formatTime(record.punchOut)}
                                        </div>
                                        {record.punchOutIpAddress && (
                                          <div className="text-xs text-muted-foreground">
                                            IP: {record.punchOutIpAddress}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-2 min-w-[120px]">
                                    {/* Punch In Section */}
                                    {record.punchInSelfie ? (
                                      <div className="flex items-center gap-2">
                                        <div className="relative group">
                                          <img
                                            src={record.punchInSelfie}
                                            alt="Punch In Selfie"
                                            className="w-12 h-12 rounded object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => {
                                              setSelectedAttendance({ ...record, viewSelfie: 'punchIn' });
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors flex items-center justify-center">
                                            <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                                          </div>
                                        </div>
                                        {record.punchInFaceMatch !== undefined && record.punchInFaceMatch !== null ? (
                                          <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">In</span>
                                            <Badge
                                              variant={
                                                record.punchInFaceMatch >= 80
                                                  ? "default"
                                                  : record.punchInFaceMatch >= 60
                                                  ? "secondary"
                                                  : "destructive"
                                              }
                                              className="text-sm font-semibold w-fit"
                                            >
                                              {Math.round(record.punchInFaceMatch)}%
                                            </Badge>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">Pending</span>
                                        )}
                                      </div>
                                    ) : null}

                                    {/* Punch Out Section */}
                                    {record.punchOutSelfie ? (
                                      <div className="flex items-center gap-2">
                                        <div className="relative group">
                                          <img
                                            src={record.punchOutSelfie}
                                            alt="Punch Out Selfie"
                                            className="w-12 h-12 rounded object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => {
                                              setSelectedAttendance({ ...record, viewSelfie: 'punchOut' });
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded transition-colors flex items-center justify-center">
                                            <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                                          </div>
                                        </div>
                                        {record.punchOutFaceMatch !== undefined && record.punchOutFaceMatch !== null ? (
                                          <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Out</span>
                                            <Badge
                                              variant={
                                                record.punchOutFaceMatch >= 80
                                                  ? "default"
                                                  : record.punchOutFaceMatch >= 60
                                                  ? "secondary"
                                                  : "destructive"
                                              }
                                              className="text-sm font-semibold w-fit"
                                            >
                                              {Math.round(record.punchOutFaceMatch)}%
                                            </Badge>
                                          </div>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">Pending</span>
                                        )}
                                      </div>
                                    ) : null}

                                    {/* Process Match Button - Only show when BOTH selfies exist and at least one is not processed */}
                                    {record.punchInSelfie && 
                                     record.punchOutSelfie && 
                                     (record.punchInFaceMatch === undefined || 
                                      record.punchInFaceMatch === null ||
                                      record.punchOutFaceMatch === undefined || 
                                      record.punchOutFaceMatch === null) && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            const result = await processFaceMatching({ attendanceId: record._id || '' }).unwrap();
                                            const punchInMatch = result.data?.attendance?.punchInFaceMatch;
                                            const punchOutMatch = result.data?.attendance?.punchOutFaceMatch;
                                            
                                            let alertMessage = 'Face matching completed successfully!\n\n';
                                            if (punchInMatch !== undefined && punchInMatch !== null) {
                                              alertMessage += `Punch In: ${Math.round(punchInMatch)}% match\n`;
                                            }
                                            if (punchOutMatch !== undefined && punchOutMatch !== null) {
                                              alertMessage += `Punch Out: ${Math.round(punchOutMatch)}% match`;
                                            }
                                            
                                            message.success({
                                              content: alertMessage.trim(),
                                              duration: 4,
                                            });
                                            refetch();
                                          } catch (error: any) {
                                            message.error({
                                              content: error?.data?.error?.message || 'Failed to process face matching',
                                              duration: 3,
                                            });
                                          }
                                        }}
                                        disabled={isProcessingFaceMatch}
                                        className="w-full mt-1"
                                      >
                                        {isProcessingFaceMatch ? 'Processing...' : 'Process Match'}
                                      </Button>
                                    )}

                                    {/* Show N/A if no selfies */}
                                    {!record.punchInSelfie && !record.punchOutSelfie && (
                                      <span className="text-muted-foreground text-xs">N/A</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatWorkHours(record.workHours)}
                                </TableCell>
                                <TableCell>
                                  {(record.lateMinutes && record.lateMinutes > 0) ||
                                  (record.earlyMinutes && record.earlyMinutes > 0) ||
                                  (record.fineAmount != null && record.fineAmount > 0) ? (
                                    <div className="flex flex-col gap-0.5 text-xs">
                                      {record.lateMinutes > 0 && (
                                        <div className="flex items-center gap-1 text-red-600">
                                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                          <span>
                                            Late: {Math.floor(record.lateMinutes / 60)}h {record.lateMinutes % 60}m
                                          </span>
                                        </div>
                                      )}
                                      {record.earlyMinutes > 0 && (
                                        <div className="flex items-center gap-1 text-amber-600">
                                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                          <span>
                                            Early: {Math.floor(record.earlyMinutes / 60)}h {record.earlyMinutes % 60}m
                                          </span>
                                        </div>
                                      )}
                                      {record.fineAmount != null && record.fineAmount > 0 ? (
                                        <div className="text-red-600 font-medium mt-0.5">
                                          Fine: {formatINR(record.fineAmount)}
                                        </div>
                                      ) : (record.punchIn && record.punchOut) ? (
                                        <div className="text-muted-foreground">No fine</div>
                                      ) : null}
                                    </div>
                                  ) : (record.punchIn && record.punchOut) ? (
                                    <span className="text-muted-foreground text-xs">No fine</span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    {getStatusBadge(record.status)}
                                    {record.status === "Pending" &&
                                      record.halfDaySession && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs w-fit"
                                        >
                                          {record.halfDaySession}
                                        </Badge>
                                      )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {record.leaveType ? (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {record.leaveType}
                                      {record.halfDaySession &&
                                        ` - ${record.halfDaySession}`}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-[250px]">
                                  {record.remarks ? (
                                    <div className="text-xs space-y-1">
                                      <div className="font-medium text-foreground">
                                        Admin Remarks:
                                      </div>
                                      <div
                                        className="text-muted-foreground break-words bg-muted/50 p-2 rounded border"
                                        title={record.remarks}
                                      >
                                        {record.remarks}
                                      </div>
                                      {record.approvedBy && (
                                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                          {typeof record.approvedBy ===
                                            "object" &&
                                          record.approvedBy?.name ? (
                                            <>
                                              <span>
                                                By: {record.approvedBy.name}
                                              </span>
                                              {record.approvedAt && (
                                                <span>
                                                  •{" "}
                                                  {format(
                                                    parseISO(
                                                      record.approvedAt.toString(),
                                                    ),
                                                    "MMM dd, yyyy",
                                                  )}
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            record.approvedAt && (
                                              <span>
                                                Approved on{" "}
                                                {format(
                                                  parseISO(
                                                    record.approvedAt.toString(),
                                                  ),
                                                  "MMM dd, yyyy",
                                                )}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {record.location ? (
                                    <div className="flex items-start gap-1 text-xs max-w-[250px]">
                                      <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                                      <div className="min-w-0">
                                        {record.location.address ? (
                                          <>
                                            <span
                                              className="block break-words font-medium"
                                              title={record.location.address}
                                            >
                                              {record.location.address}
                                            </span>
                                            {record.location.latitude &&
                                              record.location.longitude && (
                                                <span className="text-muted-foreground text-[10px] mt-0.5 block">
                                                  {record.location.latitude.toFixed(
                                                    4,
                                                  )}
                                                  ,{" "}
                                                  {record.location.longitude.toFixed(
                                                    4,
                                                  )}
                                                </span>
                                              )}
                                          </>
                                        ) : (
                                          <>
                                            <span className="block break-words text-muted-foreground">
                                              {record.location.latitude?.toFixed(
                                                4,
                                              )}
                                              ,{" "}
                                              {record.location.longitude?.toFixed(
                                                4,
                                              )}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5 block italic">
                                              Address not available
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {record.status === "Pending" ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="bg-[#efaa1f] hover:bg-[#d97706] h-7 text-xs"
                                          onClick={() =>
                                            handleQuickApprove(
                                              record,
                                              "Present",
                                            )
                                          }
                                          title="Mark as Present"
                                        >
                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                          Present
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs"
                                          onClick={() => {
                                            setSelectedAttendance(record);
                                            setApprovalStatus("Present");
                                            setRemarks("");
                                            setPunchInTime(
                                              record.punchIn
                                                ? parseISO(record.punchIn)
                                                : undefined,
                                            );
                                            setPunchOutTime(
                                              record.punchOut
                                                ? parseISO(record.punchOut)
                                                : undefined,
                                            );
                                          }}
                                          title="More Options"
                                        >
                                          <AlertCircle className="w-3 h-3 mr-1" />
                                          Options
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                          setSelectedAttendance(record);
                                          setApprovalStatus(
                                            record.status || "Not Marked",
                                          );
                                          setRemarks(record.remarks || "");
                                          setPunchInTime(
                                            record.punchIn
                                              ? parseISO(record.punchIn)
                                              : undefined,
                                          );
                                          setPunchOutTime(
                                            record.punchOut
                                              ? parseISO(record.punchOut)
                                              : undefined,
                                          );
                                        }}
                                        title="Update Attendance"
                                      >
                                        {record._id ? "Edit" : "Add"}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {pagination && (
                      <div className="mt-4 pt-4 border-t">
                        <Pagination
                          page={currentPage}
                          pageSize={pageSize}
                          total={pagination.total}
                          pages={pagination.pages}
                          onPageChange={(newPage) => {
                            setCurrentPage(newPage);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setCurrentPage(1);
                          }}
                          showPageSizeSelector={true}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit/Approve Dialog */}
        <Dialog
          open={!!selectedAttendance}
          onOpenChange={() => {
            setSelectedAttendance(null);
            setRemarks("");
            setApprovalStatus("Present");
            setPunchInTime(undefined);
            setPunchOutTime(undefined);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedAttendance?._id ? "Edit Attendance" : "Add Attendance"}
              </DialogTitle>
            </DialogHeader>

            {selectedAttendance && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-3">
                      {(selectedAttendance.employeeId as any)?.avatar ? (
                        <img
                          src={(selectedAttendance.employeeId as any).avatar}
                          alt={(selectedAttendance.employeeId as any)?.name || "Employee"}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {((selectedAttendance.employeeId as any)?.name || "E").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {(selectedAttendance.employeeId as any)?.name || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(selectedAttendance.employeeId as any)?.employeeId ||
                            "N/A"}
                        </div>
                      </div>
                    </div>
                    {/* {(selectedAttendance.employeeId as any)?.joiningDate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Joining Date: {format(parseISO((selectedAttendance.employeeId as any).joiningDate), "MMM dd, yyyy")}
                      </div>
                    )} */}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="p-2 border rounded-md bg-muted/50">
                    {selectedDate
                      ? format(selectedDate, "EEEE, MMMM d, yyyy")
                      : "N/A"}
                  </div>
                </div>

                {/* Late / Early / Fine summary (shown when record has punch times) */}
                {selectedAttendance.punchIn && (
                  <div className="p-3 border rounded-md bg-muted/40 border-border">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      Late / Early / Fine
                    </div>
                    <div className="text-sm space-y-1">
                      {selectedAttendance.lateMinutes > 0 ? (
                        <div className="text-red-600">
                          Late (login): {Math.floor(selectedAttendance.lateMinutes / 60)}h {selectedAttendance.lateMinutes % 60}m
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Late: —</div>
                      )}
                      {selectedAttendance.earlyMinutes > 0 ? (
                        <div className="text-amber-600">
                          Early (logout): {Math.floor(selectedAttendance.earlyMinutes / 60)}h {selectedAttendance.earlyMinutes % 60}m
                        </div>
                      ) : (
                        <div className="text-muted-foreground">Early: —</div>
                      )}
                      {selectedAttendance.fineAmount != null && selectedAttendance.fineAmount > 0 ? (
                        <div className="font-medium text-red-600 mt-1">
                          Fine: {formatINR(selectedAttendance.fineAmount)}
                        </div>
                      ) : selectedAttendance.punchOut ? (
                        <div className="text-muted-foreground mt-1">Fine: No fine</div>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on shift timing. Updating punch in/out will recalculate (e.g. 10–7 = no fine; late login or early logout = fine).
                    </p>
                  </div>
                )}

                {/* Editable Punch In Time */}
                <div className="space-y-2">
                  <Label htmlFor="punchIn">Punch In Time</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {punchInTime
                            ? formatTime(punchInTime.toISOString())
                            : selectedAttendance.punchIn
                              ? formatTime(selectedAttendance.punchIn)
                              : "Not set"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 z-[140]"
                        align="start"
                      >
                        <ClockTimePicker
                          date={
                            punchInTime ||
                            (selectedAttendance.punchIn
                              ? parseISO(selectedAttendance.punchIn)
                              : selectedDate)
                          }
                          setDate={(date) => {
                            if (date) {
                              // Combine selected date with punch in time
                              const newDate = new Date(selectedDate);
                              newDate.setHours(date.getHours());
                              newDate.setMinutes(date.getMinutes());
                              newDate.setSeconds(date.getSeconds());
                              setPunchInTime(newDate);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {selectedAttendance.punchIn && !punchInTime && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPunchInTime(parseISO(selectedAttendance.punchIn))
                        }
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Editable Punch Out Time */}
                <div className="space-y-2">
                  <Label htmlFor="punchOut">Punch Out Time</Label>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {punchOutTime
                            ? formatTime(punchOutTime.toISOString())
                            : selectedAttendance.punchOut
                              ? formatTime(selectedAttendance.punchOut)
                              : "Not set"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 z-[140]"
                        align="start"
                      >
                        <ClockTimePicker
                          date={
                            punchOutTime ||
                            (selectedAttendance.punchOut
                              ? parseISO(selectedAttendance.punchOut)
                              : selectedDate)
                          }
                          setDate={(date) => {
                            if (date) {
                              // Combine selected date with punch out time
                              const newDate = new Date(selectedDate);
                              newDate.setHours(date.getHours());
                              newDate.setMinutes(date.getMinutes());
                              newDate.setSeconds(date.getSeconds());
                              setPunchOutTime(newDate);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {selectedAttendance.punchOut && !punchOutTime && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPunchOutTime(parseISO(selectedAttendance.punchOut))
                        }
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={approvalStatus}
                    onValueChange={setApprovalStatus}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="z-[150]">
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                      <SelectItem value="Half Day">Half Day</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Not Marked">Not Marked</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Add any remarks or notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAttendance(null);
                  setRemarks("");
                  setApprovalStatus("Present");
                  setPunchInTime(undefined);
                  setPunchOutTime(undefined);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                className="bg-[#efaa1f] hover:bg-[#d97706]"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Selfie View Dialog */}
        <Dialog
          open={!!selectedAttendance?.viewSelfie}
          onOpenChange={() => {
            if (selectedAttendance) {
              setSelectedAttendance({ ...selectedAttendance, viewSelfie: undefined });
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {selectedAttendance?.viewSelfie === 'punchIn' ? 'Punch In Selfie' : 'Punch Out Selfie'}
              </DialogTitle>
            </DialogHeader>
            {selectedAttendance && (
              <div className="space-y-4">
                {selectedAttendance.viewSelfie === 'punchIn' && selectedAttendance.punchInSelfie && (
                  <div className="space-y-3">
                    <div className="relative w-full">
                      <img
                        src={selectedAttendance.punchInSelfie}
                        alt="Punch In Selfie"
                        className="w-full h-auto rounded-lg border object-contain max-h-[70vh]"
                      />
                    </div>
                    {selectedAttendance.punchInFaceMatch !== undefined && selectedAttendance.punchInFaceMatch !== null && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">Face Match Percentage:</span>
                        <Badge
                          variant={
                            selectedAttendance.punchInFaceMatch >= 80
                              ? "default"
                              : selectedAttendance.punchInFaceMatch >= 60
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-lg font-bold px-4 py-2"
                        >
                          {Math.round(selectedAttendance.punchInFaceMatch)}%
                        </Badge>
                      </div>
                    )}
                    {(selectedAttendance.employeeId as any)?.avatar && (
                      <div className="space-y-2">
                        <Label>Profile Avatar for Comparison:</Label>
                        <img
                          src={(selectedAttendance.employeeId as any).avatar}
                          alt="Profile Avatar"
                          className="w-32 h-32 rounded-lg border object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
                {selectedAttendance.viewSelfie === 'punchOut' && selectedAttendance.punchOutSelfie && (
                  <div className="space-y-3">
                    <div className="relative w-full">
                      <img
                        src={selectedAttendance.punchOutSelfie}
                        alt="Punch Out Selfie"
                        className="w-full h-auto rounded-lg border object-contain max-h-[70vh]"
                      />
                    </div>
                    {selectedAttendance.punchOutFaceMatch !== undefined && selectedAttendance.punchOutFaceMatch !== null && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">Face Match Percentage:</span>
                        <Badge
                          variant={
                            selectedAttendance.punchOutFaceMatch >= 80
                              ? "default"
                              : selectedAttendance.punchOutFaceMatch >= 60
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-lg font-bold px-4 py-2"
                        >
                          {Math.round(selectedAttendance.punchOutFaceMatch)}%
                        </Badge>
                      </div>
                    )}
                    {(selectedAttendance.employeeId as any)?.avatar && (
                      <div className="space-y-2">
                        <Label>Profile Avatar for Comparison:</Label>
                        <img
                          src={(selectedAttendance.employeeId as any).avatar}
                          alt="Profile Avatar"
                          className="w-32 h-32 rounded-lg border object-cover"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
};

export default AdminAttendance;
